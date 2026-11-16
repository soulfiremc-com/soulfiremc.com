import { type ComponentType, Suspense, use } from "react";

type AuthUiComponents = typeof import("./ui-components");

type TrackedPromise<T> = Promise<T> & {
  status?: "pending" | "fulfilled" | "rejected";
  value?: T;
  reason?: unknown;
};

let components: TrackedPromise<AuthUiComponents> | undefined;

/**
 * Starts loading the auth UI components. Calls share one request. The promise
 * records its result in the fields React's `use` reads, so a component that
 * renders after the load finishes does not suspend. That keeps hydration of a
 * preloaded auth page in one pass.
 */
export function preloadAuthUi(): Promise<AuthUiComponents> {
  if (components) return components;
  const promise: TrackedPromise<AuthUiComponents> = import("./ui-components");
  promise.status = "pending";
  promise.then(
    (value) => {
      promise.status = "fulfilled";
      promise.value = value;
    },
    (reason: unknown) => {
      promise.status = "rejected";
      promise.reason = reason;
      // A failed chunk load may be temporary, so the next render retries.
      components = undefined;
    },
  );
  components = promise;
  return promise;
}

/**
 * Returns a component that renders the named auth UI component once its chunk
 * has loaded. Plugins register these so the shared entry chunk does not carry
 * the auth forms and settings cards that only auth, account, and admin pages
 * render.
 */
export function lazyAuthUi<Name extends keyof AuthUiComponents>(
  name: Name,
): AuthUiComponents[Name] {
  function LoadedAuthUi(props: object) {
    const Component = use(preloadAuthUi())[name] as ComponentType<object>;
    return <Component {...props} />;
  }

  function LazyAuthUi(props: object) {
    return (
      <Suspense fallback={null}>
        <LoadedAuthUi {...props} />
      </Suspense>
    );
  }
  LazyAuthUi.displayName = `LazyAuthUi(${name})`;

  return LazyAuthUi as unknown as AuthUiComponents[Name];
}
