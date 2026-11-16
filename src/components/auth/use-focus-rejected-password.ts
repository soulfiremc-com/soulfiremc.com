import { useEffect, useRef } from "react";

/**
 * Focus and select a password input after the server rejects its value.
 *
 * The input stays disabled until the request settles, so focus waits for
 * `isPending` to clear. Selecting the value lets the user type a replacement
 * right away.
 */
export function useFocusRejectedPassword(
  isRejected: boolean,
  isPending: boolean,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRejected || isPending) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isRejected, isPending]);

  return inputRef;
}
