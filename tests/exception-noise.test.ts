import assert from "node:assert/strict";
import { test } from "node:test";
import type { CaptureResult } from "posthog-js";
import {
  classifyExceptionNoise,
  filterExceptionNoise,
  isMachineTranslated,
} from "../src/lib/integrations/exception-noise";

function fakeDocument({
  classes = [] as string[],
  translatedNode = false,
} = {}): Document {
  return {
    documentElement: {
      classList: { contains: (name: string) => classes.includes(name) },
    },
    querySelector: () => (translatedNode ? {} : null),
  } as unknown as Document;
}

function exception(
  list: unknown[],
  properties: Record<string, unknown> = {},
): CaptureResult {
  return {
    uuid: "exception-event",
    event: "$exception",
    properties: { $exception_list: list, ...properties },
  };
}

const hydrationError = {
  type: "Error",
  value:
    "Minified React error #418; visit https://react.dev/errors/418?args[]=text for the full message",
  stacktrace: {
    frames: [{ filename: "https://soulfiremc.com/assets/main-abc.js" }],
  },
};

await test("detects Chrome and Edge page translation", () => {
  assert.equal(isMachineTranslated(fakeDocument()), false);
  assert.equal(
    isMachineTranslated(fakeDocument({ classes: ["translated-ltr"] })),
    true,
  );
  assert.equal(
    isMachineTranslated(fakeDocument({ translatedNode: true })),
    true,
  );
  assert.equal(isMachineTranslated(undefined), false);
});

await test("drops hydration errors only when a translator changed the page", () => {
  const translated = fakeDocument({ translatedNode: true });
  assert.equal(
    filterExceptionNoise(exception([hydrationError]), translated),
    null,
  );

  const kept = filterExceptionNoise(
    exception([hydrationError]),
    fakeDocument(),
  );
  assert.equal(kept?.properties.document_translated, false);
});

await test("prefers the translation state recorded when the error happened", () => {
  const recorded = exception([hydrationError], { document_translated: true });
  assert.equal(filterExceptionNoise(recorded, fakeDocument()), null);

  const untranslatedAtError = exception([hydrationError], {
    document_translated: false,
  });
  assert.notEqual(
    filterExceptionNoise(
      untranslatedAtError,
      fakeDocument({ translatedNode: true }),
    ),
    null,
  );
});

await test("tags other errors on translated pages instead of dropping them", () => {
  const error = {
    type: "TypeError",
    value: "Cannot read properties of undefined",
    stacktrace: {
      frames: [{ filename: "https://soulfiremc.com/assets/main-abc.js" }],
    },
  };
  const result = filterExceptionNoise(
    exception([error]),
    fakeDocument({ classes: ["translated-rtl"] }),
  );
  assert.equal(result?.properties.document_translated, true);
});

await test("drops errors that cannot come from site code", () => {
  assert.equal(
    classifyExceptionNoise({ value: "Script error.", stacktrace: null }),
    "opaque_cross_origin",
  );
  assert.equal(
    classifyExceptionNoise({
      value: "Extension context invalidated.",
      stacktrace: {
        frames: [
          { filename: "chrome-extension://abc/content.js" },
          { filename: "moz-extension://def/inject.js" },
        ],
      },
    }),
    "browser_extension",
  );
  assert.equal(
    classifyExceptionNoise({
      value:
        "undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')",
      stacktrace: {
        frames: [{ filename: "https://soulfiremc.com/get-accounts" }],
      },
    }),
    "wallet_injection",
  );
  assert.equal(
    filterExceptionNoise(
      exception([{ value: "Script error." }]),
      fakeDocument(),
    ),
    null,
  );
});

await test("keeps errors with site frames", () => {
  assert.equal(
    classifyExceptionNoise({
      value: "Cannot read properties of undefined (reading 'window.ethereum')",
      stacktrace: {
        frames: [
          { filename: "chrome-extension://abc/content.js" },
          { filename: "https://soulfiremc.com/assets/siwe-123.js" },
        ],
      },
    }),
    null,
  );
  assert.equal(
    classifyExceptionNoise({ value: "Script error.", stacktrace: undefined }),
    "opaque_cross_origin",
  );
  assert.equal(
    classifyExceptionNoise({
      value: "Script error.",
      stacktrace: {
        frames: [{ filename: "https://soulfiremc.com/assets/main.js" }],
      },
    }),
    null,
  );
});

await test("passes other events through unchanged", () => {
  const pageview: CaptureResult = {
    uuid: "pageview",
    event: "$pageview",
    properties: { $current_url: "https://soulfiremc.com/" },
  };
  assert.equal(filterExceptionNoise(pageview, fakeDocument()), pageview);
  assert.equal(filterExceptionNoise(null, fakeDocument()), null);
});
