import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProject, findProject, loadProject, validateProjectFiles } from "../compiler/project.js";

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
  const nanorc = fs.readFileSync(path.resolve("scripts/picocalc/nanorc"), "utf8");
  assert.match(nanorc, /set wordchars "_\."/);
  assert.match(nanorc, /bind F6 .*\{nextword\}\{mark\}\{prevword\}.*gtedit-help/);
  assert.match(nanorc, /bind F7 .*gtedit-check/);
  assert.match(installer, /build-context-help\.mjs/);
  const help = fs.readFileSync(path.resolve("scripts/picocalc/gtedit-help"), "utf8");
  const check = fs.readFileSync(path.resolve("scripts/picocalc/gtedit-check"), "utf8");
  assert.match(help, /read -rsn1 -t 0\.2/);
  assert.match(check, /read -rsn1 -t 0\.2/);
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

test("context-help cache includes unambiguous Nano word aliases", t => {
  const root = temporaryProject(t);
  const cache = path.join(root, "cache");
  execFileSync(process.execPath, [path.resolve("tools/build-context-help.mjs"), cache]);
  assert.match(fs.readFileSync(path.join(cache, "draw.txt"), "utf8"), /^_draw\(\)/);
  assert.match(fs.readFileSync(path.join(cache, "bg_draw.txt"), "utf8"), /^gt\.bg_draw/);
  assert.equal(fs.readFileSync(path.join(cache, ".entry-count"), "utf8"), "128\n");
});
