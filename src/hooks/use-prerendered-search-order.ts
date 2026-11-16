import { useState } from "react";

/**
 * Keep the data that ordered a list until the visitor changes its search.
 *
 * Store pages paint the prerendered order before reviews load. Sorting again
 * when reviews arrive, or after the visitor rates a shop, would move cards the
 * visitor already sees. Any change to `searchKey` takes the current `value`,
 * because the visitor then expects the list to change.
 */
export function usePrerenderedSearchOrder<T>(value: T, searchKey: string): T {
  const [order, setOrder] = useState({ searchKey, value });
  if (order.searchKey !== searchKey) {
    setOrder({ searchKey, value });
    return value;
  }
  return order.value;
}
