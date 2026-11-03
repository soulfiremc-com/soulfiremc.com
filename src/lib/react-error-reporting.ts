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

    console.error(error);
  };
}
