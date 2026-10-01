#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = fs.existsSync(path.join(scriptRoot, "compiler/builtins.js"))
  ? scriptRoot
  : process.env.GTLUA_SDK || "/home/pico/dev/gametank/gametank_lua_sdk";
const width = Math.max(32, Math.min(72, Number(process.env.COLUMNS) || process.stdout.columns || 40));
const pageSize = Math.max(5, Math.min(10, Number(process.env.LINES) ? Number(process.env.LINES) - 10 : 8));

export function wrap(text, columns = width) {
  const output = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > columns) { output.push(line); line = word; }
      else line += `${line ? " " : ""}${word}`;
    }
    output.push(line);
  }
  return output.join("\n");
}

export function search(entries, query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.map(entry => {
    const name = entry.name.toLowerCase();
    const text = [entry.name, entry.signature, entry.summary, entry.category, ...entry.keywords].join(" ").toLowerCase();
    if (!terms.every(term => text.includes(term))) return null;
    const score = terms.reduce((total, term) => total + (name === term ? 100 : name.startsWith(term) ? 40 : name.includes(term) ? 20 : 1), 0);
    return { entry, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
}

export function formatEntry(entry, columns = width) {
  const lines = [entry.signature, `[${entry.category}] -> ${entry.returns}`, "", wrap(entry.summary, columns)];
  if (entry.params.length) {
    lines.push("", "Arguments:");
    for (const param of entry.params) lines.push(wrap(`  ${param.name}${param.optional ? " (optional)" : ""}: ${param.kind}`, columns));
  }
  return `${lines.join("\n")}\n`;
}

export function loadApi(sdk = root) {
  const api = JSON.parse(fs.readFileSync(path.join(sdk, "docs/api.json"), "utf8"));
  const trackedSources = ["compiler/builtins.js", "docs/CHEATSHEET.md"];
  const stale = trackedSources.some(file => createHash("sha256").update(fs.readFileSync(path.join(sdk, file))).digest("hex") !== api.generatedFrom?.[file]);
  if (api.schema !== 1 || stale) throw new Error("API index is stale; run npm run api:generate");
  return api;
}

function renderList(title, items, page) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  page = Math.max(0, Math.min(page, pages - 1));
  const lines = [`${title}  ${page + 1}/${pages}`, ""];
  items.slice(page * pageSize, (page + 1) * pageSize).forEach((item, index) => {
    lines.push(`${index + 1}  ${item.name}`);
    lines.push(wrap(`   ${item.summary}`, width));
  });
  lines.push("", "number open   n/p page   / search", "b categories  ? controls  q quit");
  return { text: `${lines.join("\n")}\n`, page, pages };
}

async function browse(api) {
  const categories = [...new Set(api.entries.map(entry => entry.category))].sort();
  let mode = "categories", items = categories, title = "GameTank Lua Help", page = 0;
  const history = [];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = prompt => new Promise(resolve => rl.question(prompt, resolve));
  try {
    while (true) {
      if (mode === "categories") {
        console.log(`\n${title}\n`);
        categories.forEach((category, index) => console.log(`${index + 1}  ${category} (${api.entries.filter(e => e.category === category).length})`));
        console.log("\nnumber open   / search   ? controls   q quit");
      } else if (mode === "list") {
        const rendered = renderList(title, items, page); page = rendered.page; process.stdout.write(`\n${rendered.text}`);
      }
      const input = (await ask("Select: ")).trim();
      if (input === "q") break;
      if (input === "?") { console.log("\nBrowse by category or type /words to search names and descriptions. Direct lookup: gtapi spr\n"); continue; }
      if (input === "b") { mode = "categories"; title = "GameTank Lua Help"; page = 0; continue; }
      if (input === "n" && mode === "list") { page++; continue; }
      if (input === "p" && mode === "list") { page--; continue; }
      if (input === "/") {
        const query = (await ask("Search: ")).trim();
        items = search(api.entries, query).map(result => result.entry); title = `Search: ${query}`; mode = "list"; page = 0; continue;
      }
      if (input.startsWith("/")) { const query = input.slice(1).trim(); items = search(api.entries, query).map(r => r.entry); title = `Search: ${query}`; mode = "list"; page = 0; continue; }
      if (/^\d+$/.test(input)) {
        const selected = Number(input) - 1;
        if (mode === "categories" && categories[selected]) { const category = categories[selected]; items = api.entries.filter(e => e.category === category); title = category; mode = "list"; page = 0; }
        else if (mode === "list") { const entry = items[page * pageSize + selected]; if (entry) { console.log(`\n${formatEntry(entry)}`); await ask("Enter to return: "); } }
      } else if (input) { items = search(api.entries, input).map(r => r.entry); title = `Search: ${input}`; mode = "list"; page = 0; }
    }
  } finally { rl.close(); }
}

async function main() {
  const api = loadApi();
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("gtapi [name or search words]\nWithout a query, opens the interactive offline API browser."); return;
  }
  if (args.length) {
    const query = args.join(" ");
    const matches = search(api.entries, query);
    if (!matches.length) { console.error(`gtapi: no API help matches '${query}'`); process.exitCode = 1; return; }
    if (matches[0].entry.name.toLowerCase() === query.toLowerCase() || matches.length === 1) process.stdout.write(formatEntry(matches[0].entry));
    else matches.slice(0, 12).forEach(({ entry }) => console.log(`${entry.signature}\n  ${entry.summary}`));
    return;
  }
  await browse(api);
}

const invokedFile = process.argv[1] && fs.realpathSync(process.argv[1]);
if (invokedFile && invokedFile === fs.realpathSync(fileURLToPath(import.meta.url))) main().catch(error => {
  console.error(`gtapi: ${error.message}`);
  process.exitCode = 2;
});
