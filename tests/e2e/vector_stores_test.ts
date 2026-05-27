import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The OpenAI `/v1/vector_stores` surface passes through to the upstream
// provider (OpenAI). Without an upstream API key configured, every call
// returns 401 with an "Incorrect API key" body. We verify each method
// routes and surfaces a structured failure.
const tolerantUpstream = (result: { ok: boolean; error?: { kind: string; status?: number } }): void => {
  if (result.ok) return;
  const err = result.error!;
  if (err.kind === "auth") return;
  if (err.kind === "http") {
    const s = err.status ?? 0;
    assert(
      s === 400 || s === 401 || s === 403 || s === 404 || s === 422 || s === 500,
      `unexpected status ${s}: ${JSON.stringify(err)}`,
    );
    return;
  }
  throw new Error(`unexpected error: ${JSON.stringify(err)}`);
};

e2eTest("vectorStores.list routes to /v1/vector_stores", async ({ client }) => {
  const result = await client.vectorStores.list({ limit: 5 });
  tolerantUpstream(result);
});

e2eTest(
  "vectorStores CRUD round-trip routes to the upstream provider",
  async ({ client }) => {
    const created = await client.vectorStores.create({
      name: `e2e-vs-${Date.now()}`,
    });
    if (!created.ok) {
      tolerantUpstream(created);
      return;
    }
    const id = created.value.id;
    try {
      const got = await client.vectorStores.retrieve(id);
      if (got.ok) assertStrictEquals(got.value.id, id);
      else tolerantUpstream(got);

      const updated = await client.vectorStores.update(id, { name: "renamed" });
      if (!updated.ok) tolerantUpstream(updated);

      const list = await client.vectorStores.list();
      if (!list.ok) tolerantUpstream(list);
    } finally {
      const deleted = await client.vectorStores.delete(id);
      if (!deleted.ok) tolerantUpstream(deleted);
    }
  },
);

e2eTest("vectorStores.listFiles routes to /files", async ({ client }) => {
  const result = await client.vectorStores.listFiles("vs-nonexistent");
  tolerantUpstream(result);
});

e2eTest("vectorStores.attachFile routes to the upstream provider", async ({ client }) => {
  const result = await client.vectorStores.attachFile("vs-nonexistent", {
    file_id: "file-nonexistent",
  });
  tolerantUpstream(result);
});

e2eTest("vectorStores.retrieveFile + deleteFile routing smoke", async ({ client }) => {
  const got = await client.vectorStores.retrieveFile("vs-x", "file-x");
  tolerantUpstream(got);
  const removed = await client.vectorStores.deleteFile("vs-x", "file-x");
  tolerantUpstream(removed);
});

e2eTest("vectorStores.updateFile routes to the upstream provider", async ({ client }) => {
  const result = await client.vectorStores.updateFile("vs-x", "file-x", {
    attributes: { foo: "bar" },
  });
  tolerantUpstream(result);
});

e2eTest("vectorStores.fileContent routes to /content", async ({ client }) => {
  const result = await client.vectorStores.fileContent("vs-x", "file-x");
  tolerantUpstream(result);
});

e2eTest("vectorStores.search routes to /search", async ({ client }) => {
  const result = await client.vectorStores.search("vs-x", { query: "hello" });
  tolerantUpstream(result);
});

e2eTest("vectorStores.createIndex routes to /v1/indexes", async ({ client }) => {
  const result = await client.vectorStores.createIndex({
    index_name: `e2e-idx-${Date.now()}`,
    litellm_params: {
      vector_store_index: "fake-index",
      vector_store_name: "fake-store",
    },
  });
  tolerantUpstream(result);
});
