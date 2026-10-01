import assert from "node:assert/strict";
import test from "node:test";
import { buildApi, validateApi } from "../tools/generate-api.mjs";
import { formatEntry, loadApi, search, wrap } from "../bin/gtapi.js";
import fs from "node:fs";
import path from "node:path";

test("generated API covers every compiler-exposed entry", async () => {
  const api = await buildApi();
  assert.equal(api.counts.entries, 128);
  assert.doesNotThrow(() => validateApi(api, new Set(api.entries.map(entry => entry.name))));
  assert.ok(api.entries.some(entry => entry.name === "spr"));
  assert.ok(api.entries.some(entry => entry.name === "gt.bg_draw"));
});

test("installed API metadata is current", () => {
  assert.equal(loadApi().counts.entries, 128);
});

test("search supports exact names and plain-language keywords", () => {
  const api = loadApi();
  assert.equal(search(api.entries, "spr")[0].entry.name, "spr");
  assert.ok(search(api.entries, "controller button").some(result => result.entry.name === "btn"));
  assert.ok(search(api.entries, "gametank background").some(result => result.entry.name === "gt.bg_draw"));
});

test("details and wrapping fit a narrow PicoCalc terminal", () => {
  const entry = loadApi().entries.find(item => item.name === "spr");
  const text = formatEntry(entry, 40);
  assert.match(text, /spr\(sprite, x, y/);
  assert.ok(wrap(entry.summary, 40).split("\n").every(line => line.length <= 40));
});

test("PicoCalc installer installs the browser from the SDK", () => {
  const installer = fs.readFileSync(path.resolve("scripts/install_picocalc_dev.sh"), "utf8");
  assert.match(installer, /install -m 0755 .*bin\/gtapi\.js.*bin_dir\/gtapi/);
  assert.match(installer, /ln -sfn gtapi "\$help_target"/);
});
