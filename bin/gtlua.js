#!/usr/bin/env node
// gtlua CLI - compile a .lua game to a GameTank .gtr cartridge.
//
//   gtlua build <main.lua> [--sheet sheet.gtg] [-o game.gtr]
//   gtlua c <main.lua>                     print the generated C (debugging)
//
// This is a thin NODE adapter over the environment-agnostic build pipeline in
// compiler/build.js: it resolves the cc65 toolchain (native binaries or the
// bundled WASM worker) and builds a `env` object of node fs/path/crypto +
// tool-runner primitives, then calls the shared build().
//
// Toolchain resolution (first hit wins):
//   $GTLUA_CC65_HOME/bin, <sdk repo>/tools/cc65/bin, then PATH.
// Build cc65 into tools/ with: scripts/install_tools.sh

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compile, formatDiagnostics } from "../compiler/index.js";
import { build } from "../compiler/build.js";
import { PROJECT_FILE, createProject, loadProject, projectInfo, resolveProject, validateProjectFiles } from "../compiler/project.js";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SDK = path.join(REPO, "sdk");

// Locate the romdev-toolchain-cc65 package dir via Node module resolution, so it
// works whether npm nested it under this SDK or HOISTED it to the consumer's
// top-level node_modules (the flattened-install case a REPO-relative path
// misses). Falls back to the REPO-local path for a source checkout.
function cc65PackageDir() {
  try {
    // The package's exports map exposes "./wasm/*" but NOT "./package.json", so
    // resolve a known exported file and walk up to the package root (…/wasm/x).
    const wasmGlue = fileURLToPath(import.meta.resolve("romdev-toolchain-cc65/wasm/cc65.js"));
    return path.dirname(path.dirname(wasmGlue));   // …/romdev-toolchain-cc65
  } catch {
    return path.join(REPO, "node_modules", "romdev-toolchain-cc65");
  }
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// The toolchain object gives each tool as an argv PREFIX (array) so execTool
// can splat it: native cc65 is ["/path/cc65"], the WASM backend is
// for wasm, run()/runLink() route the tool through the persistent worker via
// execTool -> runToolSync (no per-tool process spawn). Everything stays sync.
function nativeToolchain(home) {
  return {
    kind: "native",
    cc65: [path.join(home, "bin", "cc65")],
    ca65: [path.join(home, "bin", "ca65")],
    ld65: [path.join(home, "bin", "ld65")],
    lib: path.join(home, "lib", "none.lib"),
    asminc: path.join(home, "asminc"),
  };
}

// The bundled-WASM backend (romdev-toolchain-cc65). Zero native install. Tools
// run in ONE persistent worker thread that holds the WASM for the whole build
// (compiler/wasm_worker.js), driven synchronously via Atomics so the build
// orchestrator stays sync. `kind:"wasm"` makes execTool dispatch to
// runToolSync instead of spawning a process per tool (12x faster - the old
// per-tool `node` spawn + full share-tree re-mount was ~85 ms of pure overhead
// each). lib/asminc still resolve out of the installed package's share tree for
// callers that read tc.lib / tc.asminc directly.
function wasmToolchain() {
  const share = path.join(cc65PackageDir(), "share", "cc65");
  return {
    kind: "wasm",
    cc65: ["cc65"], ca65: ["ca65"], ld65: ["ld65"],   // tool name; execTool routes by kind
    lib: path.join(share, "lib", "none.lib"),
    asminc: path.join(share, "asminc"),
  };
}

function wasmToolchainInstalled() {
  return existsSync(path.join(cc65PackageDir(), "wasm", "cc65.js"));
}

// Selection order (first hit wins), with explicit override via GTLUA_TOOLCHAIN:
//   GTLUA_TOOLCHAIN=native|wasm  -> force that backend
//   otherwise: native if GTLUA_CC65_HOME / tools/cc65 / PATH cc65 is present,
//   else the bundled WASM if installed. So a `npm install` clone "just builds"
//   with zero native tools, and a source clone with cc65 on PATH uses native.
function findToolchain() {
  const forced = process.env.GTLUA_TOOLCHAIN;
  if (forced === "wasm") {
    if (!wasmToolchainInstalled()) fail("GTLUA_TOOLCHAIN=wasm but romdev-toolchain-cc65 is not installed (run: npm install).");
    return wasmToolchain();
  }

  const findNative = () => {
    const candidates = [];
    if (process.env.GTLUA_CC65_HOME) candidates.push(process.env.GTLUA_CC65_HOME);
    candidates.push(path.join(REPO, "tools", "cc65"));
    for (const home of candidates) {
      if (existsSync(path.join(home, "bin", "cc65"))) return nativeToolchain(home);
    }
    // fall back to PATH (cc65 --print-target-path locates lib/asminc)
    const probe = spawnSync("cc65", ["--version"], { encoding: "utf8" });
    if (probe.status === 0 || probe.status === 1) {
      const tp = spawnSync("cc65", ["--print-target-path"], { encoding: "utf8" });
      const targetPath = (tp.stdout || "").trim();
      const share = targetPath ? path.dirname(targetPath) : null;
      return {
        kind: "native",
        cc65: ["cc65"], ca65: ["ca65"], ld65: ["ld65"],
        lib: share ? path.join(share, "lib", "none.lib") : "none.lib",
        asminc: share ? path.join(share, "asminc") : null,
      };
    }
    return null;
  };

  if (forced === "native") {
    const n = findNative();
    if (n) return n;
    fail("GTLUA_TOOLCHAIN=native but no cc65 found (scripts/install_tools.sh, or put cc65 on PATH).");
  }

  const native = findNative();
  if (native) return native;
  if (wasmToolchainInstalled()) return wasmToolchain();

  fail(
    "No cc65 toolchain found. Either:\n" +
    "  - run `npm install` (uses the bundled cc65 WASM, no native tools needed), or\n" +
    "  - run scripts/install_tools.sh (builds native cc65 into tools/cc65), or\n" +
    "  - put cc65/ca65/ld65 on your PATH."
  );
}

// The active toolchain kind ("native" | "wasm"), set by prepareToolchain() from
// findToolchain().kind. Decides whether execTool spawns a native binary or
// drives the persistent WASM worker synchronously.
let toolchainKind = "native";
let _runToolSync = null;   // lazily imported so native builds never load the worker

// Execute one tool. For native, `tool` is [binaryPath]; for wasm, tool[0] is the
// tool NAME ("cc65"/"ca65"/"ld65") and we route to the persistent worker. Both
// return spawnSync's shape: { status, stdout, stderr }.
function execTool(tool, args) {
  if (toolchainKind === "wasm") {
    // _runToolSync is preloaded by prepareToolchain() before the build starts
    // (the module is ESM, so it's imported at the async top level, not here).
    return _runToolSync(tool[0], args);
  }
  const [cmd, ...pre] = tool;
  return spawnSync(cmd, [...pre, ...args], { encoding: "utf8" });
}

// Called once (async) before a build. If the selected toolchain is WASM, load
// the sync client + set the kind so execTool routes to the persistent worker.
async function prepareToolchain() {
  const tc = findToolchain();
  toolchainKind = tc.kind;
  if (tc.kind === "wasm" && !_runToolSync) {
    const mod = await import("../compiler/wasm_sync_client.js");
    _runToolSync = mod.runToolSync;
    _closeWorker = mod.closeWorker;
  }
  return tc;
}
let _closeWorker = null;

// Build the environment-agnostic `env` object the shared build() runs against,
// from node's fs/path/crypto and the resolved toolchain. runTool(name, args)
// maps a tool NAME to that toolchain's argv-prefix and drives execTool.
function makeNodeEnv(tc, sdkDir) {
  return {
    readFile: (p) => readFileSync(p),
    readText: (p) => readFileSync(p, "utf8"),
    writeFile: (p, x) => writeFileSync(p, x),
    exists: (p) => existsSync(p),
    size: (p) => statSync(p).size,
    mkdirp: (p) => { mkdirSync(p, { recursive: true }); },
    join: (...parts) => path.join(...parts),
    dirname: (p) => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: (p) => path.extname(p),
    sdk: sdkDir,
    sdkFile: (name) => path.join(sdkDir, name),
    runTool: (name, args) => execTool(tc[name], args),
    lib: tc.lib,
    asminc: tc.asminc,
    hash: (bytes) => createHash("sha1").update(bytes).digest("hex"),
    log: (msg) => console.log(msg),
    warn: (msg) => console.error(msg),
    debug: !!process.env.GTLUA_DEBUG,
  };
}

// Read a .lua file and compile it to C for the `c` debug command. Mirrors the
// build pipeline's diagnostics handling (warnings to stderr, errors exit 1).
function compileLuaCli(entry, opts = {}) {
  const source = readFileSync(entry, "utf8");
  const result = compile(source, path.basename(entry), opts);
  const warnings = result.diagnostics.filter((d) => d.severity === "warning");
  if (warnings.length) console.error(formatDiagnostics(warnings));
  if (!result.ok) {
    console.error(formatDiagnostics(result.diagnostics.filter((d) => d.severity === "error")));
    process.exit(1);
  }
  return result;
}

// Resolve the toolchain, build the node env, and run the shared build().
// The entry path is resolved to an absolute path first so build() derives an
// absolute project/build dir (the toolchain runs from the repo root).
async function runBuild(entry, opts) {
  if (!existsSync(entry)) fail(`no such file: ${entry}`);
  const tc = await prepareToolchain();
  const env = makeNodeEnv(tc, SDK);
  const absEntry = path.resolve(entry);
  try {
    await build(absEntry, opts, env);
  } catch (e) {
    fail(e?.message ?? String(e));
  }
}

const BUILD_VALUE_FLAGS = new Map([
  ["-o", "outPath"], ["--sheet", "sheetPath"], ["--frames", "framesPath"],
  ["--songs", "songsPaths"], ["--sheetext", "sheetExtPath"],
  ["--gff", "gffPath"], ["--map", "mapPath"],
]);

function parseBuildArgs(args) {
  const options = {};
  const positional = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--num8") {
      options.num8 = true;
      continue;
    }
    const field = BUILD_VALUE_FLAGS.get(arg);
    if (field) {
      const value = args[++index];
      if (!value || value.startsWith("--")) fail(`${arg} requires a value`);
      options[field] = field === "songsPaths" ? value.split(",").filter(Boolean) : value;
      continue;
    }
    if (arg.startsWith("-")) fail(`unknown build option: ${arg}`);
    positional.push(arg);
  }
  if (positional.length > 1) fail(`unexpected argument: ${positional[1]}`);
  return { target: positional[0], options };
}

function projectForTarget(target) {
  try {
    if (!target) return validateProjectFiles(resolveProject());
    const absolute = path.resolve(target);
    if (existsSync(absolute) && statSync(absolute).isDirectory()) return validateProjectFiles(resolveProject(absolute));
    if (path.basename(absolute) === PROJECT_FILE) return validateProjectFiles(loadProject(absolute));
    return null;
  } catch (error) {
    fail(error?.message ?? String(error));
  }
}

function resolveBuildRequest(args) {
  const parsed = parseBuildArgs(args);
  const project = projectForTarget(parsed.target);
  if (!project) {
    if (!parsed.target) fail(`no source given and no ${PROJECT_FILE} found`);
    return { entry: parsed.target, options: parsed.options, project: null };
  }
  return {
    entry: project.entry,
    project,
    options: {
      outPath: project.outPath,
      sheetPath: project.sheetPath,
      framesPath: project.framesPath,
      songsPaths: project.songsPaths,
      sheetExtPath: project.sheetExtPath,
      gffPath: project.gffPath,
      mapPath: project.mapPath,
      num8: project.num8,
      ...parsed.options,
    },
  };
}

function checkSource(entry, options = {}) {
  if (!existsSync(entry)) fail(`no such file: ${entry}`);
  compileLuaCli(path.resolve(entry), { num8: !!options.num8 });
  console.log(`OK: ${path.resolve(entry)}`);
}

function printProject(project, json = false) {
  const info = projectInfo(project);
  if (json) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }
  const value = item => item ?? "-";
  console.log(`GameTank Lua project: ${info.name}`);
  console.log(`root:    ${info.root}`);
  console.log(`source:  ${info.source}`);
  console.log(`ROM:     ${info.output}`);
  console.log(`numbers: ${info.numberFormat}`);
  console.log("assets:");
  console.log(`  sheet:    ${value(info.assets.sheet)}`);
  console.log(`  sheetext: ${value(info.assets.sheetext)}`);
  console.log(`  flags:    ${value(info.assets.flags)}`);
  console.log(`  map:      ${value(info.assets.map)}`);
  console.log(`  frames:   ${value(info.assets.frames)}`);
  console.log(`  songs:    ${info.assets.songs.length ? info.assets.songs.join(", ") : "-"}`);
}

// ---- main -------------------------------------------------------------------

const [, , cmd, ...rest] = process.argv;
if (cmd === "build") {
  const request = resolveBuildRequest(rest);
  await runBuild(request.entry, request.options);
  if (_closeWorker) _closeWorker();
} else if (cmd === "run") {
  // build then play in a window (bundled core), no external emulator needed.
  const directRom = rest.length === 1 && rest[0].endsWith(".gtr") ? rest[0] : null;
  const request = directRom ? null : resolveBuildRequest(rest);
  const entry = directRom ?? request.entry;
  // if given a prebuilt .gtr, run it directly; else build to a temp .gtr first.
  let gtr;
  if (entry.endsWith(".gtr")) {
    gtr = entry;
  } else {
    gtr = request.options.outPath ?? path.join(path.dirname(path.resolve(entry)), path.basename(entry, path.extname(entry)) + ".gtr");
    await runBuild(entry, { ...request.options, outPath: gtr });
    if (_closeWorker) _closeWorker();
  }
  try {
    const { runRom } = await import("./gtlua-run.mjs");
    await runRom(gtr);
  } catch (e) {
    if (e && e.code === "SDL_UNAVAILABLE") {
      // graceful fallback: hand the built .gtr to an external emulator.
      const runner = path.join(REPO, "scripts", process.platform === "win32" ? "run_emulator.cmd" : "run_emulator.sh");
      const r = spawnSync(runner, [gtr], { stdio: "inherit" });
      if (r.status !== 0) {
        fail(
          "Could not open a window (the optional @kmamal/sdl dependency isn't\n" +
          "installed on this platform), and no external GameTank emulator was found.\n" +
          `Your cart built fine: ${gtr}\n` +
          "Run it with an emulator, or set GAMETANK_EMULATOR / put one on PATH."
        );
      }
    } else {
      fail(`gtlua run: ${e?.message ?? e}`);
    }
  }
} else if (cmd === "project") {
  const json = rest.includes("--json");
  const targets = rest.filter(arg => arg !== "--json");
  if (targets.length > 1) fail("usage: gtlua project [directory|gtlua.json] [--json]");
  const project = projectForTarget(targets[0]);
  if (!project) fail(`no ${PROJECT_FILE} found for ${targets[0]}`);
  printProject(project, json);
} else if (cmd === "check") {
  const parsed = parseBuildArgs(rest);
  const project = projectForTarget(parsed.target);
  if (project) checkSource(project.entry, { num8: project.num8, ...parsed.options });
  else if (parsed.target) checkSource(parsed.target, parsed.options);
  else fail(`no source given and no ${PROJECT_FILE} found`);
} else if (cmd === "init") {
  if (rest.length > 1) fail("usage: gtlua init [directory]");
  const directory = path.resolve(rest[0] ?? ".");
  const project = createProject(directory);
  console.log(`Created ${project.name} in ${project.root}`);
  console.log(`Next: cd ${path.relative(process.cwd(), project.root) || "."} && gtlua run`);
} else if (cmd === "c") {
  if (!rest[0]) fail("usage: gtlua c <main.lua>");
  process.stdout.write(compileLuaCli(rest[0]).c);
} else if (cmd === "gfx") {
  const { gfxCli } = await import("./gtlua-gfx.mjs");
  gfxCli(rest);
} else {
  fail("usage: gtlua init  [directory]                                      create a project\n" +
       "       gtlua project [directory] [--json]                            show project and assets\n" +
       "       gtlua check [main.lua|project-dir] [--num8]                   validate without building\n" +
       "       gtlua build [main.lua|project-dir] [--sheet ...] [-o ...]     build a project or source\n" +
       "       gtlua run   [main.lua|project-dir|game.gtr] [--sheet ...]     build + play\n" +
    "       gtlua gfx import <in.png|in.p8|in.gtg> [-o out.gtg]\n" +
    "       gtlua gfx export <in.gtg> [-o out.png]\n" +
    `       gtlua c <main.lua>\n\nWith no source, check/build/run discover ${PROJECT_FILE} in the current or parent directory.`);
}
