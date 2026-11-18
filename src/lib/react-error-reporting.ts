import type { ErrorInfo } from "react";

type CaptureException = (
  error: unknown,
  properties: Record<string, unknown>,
) => unknown;

export function createRecoverableErrorHandler(
  captureException?: CaptureException,
) {
  return (error: unknown, errorInfo: ErrorInfo) => {
    if (captureException) {
      try {
        captureException(error, {
          react_error_type: "recoverable",
          react_component_stack: errorInfo.componentStack ?? null,
        });
        return;
      } catch {
        // Reporting failures must not interrupt React's recovery.
      }
    }

    // oxlint-disable-next-line eslint/no-console -- without a reporter, React's recoverable errors still need to reach the console
    console.error(error);
  };
}
