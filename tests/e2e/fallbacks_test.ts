import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// `/fallback` configures a fallback chain for a given primary model. The
// proxy stores the chain in-memory (until restart) and exposes it via
// GET + DELETE. We round-trip a chain against the `test-*` models that the
// e2e proxy already has registered.

e2eTest("admin.fallbacks create / get / delete round-trip", async ({ client }) => {
  // The proxy validates that the primary model exists in the router
  // before storing the fallback chain. Pick a registered test model as
  // the primary; the chain can point at any other registered model.
  const primary = "test-gemma3";
  const created = await client.fallbacks.create({
    model: primary,
    fallback_models: ["test-titan-embed"],
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  assertStrictEquals(created.value.model, primary);
  assertStrictEquals(created.value.fallback_type, "general");

  try {
    // Get round-trips the configured fallback chain.
    const got = await client.fallbacks.get(primary);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.model, primary);
    assert(
      got.value.fallback_models.includes("test-titan-embed"),
      "expected fallback chain to include test-titan-embed",
    );

    // Get with an explicit type still resolves.
    const gotTyped = await client.fallbacks.get(primary, "general");
    assert(gotTyped.ok, `get(general) failed: ${JSON.stringify(gotTyped)}`);
  } finally {
    const deleted = await client.fallbacks.delete(primary);
    // The DELETE endpoint can return 200 with a confirmation message or
    // 4xx if the row was already cleared (race-friendly).
    if (!deleted.ok && deleted.error.kind === "http") {
      assert(
        deleted.error.status === 400 || deleted.error.status === 404,
        `unexpected delete error: ${JSON.stringify(deleted.error)}`,
      );
    } else {
      assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
    }
  }
});

e2eTest("admin.fallbacks.get for an unknown model surfaces a 4xx", async ({ client }) => {
  const result = await client.fallbacks.get(`e2e-nonexistent-${Date.now()}`);
  assert(!result.ok, "expected error for unknown model");
  assert(
    result.error.kind === "http",
    `expected http error kind, got: ${JSON.stringify(result.error)}`,
  );
  assert(
    result.error.status >= 400 && result.error.status < 500,
    `expected 4xx, got ${result.error.status}`,
  );
});
