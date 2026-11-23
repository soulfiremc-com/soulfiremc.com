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
    executeTurnstile: () => Promise.resolve("token"),
    submitReview: () => Promise.resolve({ ok: true }),
    deleteReview: () => Promise.resolve({ ok: true }),
    ...overrides,
  });
  return { queryClient, observer: new MutationObserver(queryClient, options) };
}

await test("pending mutations remain shared through verification and cache refresh", async () => {
  const verification = deferred<string>();
  const refresh = deferred<undefined>();
  const refreshStarted = deferred<undefined>();
  const { queryClient, observer } = setup({
    executeTurnstile: () => verification.promise,
    submitReview: ({ data }) => {
      assert.equal(data.turnstileToken, "verified");
      return Promise.resolve({ ok: true });
    },
  });
  queryClient.invalidateQueries = async (filters) => {
    assert.deepEqual(filters?.queryKey, ["reviews", "account"]);
    refreshStarted.resolve(undefined);
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
  refresh.resolve(undefined);
  assert.deepEqual(await pending, { error: null });
  assert.equal(queryClient.isMutating(filters), 0);
  queryClient.clear();
});

await test("verification failures skip submission and invalidation and release pending state", async () => {
  const { queryClient, observer } = setup({
    executeTurnstile: () => Promise.reject(new Error("Unexpected test call")),
    submitReview: () => assert.fail(),
  });
  queryClient.invalidateQueries = () => assert.fail();
  assert.deepEqual(
    await observer.mutate({
      action: "upsert",
      slug: "shop",
      rating: 5,
    }),
    { error: "verification" },
  );
  assert.equal(queryClient.isMutating(), 0);
  queryClient.clear();
});

await test("edits verify again and rejected deletes do not refresh reviews", async () => {
  const { queryClient, observer } = setup({
    executeTurnstile: () => Promise.resolve("edit-token"),
    submitReview: ({ data }) => {
      assert.equal(data.turnstileToken, "edit-token");
      // A rating without a body must not clear the stored comment.
      assert.equal("body" in data, false);
      return Promise.resolve({ ok: true });
    },
    deleteReview: () => Promise.resolve({ ok: false, error: "unauthorized" }),
  });
  assert.deepEqual(
    await observer.mutate({
      action: "upsert",
      slug: "shop",
      rating: 3,
    }),
    { error: null },
  );
  queryClient.invalidateQueries = () => assert.fail();
  assert.deepEqual(await observer.mutate({ action: "delete", slug: "shop" }), {
    error: "unauthorized",
  });
  assert.equal(queryClient.isMutating(), 0);
  queryClient.clear();
});

await test("network failures propagate without retrying and release pending state", async () => {
  const failure = new Error("Unexpected test call");
  let calls = 0;
  const { queryClient, observer } = setup({
    deleteReview: () => {
      calls++;
      return Promise.reject(failure);
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

await test("server rejections preserve their result and skip review cache refresh", async () => {
  for (const error of ["unauthorized", "verification"] as const) {
    const { queryClient, observer } = setup({
      submitReview: () =>
        Promise.resolve(
          error === "verification"
            ? { ok: false, error, errorCodes: ["invalid-input-response"] }
            : { ok: false, error },
        ),
    });
    queryClient.invalidateQueries = () =>
      assert.fail("Rejected submissions must not refresh");
    assert.deepEqual(
      await observer.mutate({
        action: "upsert",
        slug: "shop",
        rating: 5,
      }),
      { error },
    );
    assert.equal(queryClient.isMutating(), 0);
    queryClient.clear();
  }
});

await test("refresh failures preserve their cause and never resubmit a successful write", async () => {
  const failure = new Error("Refresh failed");
  let writes = 0;
  const { queryClient, observer } = setup({
    submitReview: () => {
      writes++;
      return Promise.resolve({ ok: true });
    },
  });
  queryClient.invalidateQueries = () => Promise.reject(failure);
  await assert.rejects(
    observer.mutate({
      action: "upsert",
      slug: "shop",
      rating: 5,
    }),
    (error) => error === failure,
  );
  assert.equal(writes, 1);
  assert.equal(queryClient.isMutating(), 0);
  queryClient.clear();
});
