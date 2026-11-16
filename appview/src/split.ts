/**
 * Split `total` cents across buckets in proportion to `weights` (integers >= 0).
 * Largest-remainder rounding; ties go to the lower index, so sort the input
 * deterministically. The result always sums to `total` (all zeros if no weights).
 */
export function splitCents(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const out = weights.map((w) => Math.floor((total * w) / sum));
  const order = weights
    .map((w, i) => ({ i, rem: (total * w) % sum }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  let left = total - out.reduce((a, b) => a + b, 0);
  for (const { i } of order) {
    if (left-- <= 0) break;
    out[i]++;
  }
  return out;
}
