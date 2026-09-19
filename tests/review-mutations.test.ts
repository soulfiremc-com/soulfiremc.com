import assert from "node:assert/strict";
import test from "node:test";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import {
  reviewMutationKey,
  reviewMutationOptions,
  selectReviewMutationSlug,
} from "@/lib/review-mutations";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function setup(
  overrides: Partial<Parameters<typeof reviewMutationOptions>[0]> = {},
) {
  const queryClient = new QueryClient();
  const options = reviewMutationOptions({
    itemType: "account",
    viewerId: "viewer",
    queryClient,
    executeTurnstile: async () => "token",
    submitReview: async () => ({ ok: true }),
    deleteReview: async () => ({ ok: true }),
    ...overrides,
  });
  return { queryClient, observer: new MutationObserver(queryClient, options) };
}

test("pending mutations remain shared through verification and cache refresh", async () => {
  const verification = deferred<string>();
  const refresh = deferred<void>();
  const refreshStarted = deferred<void>();
  const { queryClient, observer } = setup({
    executeTurnstile: () => verification.promise,
    submitReview: async ({ data }) => {
      assert.equal(data.turnstileToken, "verified");
      return { ok: true };
    },
  });
  queryClient.invalidateQueries = async (filters) => {
    assert.deepEqual(filters?.queryKey, ["reviews", "account"]);
    refreshStarted.resolve();
    await refresh.promise;
  };
  const filters = {
    mutationKey: reviewMutationKey("account", "viewer"),
    exact: true,
    predicate: (mutation: Parameters<typeof selectReviewMutationSlug>[0]) =>
      selectReviewMutationSlug(mutation) === "shop",
  };
  const pending = observer.mutate({
    action: "upsert",
    slug: "shop",
    rating: 5,
    needsTurnstile: true,
  });
  assert.equal(queryClient.isMutating(filters), 1);
  assert.equal(
    queryClient.isMutating({
      mutationKey: reviewMutationKey("proxy", "viewer"),
    }),
    0,
  );
  assert.equal(
    queryClient.isMutating({
      mutationKey: reviewMutationKey("account", "other"),
    }),
    0,
  );
  verification.resolve("verified");
  await refreshStarted.promise;
  assert.equal(queryClient.isMutating(filters), 1);
  refresh.resolve();
  assert.deepEqual(await pending, { error: null });
  assert.equal(queryClient.isMutating(filters), 0);
  queryClient.clear();
});

test("verification failures skip submission and invalidation and release pending state", async () => {
  const { queryClient, observer } = setup({
    executeTurnstile: async () => {
      throw new Error();
    },
    submitReview: async () => assert.fail(),
  });
  queryClient.invalidateQueries = async () => assert.fail();
  assert.deepEqual(
    await observer.mutate({
      action: "upsert",
      slug: "shop",
      rating: 5,
      needsTurnstile: true,
    }),
    { error: "verification" },
  );
  assert.equal(queryClient.isMutating(), 0);
  queryClient.clear();
});

test("edits bypass verification and rejected deletes do not refresh reviews", async () => {
  const { queryClient, observer } = setup({
    executeTurnstile: async () => assert.fail(),
    submitReview: async ({ data }) => {
      assert.equal(data.turnstileToken, null);
      assert.equal(data.body, null);
      return { ok: true };
    },
    deleteReview: async () => ({ ok: false, error: "unauthorized" }),
  });
  assert.deepEqual(
    await observer.mutate({
      action: "upsert",
      slug: "shop",
      rating: 3,
      needsTurnstile: false,
    }),
    { error: null },
  );
  queryClient.invalidateQueries = async () => assert.fail();
  assert.deepEqual(await observer.mutate({ action: "delete", slug: "shop" }), {
    error: "unauthorized",
  });
  assert.equal(queryClient.isMutating(), 0);
  queryClient.clear();
});

test("network failures propagate without retrying and release pending state", async () => {
  const failure = new Error();
  let calls = 0;
  const { queryClient, observer } = setup({
    deleteReview: async () => {
      calls++;
      throw failure;
    },
  });
  await assert.rejects(
    observer.mutate({ action: "delete", slug: "shop" }),
    (error) => error === failure,
  );
  assert.equal(calls, 1);
  assert.equal(queryClient.isMutating(), 0);
  queryClient.clear();
});
