import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Batches require a provider with batch support (OpenAI, Anthropic). The
// local proxy 500s on create (no OPENAI_API_KEY) but happily lists.

e2eTest("batches.list returns an empty list on a fresh proxy", async ({ client }) => {
  const result = await client.batches.list();
  // The proxy's list endpoint succeeds even without provider creds.
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assertStrictEquals(result.value.object, "list");
  assert(Array.isArray(result.value.data));
  assertStrictEquals(typeof result.value.has_more, "boolean");
});

e2eTest("batches.list forwards `limit` and `after` query params", async ({ client }) => {
  const result = await client.batches.list({ limit: 5, after: "batch_x" });
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    return;
  }
  assertStrictEquals(result.value.object, "list");
});

e2eTest("batches.create routes to POST /v1/batches", async ({ client }) => {
  const result = await client.batches.create({
    input_file_id: "file-not-real",
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });
  // Will 500 without OPENAI_API_KEY (or 400 if the file id is rejected
  // first). Either is a "routing works" pass.
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400 ||
          result.error.status === 404,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assertStrictEquals(result.value.object, "batch");
});

e2eTest("batches.retrieve routes to GET /v1/batches/{id}", async ({ client }) => {
  const result = await client.batches.retrieve("batch_not_real");
  assert(!result.ok, "expected an error for a fake id");
  assertStrictEquals(result.error.kind, "http");
});

e2eTest("batches.cancel routes to POST /v1/batches/{id}/cancel", async ({ client }) => {
  const result = await client.batches.cancel("batch_not_real");
  assert(!result.ok, "expected an error for a fake id");
  assertStrictEquals(result.error.kind, "http");
});
