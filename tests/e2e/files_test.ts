import { assert, assertStrictEquals } from "@std/assert";
import type { ApiError, Result } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

// The proxy needs `files_settings` configured on the upstream provider for
// the files API to function. Without it, every method returns 500. We
// smoke each method and accept the structured error.

/**
 * Returns true when `result` is OK (lets the caller proceed with success
 * assertions). When `result` is an error, asserts the error is an
 * acceptable upstream-provider failure and returns false.
 */
const tolerateUpstream = <T>(result: Result<T, ApiError>): result is { ok: true; value: T } => {
  if (result.ok) return true;
  assertStrictEquals(result.error.kind, "http");
  if (result.error.kind === "http") {
    assert(
      result.error.status === 500 || result.error.status === 400 ||
        result.error.status === 404,
      `unexpected status: ${result.error.status}`,
    );
  }
  return false;
};

e2eTest("files.create uploads a small text file as multipart", async ({ client }) => {
  const file = new Blob([new TextEncoder().encode("line one\nline two\n")], {
    type: "text/plain",
  });
  const result = await client.files.create({
    file,
    filename: "hello.txt",
    purpose: "user_data",
  });
  if (!tolerateUpstream(result)) return;
  assertStrictEquals(result.value.object, "file");

  // Clean up if the create actually succeeded.
  await client.files.delete(result.value.id);
});

e2eTest("files.list routes to GET /v1/files", async ({ client }) => {
  const result = await client.files.list();
  if (!tolerateUpstream(result)) return;
  assertStrictEquals(result.value.object, "list");
  assert(Array.isArray(result.value.data));
});

e2eTest("files.list with a purpose filter forwards the query param", async ({ client }) => {
  const result = await client.files.list({ purpose: "batch" });
  if (!tolerateUpstream(result)) return;
  assertStrictEquals(result.value.object, "list");
});

e2eTest("files.retrieve routes to GET /v1/files/{id}", async ({ client }) => {
  const result = await client.files.retrieve("file-not-real");
  // Expected to fail; structured http error is the pass condition.
  assert(!result.ok, "expected an error for a fake id");
  assertStrictEquals(result.error.kind, "http");
});

e2eTest("files.delete routes to DELETE /v1/files/{id}", async ({ client }) => {
  const result = await client.files.delete("file-not-real");
  assert(!result.ok, "expected an error for a fake id");
  assertStrictEquals(result.error.kind, "http");
});

e2eTest("files.content routes to GET /v1/files/{id}/content", async ({ client }) => {
  const result = await client.files.content("file-not-real");
  assert(!result.ok, "expected an error for a fake id");
  assertStrictEquals(result.error.kind, "http");
});
