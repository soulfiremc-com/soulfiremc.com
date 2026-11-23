/**
 * Reads a number from a text field value and clamps it to a range. Empty or
 * partial input such as "" or "0." falls back instead of being rewritten,
 * so the field keeps what the user typed.
 */
export function parseCalculatorNumber(
  value: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
) {
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- Number("") is 0, but empty or partial input must use the fallback
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
