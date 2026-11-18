/**
 * Reads an index that the caller knows is in range. Throws when the
 * invariant breaks, so a bad index fails loudly instead of returning
 * `undefined`. Do not use it for arrays that can hold `undefined`.
 */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(
      `Index ${index} is out of range for length ${items.length}`,
    );
  }
  return item;
}
