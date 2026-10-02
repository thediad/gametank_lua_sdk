import fs from "node:fs";
import path from "node:path";

export const PROJECT_FILE = "gtlua.json";
const ASSET_FIELDS = new Map([
  ["sheet", "sheet"], ["sheetext", "sheetext"], ["flags", "flags"],
  ["map", "map"], ["frames", "frames"],
]);
const ASSET_EXTENSIONS = new Map([
  ["sheet", ".gtg"], ["sheetext", ".bin"], ["flags", ".gff"],
  ["map", ".map"], ["frames", ".gsi"], ["song", ".gtm2"],
]);

function projectError(message) {
  throw new Error(`project: ${message}`);
}

function stringField(value, label, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.trim() === "") projectError(`${label} must be a non-empty string`);
  return value;
}

function optionalString(value, label) {
  if (value === undefined || value === null) return undefined;
  return stringField(value, label);
}

function relativeFile(root, value, label) {
  if (value === undefined) return undefined;
  if (path.isAbsolute(value)) projectError(`${label} must be relative to ${PROJECT_FILE}`);
  const resolved = path.resolve(root, value);
  const rel = path.relative(root, resolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    projectError(`${label} must stay inside the project directory`);
  }
  return resolved;
}

export function findProject(start = process.cwd()) {
  let current = path.resolve(start);
  if (fs.existsSync(current) && fs.statSync(current).isFile()) current = path.dirname(current);
  while (true) {
    const manifest = path.join(current, PROJECT_FILE);
    if (fs.existsSync(manifest)) return manifest;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function loadProject(manifestPath) {
  const manifest = path.resolve(manifestPath);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(manifest, "utf8"));
  } catch (error) {
    projectError(`cannot read ${manifest}: ${error.message}`);
  }
  if (!raw || Array.isArray(raw) || typeof raw !== "object") projectError(`${manifest} must contain a JSON object`);
  if (raw.version !== 1) projectError(`unsupported version ${JSON.stringify(raw.version)} in ${manifest}; expected 1`);

  const root = path.dirname(manifest);
  const assets = raw.assets ?? {};
  const build = raw.build ?? {};
  if (!assets || Array.isArray(assets) || typeof assets !== "object") projectError("assets must be an object");
  if (!build || Array.isArray(build) || typeof build !== "object") projectError("build must be an object");
  if (build.num8 !== undefined && typeof build.num8 !== "boolean") projectError("build.num8 must be true or false");
  if (assets.songs !== undefined && (!Array.isArray(assets.songs) || assets.songs.some(item => typeof item !== "string" || !item))) {
    projectError("assets.songs must be an array of non-empty strings");
  }

  const sourceName = stringField(raw.source, "source", "main.lua");
  const outputName = stringField(raw.output, "output", "game.gtr");
  return {
    manifest,
    root,
    name: stringField(raw.name, "name", path.basename(root)),
    entry: relativeFile(root, sourceName, "source"),
    outPath: relativeFile(root, outputName, "output"),
    sheetPath: relativeFile(root, optionalString(assets.sheet, "assets.sheet"), "assets.sheet"),
    sheetExtPath: relativeFile(root, optionalString(assets.sheetext, "assets.sheetext"), "assets.sheetext"),
    gffPath: relativeFile(root, optionalString(assets.flags, "assets.flags"), "assets.flags"),
    mapPath: relativeFile(root, optionalString(assets.map, "assets.map"), "assets.map"),
    framesPath: relativeFile(root, optionalString(assets.frames, "assets.frames"), "assets.frames"),
    songsPaths: (assets.songs ?? []).map((song, index) => relativeFile(root, song, `assets.songs[${index}]`)),
    num8: build.num8 ?? false,
  };
}

export function resolveProject(start = process.cwd()) {
  const manifest = findProject(start);
  if (!manifest) projectError(`no ${PROJECT_FILE} found at or above ${path.resolve(start)}`);
  return loadProject(manifest);
}

export function validateProjectFiles(project) {
  const required = [
    [project.entry, "source"],
    [project.sheetPath, "assets.sheet"],
    [project.sheetExtPath, "assets.sheetext"],
    [project.gffPath, "assets.flags"],
    [project.mapPath, "assets.map"],
    [project.framesPath, "assets.frames"],
    ...project.songsPaths.map((song, index) => [song, `assets.songs[${index}]`]),
  ];
  const missing = required.filter(([file]) => file && !fs.existsSync(file));
  if (missing.length) projectError(`missing ${missing.map(([file, label]) => `${label} (${path.relative(project.root, file)})`).join(", ")}`);
  return project;
}

export function projectInfo(project) {
  const relative = file => file ? path.relative(project.root, file).replaceAll(path.sep, "/") : null;
  return {
    name: project.name,
    root: project.root,
    manifest: relative(project.manifest),
    source: relative(project.entry),
    output: relative(project.outPath),
    numberFormat: project.num8 ? "8.8" : "16.16",
    assets: {
      sheet: relative(project.sheetPath),
      sheetext: relative(project.sheetExtPath),
      flags: relative(project.gffPath),
      map: relative(project.mapPath),
      frames: relative(project.framesPath),
      songs: project.songsPaths.map(relative),
    },
  };
}

function storedProjectPath(project, file, label) {
  const absolute = path.resolve(project.root, file);
  const rel = path.relative(project.root, absolute);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) projectError(`${label} must stay inside the project directory`);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) projectError(`${label} does not exist: ${file}`);
  return rel.replaceAll(path.sep, "/");
}

function writeManifest(project, raw) {
  const temporary = `${project.manifest}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(raw, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temporary, project.manifest);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
  }
  return validateProjectFiles(loadProject(project.manifest));
}

export function setProjectAsset(project, kind, file) {
  const raw = JSON.parse(fs.readFileSync(project.manifest, "utf8"));
  raw.assets ??= {};
  const extension = ASSET_EXTENSIONS.get(kind);
  if (!extension) projectError(`unknown asset kind '${kind}'`);
  if (path.extname(file).toLowerCase() !== extension) projectError(`${kind} must use the ${extension} extension`);
  if (kind === "song") {
    const stored = storedProjectPath(project, file, "song");
    raw.assets.songs ??= [];
    if (!raw.assets.songs.includes(stored)) raw.assets.songs.push(stored);
  } else {
    const field = ASSET_FIELDS.get(kind);
    raw.assets[field] = storedProjectPath(project, file, kind);
  }
  return writeManifest(project, raw);
}

export function unsetProjectAsset(project, kind) {
  const field = ASSET_FIELDS.get(kind);
  if (!field) projectError(`unknown removable asset kind '${kind}'`);
  const raw = JSON.parse(fs.readFileSync(project.manifest, "utf8"));
  if (raw.assets) delete raw.assets[field];
  return writeManifest(project, raw);
}

export function createProject(directory, name = path.basename(path.resolve(directory))) {
  const root = path.resolve(directory);
  const manifest = path.join(root, PROJECT_FILE);
  const entry = path.join(root, "main.lua");
  if (fs.existsSync(manifest) || fs.existsSync(entry)) projectError(`refusing to overwrite an existing ${PROJECT_FILE} or main.lua in ${root}`);
  fs.mkdirSync(root, { recursive: true });
  const config = {
    version: 1,
    name,
    source: "main.lua",
    output: "game.gtr",
    assets: {},
    build: { num8: false },
  };
  fs.writeFileSync(manifest, `${JSON.stringify(config, null, 2)}\n`);
  fs.writeFileSync(entry, `local x=64\nlocal y=64\n\nfunction _update()\n  if btn(0) then x=max(4,x-1) end\n  if btn(1) then x=min(123,x+1) end\n  if btn(2) then y=max(4,y-1) end\n  if btn(3) then y=min(123,y+1) end\nend\n\nfunction _draw()\n  cls(1)\n  print("my gametank game",30,16,7)\n  circfill(x,y,4,10)\nend\n`);
  return loadProject(manifest);
}
