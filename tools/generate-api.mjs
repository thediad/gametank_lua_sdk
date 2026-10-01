#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sha256 = data => createHash("sha256").update(data).digest("hex");

const categories = {
  graphics: new Set("cls camera clip color palt pset pget rect rectfill circ circfill line sset sget spr sprf sspr map mget mset fget fset".split(" ")),
  input: new Set(["btn", "btnp"]),
  audio: new Set("sfx sfx_bank music_bank music song song_stop note noteoff".split(" ")),
  math: new Set("flr ceil abs sgn min max mid sqrt sin cos atan2 rnd srand t time band bor bxor bnot shl shr lshr".split(" ")),
  data: new Set("array array8 pool count add del deli all hexdata ord chr sub tonum tostr type split cartdata dget dset".split(" ")),
  text: new Set(["print", "print_buf"]),
  lifecycle: new Set(["_init", "_update", "_update60", "_draw", "run", "reset"]),
};

const names = {
  cls: "color", camera: "x y", clip: "x y width height previous", color: "color",
  palt: "color transparent", pset: "x y color", pget: "x y", rect: "x0 y0 x1 y1 color",
  rectfill: "x0 y0 x1 y1 color", circ: "x y radius color", circfill: "x y radius color",
  line: "x0 y0 x1 y1 color", sset: "x y color", sget: "x y", spr: "sprite x y width height flip_x flip_y",
  sprf: "frame x y flip_x flip_y", sspr: "sx sy sw sh dx dy dw dh flip_x flip_y",
  map: "cell_x cell_y screen_x screen_y cell_w cell_h flag", mget: "cell_x cell_y", mset: "cell_x cell_y sprite",
  fget: "sprite flag", fset: "sprite flag value", btn: "button player", btnp: "button player",
  sfx: "effect channel", sfx_bank: "data", music_bank: "data", music: "track loop", song: "data loop",
  flr: "value", ceil: "value", abs: "value", sgn: "value", min: "a b", max: "a b", mid: "a b c",
  sqrt: "value", sin: "turns", cos: "turns", atan2: "dx dy", band: "a b", bor: "a b", bxor: "a b",
  bnot: "value", shl: "value bits", shr: "value bits", lshr: "value bits", rnd: "limit", srand: "seed",
  array: "capacity initial", array8: "capacity initial", pool: "capacity", cartdata: "id", dget: "index", dset: "index value",
  rgb: "red_or_byte green blue", mark: "value", border: "color", autocls: "color", note: "channel pitch instrument",
  noteoff: "channel", parallax_init: "count color1 color2 color3", parallax_move: "speed",
  drift_init: "count", drift_draw: "camera_x camera_y", drift_draw_range: "first count camera_x8 camera_y8",
  drift_draw_range_cpu: "first count camera_x8 camera_y8", drift_set: "index x y width height speed8 color",
  drift_mode: "mode value", chain_step_draw: "x y color", canvas_view: "x y width height", canvas_top: "page",
  phys_sprite: "sprite width height", phys_bounds: "left top right bottom bounce", dbar_style: "background fill highlight deficit",
  dbar: "x y value maximum color highlight background", parts_step: "entities", pool_move: "entities mode",
  pool_anim: "entities frame_field speed_field max_field reset", bg_tile: "sprite x y", bg_draw: "x y",
  gspr: "source_x source_y width height x y", track_dims: "size", track_view: "x y",
};

const summaries = {
  _init: "Define this callback to initialize the game once after startup.",
  _update: "Define this callback for game logic at the normal 30 Hz update rate.",
  _update60: "Define this callback instead of _update for 60 Hz game logic.",
  _draw: "Define this callback to draw one frame.",
  cls: "Clear the screen with an optional color.", spr: "Draw one or more 8x8 sprite-sheet cells.",
  sprf: "Draw a named frame from the project's frame table.", sspr: "Draw and optionally scale a rectangle from the sprite sheet.",
  btn: "Test whether a controller button is held.", btnp: "Test whether a controller button was just pressed, including repeat.",
  print: "Draw text and return the final horizontal position.", map: "Draw a rectangular region of the tile map.",
  array: "Create a fixed-capacity numeric array.", array8: "Create a compact fixed-capacity byte array.",
  pool: "Create a fixed-capacity entity pool.", add: "Add a value or entity to a supported collection.",
  del: "Remove a matching value or entity from a supported collection.", deli: "Remove an item by numeric index.",
  all: "Iterate over every live element in a pool.", hexdata: "Create a compile-time byte array from hexadecimal text.",
  cartdata: "Select the persistent save-data namespace.", dget: "Read a persistent numeric save slot.", dset: "Write a persistent numeric save slot.",
  run: "Restart the cartridge from power-on state.", reset: "Alias of run; restart the cartridge from power-on state.",
};

const categoryKeywords = {
  graphics: ["draw", "screen", "sprite", "pixel"], input: ["controller", "button", "keyboard"],
  audio: ["sound", "music"], math: ["number", "calculate"], data: ["array", "collection", "save"],
  text: ["font", "words"], lifecycle: ["callback", "game loop"], engines: ["background", "advanced", "drawing"],
  entities: ["pool", "collision", "physics", "advanced"], gametank: ["hardware", "advanced"],
};

function categoryFor(name, isGt) {
  for (const [category, set] of Object.entries(categories)) if (set.has(name)) return category;
  if (isGt && /^(parallax|drift|chain|canvas|tiles|chunks|track|bg_|gspr|gflush)/.test(name)) return "engines";
  if (isGt && /^(phys|pool_|hit_)/.test(name)) return "entities";
  if (isGt) return "gametank";
  return "data";
}

function commentFor(source, key) {
  const lines = source.split(/\r?\n/);
  const index = lines.findIndex(line => new RegExp(`^\\s{2}${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`).test(line));
  if (index < 0) return "";
  const comments = [];
  for (let i = index - 1; i >= 0; i--) {
    const match = lines[i].match(/^\s*\/\/\s?(.*)$/);
    if (!match) break;
    comments.unshift(match[1]);
  }
  return comments.join(" ").replace(/\s+/g, " ").trim();
}

function stripMarkdown(text) {
  return text.replace(/<[^>]+>/g, "").replace(/[*_`]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
}

function docsFor(markdown, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|") || !new RegExp(`\\b${escaped}\\s*\\(`).test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    const callCell = cells[0];
    const call = [...callCell.matchAll(/`([^`]+)`/g)].map(match => match[1]).find(value => new RegExp(`(?:^|/)\\s*${escaped}\\s*\\(`).test(value));
    const match = call?.match(new RegExp(`${escaped}\\s*\\(([^)]*)\\)`));
    const labels = match ? match[1].replace(/[\[\]]/g, "").split(",").map(label => label.trim()).filter(label => /^[A-Za-z_]\w*$/.test(label)) : [];
    return { summary: stripMarkdown(cells.at(-1)), labels };
  }
  return { summary: "", labels: [] };
}

function paramsFor(name, descriptor, docLabels = []) {
  const raw = descriptor?.params || [];
  const configured = (names[name] || "").split(" ").filter(Boolean);
  const labels = configured.length === raw.length ? configured : docLabels.length === raw.length ? docLabels : configured;
  return raw.map(([kind, optional], index) => ({
    name: labels[index] || `arg${index + 1}`,
    kind,
    optional: Boolean(optional),
  }));
}

function signature(name, params, callable = true) {
  if (!callable) return name;
  return `${name}(${params.map(p => p.optional ? `[${p.name}]` : p.name).join(", ")})`;
}

export function validateApi(api, expectedNames) {
  if (api.schema !== 1 || !Array.isArray(api.entries)) throw new Error("Invalid API schema");
  const found = new Set();
  for (const entry of api.entries) {
    if (found.has(entry.name)) throw new Error(`Duplicate API entry: ${entry.name}`);
    found.add(entry.name);
    if (!entry.signature || !entry.summary || !entry.category) throw new Error(`Incomplete API entry: ${entry.name}`);
  }
  for (const name of expectedNames) if (!found.has(name)) throw new Error(`Compiler API is undocumented: ${name}`);
  for (const name of found) if (!expectedNames.has(name)) throw new Error(`Documented API is not implemented: ${name}`);
}

export async function buildApi(sdk = root) {
  const sourcePath = path.join(sdk, "compiler/builtins.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const cheatPath = path.join(sdk, "docs/CHEATSHEET.md");
  const cheat = fs.readFileSync(cheatPath, "utf8");
  const { BUILTINS, GT_MEMBERS, CALLBACKS } = await import(`${pathToFileURL(sourcePath).href}?api=${Date.now()}`);
  const entries = [];
  for (const [name, descriptor] of Object.entries(BUILTINS)) {
    const documented = docsFor(cheat, name);
    const params = paramsFor(name, descriptor, documented.labels);
    const category = categoryFor(name, false);
    entries.push({ name, category, signature: signature(name, params), params,
      returns: descriptor.ret || "void", summary: summaries[name] || documented.summary || commentFor(source, name) || `Compiler-supported ${name} function.`,
      source: "compiler/builtins.js", keywords: [name, category, ...(categoryKeywords[category] || [])] });
  }
  for (const [shortName, descriptor] of Object.entries(GT_MEMBERS)) {
    if (descriptor.kind !== "fn") continue;
    const name = `gt.${shortName}`;
    const documented = docsFor(cheat, name);
    const params = paramsFor(shortName, descriptor, documented.labels);
    const category = categoryFor(shortName, true);
    entries.push({ name, category, signature: signature(name, params), params,
      returns: descriptor.ret || "void", summary: documented.summary || commentFor(source, shortName) || `GameTank-specific ${name} function.`,
      source: "compiler/builtins.js", keywords: [name, shortName.replaceAll("_", " "), category, "gametank", ...(categoryKeywords[category] || [])] });
  }
  for (const name of CALLBACKS) entries.push({ name, category: "lifecycle", signature: `${name}()`, params: [], returns: "void",
    summary: summaries[name], source: "compiler/builtins.js", keywords: [name, "callback", "lifecycle"] });
  for (const name of ["all", "hexdata"]) entries.push({ name, category: "data", signature: name === "all" ? "all(pool)" : "hexdata(text)",
    params: [], returns: name === "all" ? "iterator" : "array8", summary: summaries[name], source: "compiler syntax", keywords: [name, "data", "syntax"] });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const expected = new Set([...Object.keys(BUILTINS), ...Object.entries(GT_MEMBERS).filter(([, d]) => d.kind === "fn").map(([n]) => `gt.${n}`), ...CALLBACKS, "all", "hexdata"]);
  const api = { schema: 1, generatedFrom: { "compiler/builtins.js": sha256(source), "docs/CHEATSHEET.md": sha256(cheat) }, counts: { entries: entries.length }, entries };
  validateApi(api, expected);
  return api;
}

async function main() {
  const check = process.argv.includes("--check");
  const output = path.join(root, "docs/api.json");
  const text = `${JSON.stringify(await buildApi(), null, 2)}\n`;
  if (check) {
    if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== text) throw new Error("API metadata is stale; run npm run api:generate");
    console.log("API metadata is current.");
  } else {
    fs.writeFileSync(output, text);
    console.log(`Generated ${JSON.parse(text).entries.length} API entries in docs/api.json.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(`generate-api: ${error.message}`);
  process.exitCode = 2;
});
