// test/gfx.test.js - the .gtg sprite-sheet conversion core (compiler/gfx.mjs).
// Verifies our .gtg bytes are the official GameTank format: 128x128 8bpp
// quadrants, top-down row-major, CAPTURE-palette indices, color 0 transparent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  encodePng, decodePng, rgbaToGtg, gtgToPng, p8GfxToGtg, p8Gff, p8Map, gfxBinToGtg, toGtg, gtgNames,
  parseGsi, encodeGsi, bakeFrameTable,
  QUADRANT, QUADRANT_BYTES, FRAME_BYTES,
} from "../compiler/gfx.mjs";
import { GT_CAPTURE_PALETTE, nearestColorByte } from "../compiler/gt_palette.js";
import { P8_PALETTE } from "../compiler/builtins.js";

const SDK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// build an RGBA buffer from a (x,y)->[r,g,b,a] function
function makeRgba(w, h, fn) {
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = fn(x, y);
    const o = (y * w + x) * 4;
    rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a ?? 255;
  }
  return rgba;
}

test("a .gtg quadrant is exactly 16384 bytes (128x128, 1 byte/px)", () => {
  const rgba = makeRgba(128, 128, () => [200, 100, 50]);
  const { quadrants } = rgbaToGtg(128, 128, rgba);
  assert.equal(quadrants.length, 1);
  assert.equal(quadrants[0].length, QUADRANT_BYTES);
  assert.equal(QUADRANT_BYTES, 16384);
  assert.equal(QUADRANT, 128);
});

test("transparent pixels (low alpha) become color 0", () => {
  const rgba = makeRgba(128, 128, (x) => [255, 0, 0, x < 64 ? 255 : 0]);
  const { quadrants } = rgbaToGtg(128, 128, rgba);
  const q = quadrants[0];
  assert.notEqual(q[0], 0, "opaque red pixel should be nonzero");
  assert.equal(q[64], 0, "transparent pixel should be color 0");
});

test("rows are top-down row-major (pixel (x,y) -> byte y*128+x)", () => {
  // put a unique opaque color only at (5, 3); it must land at byte 3*128+5
  const rgba = makeRgba(128, 128, (x, y) =>
    (x === 5 && y === 3) ? [255, 0, 255, 255] : [0, 0, 0, 0]);
  const { quadrants } = rgbaToGtg(128, 128, rgba);
  const q = quadrants[0];
  assert.notEqual(q[3 * 128 + 5], 0);
  // and nowhere else
  let nonzero = 0;
  for (const b of q) if (b) nonzero++;
  assert.equal(nonzero, 1);
});

test("256x256 source splits into 4 quadrants in NW,NE,SW,SE order", async () => {
  // each quadrant a distinct solid color so we can identify it
  const rgba = makeRgba(256, 256, (x, y) => {
    if (x < 128 && y < 128) return [255, 0, 0];   // NW red
    if (x >= 128 && y < 128) return [0, 255, 0];  // NE green
    if (x < 128 && y >= 128) return [0, 0, 255];  // SW blue
    return [255, 255, 0];                          // SE yellow
  });
  const { quadrants } = rgbaToGtg(256, 256, rgba);
  assert.equal(quadrants.length, 4);
  // each source region maps to its own nearest-CAPTURE byte; the four must be
  // distinct and consistent (the GameTank palette is muted, so we compare the
  // resolved byte against nearestColorByte of the same source color, not raw RGB).
  assert.equal(quadrants[0][0], nearestColorByte(255, 0, 0), "quad 0 = NW red region");
  assert.equal(quadrants[1][0], nearestColorByte(0, 255, 0), "quad 1 = NE green region");
  assert.equal(quadrants[2][0], nearestColorByte(0, 0, 255), "quad 2 = SW blue region");
  assert.equal(quadrants[3][0], nearestColorByte(255, 255, 0), "quad 3 = SE yellow region");
  const bytes = new Set([quadrants[0][0], quadrants[1][0], quadrants[2][0], quadrants[3][0]]);
  assert.equal(bytes.size, 4, "the four quadrants are four distinct colors");
});

test("gtgNames follows the official name/_1/_2/_3 convention", () => {
  assert.deepEqual(gtgNames("hero.gtg", 1), ["hero.gtg"]);
  assert.deepEqual(gtgNames("hero", 4), ["hero.gtg", "hero_1.gtg", "hero_2.gtg", "hero_3.gtg"]);
});

test("PNG encode -> decode round-trips exact RGB", () => {
  const rgb = Buffer.alloc(16 * 16 * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) & 255;
  const png = encodePng(16, 16, rgb);
  const { width, height, rgba } = decodePng(png);
  assert.equal(width, 16); assert.equal(height, 16);
  for (let p = 0; p < 16 * 16; p++) {
    assert.equal(rgba[p * 4], rgb[p * 3]);
    assert.equal(rgba[p * 4 + 1], rgb[p * 3 + 1]);
    assert.equal(rgba[p * 4 + 2], rgb[p * 3 + 2]);
  }
});

test("gtg -> png -> gtg is visually lossless (only same-RGB index swaps)", () => {
  // a gradient of real palette colors
  const src = Buffer.alloc(QUADRANT_BYTES);
  for (let i = 0; i < QUADRANT_BYTES; i++) src[i] = i & 255;
  const { width, height, rgba } = decodePng(gtgToPng(src));
  const { quadrants } = rgbaToGtg(width, height, rgba);
  const back = quadrants[0];
  for (let i = 0; i < QUADRANT_BYTES; i++) {
    const a = GT_CAPTURE_PALETTE[src[i]], b = GT_CAPTURE_PALETTE[back[i]];
    assert.deepEqual(b, a, `pixel ${i} changed color`);
  }
});

test("PICO-8 __gfx__ imports to a single quadrant via P8_PALETTE", () => {
  // a tiny cart: 2 rows, uses indices 0 (transparent) and 8
  const p8 = "__gfx__\n08080808\n80808080\n";
  const { quadrants, width, height } = p8GfxToGtg(p8);
  assert.equal(quadrants.length, 1);
  assert.equal(width, 128); assert.equal(height, 128);
  const q = quadrants[0];
  assert.equal(q[0], 0, "index 0 -> transparent");
  assert.notEqual(q[1], 0, "index 8 -> a color");
});

test("PICO-8 __gff__ imports exactly 256 sprite-flag bytes", () => {
  const flags = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0")).join("");
  const p8 = `__gfx__\n0\n__gff__\n${flags.slice(0, 256)}\n${flags.slice(256)}\n__sfx__\n`;
  assert.deepEqual([...p8Gff(p8)], Array.from({ length: 256 }, (_, i) => i));
  assert.deepEqual([...p8GfxToGtg(p8).gff], Array.from({ length: 256 }, (_, i) => i));
  assert.equal(p8Gff("__gfx__\n0\n"), null);
  assert.throws(() => p8Gff("__gff__\n00\n"), /exactly 256 bytes/);
});

test("PICO-8 map import appends shared lower-gfx bytes as rows 32..63", () => {
  const mapHex = "12" + "00".repeat(4095);
  const gfxHex = "0".repeat(8192) + "ab" + "0".repeat(8190);
  const map = p8Map(`__gfx__\n${gfxHex}\n__map__\n${mapHex}\n__gff__\n`);
  assert.equal(map.length, 8192);
  assert.equal(map[0], 0x12);
  assert.equal(map[4096], 0xba, "low gfx nibble is the low map-byte nibble");
  assert.equal(map[8191], 0);
  assert.equal(p8Map("__gfx__\n0\n"), null);
  assert.throws(() => p8Map("__map__\n00\n"), /exactly 4096 bytes/);
});

test("gfx CLI emits .gtg, .gff, and the complete 64-row .map from a .p8 cart", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gtlua-p8-import-"));
  try {
    const cart = path.join(dir, "fixture.p8");
    const out = path.join(dir, "fixture.gtg");
    const flagsHex = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0")).join("");
    const mapHex = "12" + "00".repeat(4095);
    const gfxHex = "0".repeat(8192) + "ab" + "0".repeat(8190);
    writeFileSync(cart, `pico-8 cartridge // http://www.pico-8.com\nversion 42\n__gfx__\n${gfxHex}\n__map__\n${mapHex}\n__gff__\n${flagsHex}\n`);

    const run = spawnSync(process.execPath,
      [path.join(SDK, "bin", "gtlua.js"), "gfx", "import", cart, "-o", out],
      { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);

    const gtg = readFileSync(out);
    const gff = readFileSync(path.join(dir, "fixture.gff"));
    const map = readFileSync(path.join(dir, "fixture.map"));
    assert.equal(gtg.length, 16384);
    assert.equal(gff.length, 256);
    assert.equal(gff[255], 255);
    assert.equal(map.length, 8192);
    assert.equal(map[0], 0x12);
    assert.equal(map[4096], 0xba);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("4bpp->gtg uses the SAME palette table as the C runtime (parity invariant)", () => {
  // gfxBinToGtg must expand nibbles through the exact 16 bytes the 4bpp runtime
  // loader (sdk/gt_api.c p8pal_rom) uses, or a migrated .gtg would not render
  // identically to the game's current gfx.bin. Pin the table so it can't drift.
  assert.deepEqual([...P8_PALETTE], [
    0x00, 0xA9, 0x5A, 0xDB, 0x33, 0x03, 0x06, 0x07,
    0x5B, 0x3E, 0x1F, 0xFE, 0xBE, 0x8C, 0x5E, 0x2F,
  ]);
  // and each of the 16 indices lands where the runtime would put it
  const bin = Buffer.alloc(8192);
  for (let n = 0; n < 16; n++) bin[n] = n | (n << 4);   // both nibbles = n
  const q = gfxBinToGtg(bin).quadrants[0];
  for (let n = 0; n < 16; n++) {
    assert.equal(q[n * 2], P8_PALETTE[n]);
    assert.equal(q[n * 2 + 1], P8_PALETTE[n]);
  }
});

test("legacy 4bpp gfx.bin migrates to .gtg via P8_PALETTE (byte-identical to runtime)", () => {
  // two pixels per byte: low nibble = even x, high nibble = odd x.
  const bin = Buffer.alloc(8192);
  bin[0] = 0x30;                 // even-x = index 0 (transparent), odd-x = index 3
  bin[1] = 0x8a;                 // even-x = index 10, odd-x = index 8
  const { quadrants, width, height } = gfxBinToGtg(bin);
  assert.equal(width, 128); assert.equal(height, 128);
  const q = quadrants[0];
  assert.equal(q[0], P8_PALETTE[0], "byte0 low nibble -> even pixel");
  assert.equal(q[1], P8_PALETTE[3], "byte0 high nibble -> odd pixel");
  assert.equal(q[2], P8_PALETTE[10]);
  assert.equal(q[3], P8_PALETTE[8]);
  assert.equal(q[0], 0, "index 0 stays transparent (color 0)");
});

test("toGtg dispatches by content: PNG, p8, 4bpp gfx.bin, raw .gtg", () => {
  const png = encodePng(8, 8, Buffer.alloc(8 * 8 * 3, 100));
  assert.equal(toGtg(png, "x.png").quadrants[0].length, QUADRANT_BYTES);
  const p8 = Buffer.from("__gfx__\n11111111\n");
  assert.equal(toGtg(p8, "x.p8").quadrants.length, 1);
  const gfxbin = Buffer.alloc(8192, 0x11);          // 4bpp legacy sheet
  assert.equal(toGtg(gfxbin, "x.bin").quadrants[0].length, QUADRANT_BYTES);
  const raw = Buffer.alloc(QUADRANT_BYTES, 7);
  assert.equal(toGtg(raw, "x.gtg").quadrants[0], raw);
});

test("oversized image is rejected", () => {
  const rgba = makeRgba(300, 100, () => [0, 0, 0]);
  assert.throws(() => rgbaToGtg(300, 100, rgba), /exceeds one 256x256/);
});

test(".gsi frame records round-trip (8 bytes each, official layout)", () => {
  const frames = [
    { vxo: -3, vyo: 5, w: 16, h: 24, gx: 32, gy: 48 },
    { vxo: 0, vyo: 0, w: 8, h: 8, gx: 200, gy: 130 },
  ];
  const buf = encodeGsi(frames);
  assert.equal(buf.length, frames.length * FRAME_BYTES);
  const back = parseGsi(buf);
  assert.deepEqual(back, frames);
});

test("bakeFrameTable emits 6 bytes/frame with quadrant bit7 in gx/gy", () => {
  const frames = [
    { vxo: 1, vyo: 2, w: 8, h: 8, gx: 10, gy: 20 },   // NW quadrant
    { vxo: 0, vyo: 0, w: 8, h: 8, gx: 12, gy: 30 },   // will be tagged SE
  ];
  const tab = bakeFrameTable(frames, (i) => (i === 0 ? 0 : 3));  // frame1 -> SE
  assert.equal(tab.length, frames.length * 6);
  // frame 0 (NW): gx/gy unchanged, no bit7
  assert.equal(tab[4], 10); assert.equal(tab[5], 20);
  // frame 1 (SE): both bit7 set
  assert.equal(tab[10], 12 | 0x80); assert.equal(tab[11], 30 | 0x80);
  // vxo/vyo/w/h carried through
  assert.equal(tab[0], 1); assert.equal(tab[1], 2); assert.equal(tab[2], 8); assert.equal(tab[3], 8);
});

test("parseGsi rejects a non-multiple-of-8 blob", () => {
  assert.throws(() => parseGsi(Buffer.alloc(7)), /not a multiple/);
});
