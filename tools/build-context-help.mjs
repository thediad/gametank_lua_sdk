#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sdk = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.resolve(process.argv[2] ?? path.join(sdk, "build", "api-help-cache"));
const api = JSON.parse(fs.readFileSync(path.join(sdk, "docs", "api.json"), "utf8"));

function wrap(text, width = 38) {
  const lines = [];
  for (const paragraph of String(text ?? "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > width) { lines.push(line); line = word; }
      else line += `${line ? " " : ""}${word}`;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function render(entry) {
  const lines = [entry.signature, `[${entry.category}] -> ${entry.returns}`, "", ...wrap(entry.summary)];
  if (entry.example) lines.push("", "Example:", ...entry.example.split("\n").map(line => `  ${line}`));
  if (entry.related?.length) lines.push("", `See: ${entry.related.join(", ")}`);
  lines.push("", "F8: full API browser");
  return `${lines.join("\n")}\n`;
}

fs.mkdirSync(output, { recursive: true });
const canonical = new Set(api.entries.map(entry => entry.name.toLowerCase()));
const aliases = new Map();
for (const entry of api.entries) {
  const key = entry.name.toLowerCase();
  if (!/^[a-z0-9_.]+$/.test(key)) throw new Error(`unsafe API cache key: ${entry.name}`);
  fs.writeFileSync(path.join(output, `${key}.txt`), render(entry));
  const alias = key.startsWith("gt.") ? key.slice(3) : key.startsWith("_") ? key.slice(1) : null;
  if (alias && !canonical.has(alias)) {
    if (!aliases.has(alias)) aliases.set(alias, entry);
    else aliases.set(alias, null);
  }
}
for (const [alias, entry] of aliases) {
  if (entry) fs.writeFileSync(path.join(output, `${alias}.txt`), render(entry));
}
fs.writeFileSync(path.join(output, ".entry-count"), `${api.entries.length}\n`);
console.log(`Generated ${api.entries.length} contextual help cards and ${[...aliases.values()].filter(Boolean).length} Nano aliases in ${output}`);
