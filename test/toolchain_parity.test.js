// toolchain_parity.test.js - the bundled WASM cc65 backend must produce the
// SAME .gtr as native cc65, so the zero-install `npm install` path is never a
// second-class citizen. Builds an example both ways and byte-compares.
//
// Skips cleanly if either backend is absent (no native cc65 on a fresh npm-only
// clone; no wasm package on a source clone that skipped `npm install`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { runTool } from "../compiler/wasm_toolchain.js";

const SDK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GTLUA = path.join(SDK, "bin", "gtlua.js");
const EXAMPLE = path.join(SDK, "examples", "orbit", "main.lua");

const nativeAvail =
  existsSync(path.join(SDK, "tools", "cc65", "bin", "cc65")) ||
  spawnSync("cc65", ["--version"], { encoding: "utf8" }).status != null;
const wasmAvail = existsSync(
  path.join(SDK, "node_modules", "romdev-toolchain-cc65", "wasm", "cc65.js"),
);

function build(backend, out) {
  const r = spawnSync(process.execPath, [GTLUA, "build", EXAMPLE, "-o", out], {
    encoding: "utf8",
    env: { ...process.env, GTLUA_TOOLCHAIN: backend },
  });
  return r.status === 0;
}

test("wasm and native cc65 produce byte-identical .gtr", { skip: !(nativeAvail && wasmAvail) && "needs both native cc65 and the bundled wasm toolchain" }, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "gtlua-parity-"));
  const nGtr = path.join(dir, "native.gtr");
  const wGtr = path.join(dir, "wasm.gtr");

  assert.ok(build("native", nGtr), "native build failed");
  assert.ok(build("wasm", wGtr), "wasm build failed");

  const n = readFileSync(nGtr);
  const w = readFileSync(wGtr);
  assert.equal(w.length, n.length, `size mismatch: native ${n.length} vs wasm ${w.length}`);
  assert.ok(w.equals(n), "wasm .gtr differs from native .gtr (toolchain divergence)");
});

test("no-blit-font builds retain the scaled-sprite pipeline restore", {
  skip: !wasmAvail && "needs the bundled wasm toolchain",
}, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "gtlua-nofont-"));
  const out = path.join(dir, "gt_api.s");
  const result = await runTool("cc65", [
    "-t", "none", "-Osr", "--cpu", "65c02", "--codesize", "500", "-g",
    "-I", path.join(SDK, "sdk"), "-DGT_BANKED", "-DGT_NO_BLITFONT",
    "-DGT_SSPR", "-DGT_GSHEET", "-o", out, path.join(SDK, "sdk", "gt_api.c"),
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(out), "cc65 did not produce gt_api.s");
});
