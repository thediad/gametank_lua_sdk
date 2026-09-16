// Compile-time equivalents of GameTank's fixed-point runtime algorithms.
// Kept in the SDK because another console may use a different approximation.
function integerSqrt(n) {
  let result = 0n;
  let bit = 1n << (BigInt(n.toString(2).length - 1) & ~1n);
  while (bit !== 0n) {
    if (n >= result + bit) {
      n -= result + bit;
      result = (result >> 1n) + bit;
    } else {
      result >>= 1n;
    }
    bit >>= 2n;
  }
  return result;
}

export function fixedSqrt([value], { num8 }) {
  const scale = num8 ? 256 : 65536;
  // Decline values outside the runtime's signed fixed-point input range.
  const rawNumber = Math.round(value * scale);
  const limit = num8 ? 32768 : 2147483648;
  if (!Number.isFinite(rawNumber) || rawNumber < -limit || rawNumber >= limit) return null;
  if (rawNumber <= 0) return 0;
  const raw = BigInt(rawNumber);
  if (num8) return Number(integerSqrt(raw << 8n)) / scale;
  let result = integerSqrt(raw) << 8n;
  if (result !== 0n) result = (result + (raw << 16n) / result) >> 1n;
  return Number(result) / scale;
}
