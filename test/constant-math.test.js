import { test } from "node:test";
import assert from "node:assert/strict";
import { fixedSqrt } from "../compiler/constant-math.js";

test("sqrt folding preserves GameTank's 16.16 approximation and input bounds", () => {
  const root = value => fixedSqrt([value], { num8: false });
  assert.equal(root(0), 0);
  assert.equal(root(-1), 0);
  assert.equal(root(2), 92681 / 65536);
  assert.equal(root(4), 2);
  // The single runtime refinement intentionally differs from an exact root.
  assert.equal(root(2 / 65536), 384 / 65536);
  assert.equal(root(0.1 / 65536), 0);
  for (const value of [32768, -32769, Infinity, NaN]) assert.equal(root(value), null);
});

test("8.8 sqrt folding matches the restoring root across its positive domain", () => {
  for (let raw = 0; raw < 32768; raw++) {
    const result = fixedSqrt([raw / 256], { num8: true }) * 256;
    assert.ok(result * result <= raw * 256);
    assert.ok((result + 1) * (result + 1) > raw * 256);
  }
  assert.equal(fixedSqrt([128], { num8: true }), null);
  assert.equal(fixedSqrt([-129], { num8: true }), null);
});
