import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Legacy singular `/vector_store/*` admin surface. The proxy persists
// rows in its database, so a basic CRUD round-trip works without an
// upstream provider configured. The endpoints may be enterprise-gated on
// some builds, in which case we skip.

e2eTest("vectorStoresAdmin.list returns the managed vector store catalog", async ({ client }) => {
  const result = await client.vectorStoresAdmin.list({ page: 1, page_size: 10 });
  if (!result.ok && result.error.kind === "auth") return;
  if (!result.ok && result.error.kind === "http" && result.error.status === 403) return;
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assertStrictEquals(result.value.object, "list");
  assert(Array.isArray(result.value.data));
});

e2eTest("vectorStoresAdmin.listV1 mirrors the legacy list endpoint", async ({ client }) => {
  const result = await client.vectorStoresAdmin.listV1({ page: 1, page_size: 10 });
  if (!result.ok && result.error.kind === "auth") return;
  if (!result.ok && result.error.kind === "http" && result.error.status === 403) return;
  assert(result.ok, `listV1 failed: ${JSON.stringify(result)}`);
  assertStrictEquals(result.value.object, "list");
});

e2eTest(
  "vectorStoresAdmin CRUD round-trip on a managed vector store",
  async ({ client }) => {
    const id = `e2e-vsadmin-${Date.now()}`;
    const created = await client.vectorStoresAdmin.create({
      vector_store_id: id,
      custom_llm_provider: "bedrock",
      vector_store_name: "e2e-test",
      vector_store_description: "round-trip",
    });
    if (!created.ok && created.error.kind === "auth") return;
    if (!created.ok && created.error.kind === "http") {
      const s = created.error.status;
      if (s === 403 || s === 404) return;
    }
    assert(created.ok, `create failed: ${JSON.stringify(created)}`);
    assertStrictEquals(created.value.status, "success");
    assertStrictEquals(created.value.vector_store.vector_store_id, id);

    try {
      const info = await client.vectorStoresAdmin.info({ vector_store_id: id });
      assert(info.ok, `info failed: ${JSON.stringify(info)}`);
      assertStrictEquals(info.value.vector_store.vector_store_id, id);

      const updated = await client.vectorStoresAdmin.update({
        vector_store_id: id,
        vector_store_description: "renamed",
      });
      assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);
    } finally {
      const deleted = await client.vectorStoresAdmin.delete({ vector_store_id: id });
      assert(
        deleted.ok || (deleted.error.kind === "http" && deleted.error.status < 500),
        `delete failed: ${JSON.stringify(deleted)}`,
      );
    }
  },
);
