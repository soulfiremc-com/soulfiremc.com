import { AsyncLocalStorage } from "node:async_hooks";

const executionContextStorage = new AsyncLocalStorage<ExecutionContext>();

export function runWithExecutionContext<T>(
  executionContext: ExecutionContext,
  callback: () => T | Promise<T>,
): Promise<T> | T {
  return executionContextStorage.run(executionContext, callback);
}

export function runInBackground(promise: Promise<unknown>): void {
  const executionContext = executionContextStorage.getStore();

  if (executionContext) {
    executionContext.waitUntil(promise);
    return;
  }

  promise.catch(() => {});
}
