import { strict as assert } from "node:assert";
import { test } from "node:test";
import { type AuthClient, sessionOptions } from "@better-auth-ui/core";
import { sessionQueryOptions } from "../src/lib/auth/session-query";

type GetSessionInput = { fetchOptions?: { signal?: AbortSignal } };

function fakeClient(calls: GetSessionInput[]) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the query only calls getSession
  return {
    getSession: (input: GetSessionInput) => {
      calls.push(input);
      return Promise.resolve({ user: { id: "user-1" } });
    },
  } as unknown as AuthClient;
}

void test("the header session query shares Better Auth UI's cache entry", () => {
  const client = fakeClient([]);
  assert.deepEqual(
    sessionQueryOptions(client).queryKey,
    sessionOptions(client).queryKey,
  );
});

void test("the header session query throws on errors and can be cancelled", async () => {
  const calls: GetSessionInput[] = [];
  const signal = new AbortController().signal;
  const { queryFn } = sessionQueryOptions(fakeClient(calls));
  assert.ok(typeof queryFn === "function");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the query function reads only the signal
  const result = await queryFn({ signal } as Parameters<typeof queryFn>[0]);
  assert.deepEqual(result, { user: { id: "user-1" } });
  assert.deepEqual(calls, [{ fetchOptions: { signal, throw: true } }]);
});
