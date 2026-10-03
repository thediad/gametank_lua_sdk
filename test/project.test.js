import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProject, findProject, loadProject, projectInfo, setProjectAsset, unsetProjectAsset, validateProjectFiles } from "../compiler/project.js";

function temporaryProject(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gtlua-project-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("createProject writes a discoverable, self-contained starter", t => {
  const root = temporaryProject(t);
  const project = createProject(path.join(root, "demo"), "demo");
  assert.equal(project.name, "demo");
  assert.equal(findProject(path.join(project.root, "nested")), project.manifest);
  assert.match(fs.readFileSync(project.entry, "utf8"), /function _update\(\)/);
  assert.doesNotThrow(() => validateProjectFiles(project));
});

test("loadProject resolves declared assets relative to the manifest", t => {
  const root = temporaryProject(t);
  fs.writeFileSync(path.join(root, "main.lua"), "function _draw() end\n");
  fs.writeFileSync(path.join(root, "gfx.gtg"), "");
  fs.writeFileSync(path.join(root, "gtlua.json"), JSON.stringify({
    version: 1,
    name: "assets",
    source: "main.lua",
    output: "build/assets.gtr",
    assets: { sheet: "gfx.gtg", songs: [] },
    build: { num8: true },
  }));
  const project = validateProjectFiles(loadProject(path.join(root, "gtlua.json")));
  assert.equal(project.sheetPath, path.join(root, "gfx.gtg"));
  assert.equal(project.outPath, path.join(root, "build", "assets.gtr"));
  assert.equal(project.num8, true);
  assert.deepEqual(projectInfo(project), {
    name: "assets",
    root,
    manifest: "gtlua.json",
    source: "main.lua",
    output: "build/assets.gtr",
    numberFormat: "8.8",
    assets: { sheet: "gfx.gtg", sheetext: null, flags: null, map: null, frames: null, songs: [] },
  });
});

test("project paths cannot escape the project directory", t => {
  const root = temporaryProject(t);
  fs.writeFileSync(path.join(root, "gtlua.json"), JSON.stringify({ version: 1, source: "../main.lua" }));
  assert.throws(() => loadProject(path.join(root, "gtlua.json")), /must stay inside/);
});

test("validation identifies missing declared assets", t => {
  const root = temporaryProject(t);
  fs.writeFileSync(path.join(root, "main.lua"), "function _draw() end\n");
  fs.writeFileSync(path.join(root, "gtlua.json"), JSON.stringify({ version: 1, assets: { map: "level.map" } }));
  assert.throws(() => validateProjectFiles(loadProject(path.join(root, "gtlua.json"))), /assets\.map \(level\.map\)/);
});

test("PicoCalc shortcuts use the shared project workflow", () => {
  const installer = fs.readFileSync(path.resolve("scripts/install_picocalc_dev.sh"), "utf8");
  const launcher = fs.readFileSync(path.resolve("scripts/picocalc/gtdev"), "utf8");
  assert.match(installer, /gtstudio gtnew gtedit gtcheck gtbuild/);
  assert.match(launcher, /node "\$SDK\/bin\/gtlua\.js" init "\$project"/);
  assert.match(launcher, /node "\$SDK\/bin\/gtlua\.js" check/);
  assert.match(launcher, /\[ -f "\$project\/gtlua\.json" \]/);
  assert.match(launcher, /GameTank Lua Studio/);
  assert.match(launcher, /4  Build and run/);
  assert.match(launcher, /7  Project and assets/);
  assert.match(launcher, /8  Register assets/);
  assert.match(launcher, /9  Preview registered sprite sheet/);
  assert.match(launcher, /asset preview/);
  const nanorc = fs.readFileSync(path.resolve("scripts/picocalc/nanorc"), "utf8");
  assert.match(nanorc, /set wordchars "_\."/);
  assert.match(nanorc, /bind F5 .*gtedit-run/);
  assert.match(nanorc, /bind F6 .*\{nextword\}\{mark\}\{prevword\}.*gtedit-help/);
  assert.match(nanorc, /bind F7 .*gtedit-check.*\{exit\}/);
  assert.match(installer, /build-context-help\.mjs/);
  const help = fs.readFileSync(path.resolve("scripts/picocalc/gtedit-help"), "utf8");
  const check = fs.readFileSync(path.resolve("scripts/picocalc/gtedit-check"), "utf8");
  assert.match(help, /read -rsn1 -t 0\.2/);
  assert.match(check, /read -rsn1 -t 0\.2/);
  assert.match(check, /error:.*\\1,\\2/);
  assert.match(launcher, /GTEDIT_REOPEN="\$reopen"/);
  assert.match(launcher, /args\+=\("\+\$location"\)/);
  const run = fs.readFileSync(path.resolve("scripts/picocalc/gtedit-run"), "utf8");
  assert.match(run, /exec <\/dev\/tty >\/dev\/tty 2>&1/);
  assert.match(run, /"\$RUNNER" "\$PROJECT"/);
});

test("gtlua check discovers a parent project without invoking the toolchain", t => {
  const root = temporaryProject(t);
  const project = createProject(path.join(root, "demo"), "demo");
  const nested = path.join(project.root, "src");
  fs.mkdirSync(nested);
  const output = execFileSync(process.execPath, [path.resolve("bin/gtlua.js"), "check"], {
    cwd: nested,
    encoding: "utf8",
  });
  assert.match(output, /^OK: .*main\.lua/m);
  assert.equal(fs.existsSync(project.outPath), false);
});

test("gtlua project prints human and JSON project summaries", t => {
  const root = temporaryProject(t);
  const project = createProject(path.join(root, "demo"), "demo");
  const cli = path.resolve("bin/gtlua.js");
  const human = execFileSync(process.execPath, [cli, "project"], { cwd: project.root, encoding: "utf8" });
  assert.match(human, /GameTank Lua project: demo/);
  assert.match(human, /sheet:\s+-/);
  const json = JSON.parse(execFileSync(process.execPath, [cli, "project", "--json"], { cwd: project.root, encoding: "utf8" }));
  assert.equal(json.source, "main.lua");
  assert.equal(json.assets.map, null);
});

test("context-help cache includes unambiguous Nano word aliases", t => {
  const root = temporaryProject(t);
  const cache = path.join(root, "cache");
  execFileSync(process.execPath, [path.resolve("tools/build-context-help.mjs"), cache]);
  assert.match(fs.readFileSync(path.join(cache, "draw.txt"), "utf8"), /^_draw\(\)/);
  assert.match(fs.readFileSync(path.join(cache, "bg_draw.txt"), "utf8"), /^gt\.bg_draw/);
  assert.equal(fs.readFileSync(path.join(cache, ".entry-count"), "utf8"), "128\n");
});

test("asset registration updates the manifest atomically without moving files", t => {
  const root = temporaryProject(t);
  let project = createProject(path.join(root, "demo"), "demo");
  const sheet = path.join(project.root, "gfx.gtg");
  fs.writeFileSync(sheet, "sheet");
  project = setProjectAsset(project, "sheet", sheet);
  assert.equal(projectInfo(project).assets.sheet, "gfx.gtg");
  assert.equal(fs.readFileSync(sheet, "utf8"), "sheet");
  project = unsetProjectAsset(project, "sheet");
  assert.equal(projectInfo(project).assets.sheet, null);
  assert.equal(fs.readFileSync(sheet, "utf8"), "sheet");
});

test("asset registration rejects missing and outside-project files", t => {
  const root = temporaryProject(t);
  const project = createProject(path.join(root, "demo"), "demo");
  const outside = path.join(root, "outside.gtg");
  fs.writeFileSync(outside, "outside");
  assert.throws(() => setProjectAsset(project, "sheet", "missing.gtg"), /does not exist/);
  assert.throws(() => setProjectAsset(project, "sheet", outside), /must stay inside/);
  assert.throws(() => setProjectAsset(project, "sheet", project.entry), /must use the \.gtg extension/);
});

test("asset import converts and registers art without implicit overwrite", t => {
  const root = temporaryProject(t);
  const project = createProject(path.join(root, "demo"), "demo");
  const source = path.join(project.root, "source.gtg");
  fs.writeFileSync(source, Buffer.alloc(128 * 128, 7));
  const cli = path.resolve("bin/gtlua.js");
  execFileSync(process.execPath, [cli, "asset", "import", "source.gtg"], { cwd: project.root });
  assert.equal(projectInfo(loadProject(project.manifest)).assets.sheet, "gfx.gtg");
  assert.equal(fs.statSync(path.join(project.root, "gfx.gtg")).size, 128 * 128);
  assert.throws(() => execFileSync(process.execPath, [cli, "asset", "import", "source.gtg"], { cwd: project.root, stdio: "pipe" }), /Command failed/);
  assert.deepEqual(fs.readFileSync(path.join(project.root, "gfx.gtg")), Buffer.alloc(128 * 128, 7));
});

test("asset create writes correctly sized blank files and refuses overwrite", t => {
  const root = temporaryProject(t);
  const project = createProject(path.join(root, "demo"), "demo");
  const cli = path.resolve("bin/gtlua.js");
  execFileSync(process.execPath, [cli, "asset", "create", "flags"], { cwd: project.root });
  assert.equal(fs.statSync(path.join(project.root, "gfx.gff")).size, 256);
  assert.equal(projectInfo(loadProject(project.manifest)).assets.flags, "gfx.gff");
  assert.throws(() => execFileSync(process.execPath, [cli, "asset", "create", "flags"], { cwd: project.root, stdio: "pipe" }), /Command failed/);
  assert.equal(fs.statSync(path.join(project.root, "gfx.gff")).size, 256);
});
