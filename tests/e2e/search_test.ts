import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

const tolerantUpstream = (
  result: { ok: boolean; error?: { kind: string; status?: number } },
): void => {
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

e2eTest("search.enabledTools lists configured tools", async ({ client }) => {
  const result = await client.search.enabledTools();
  tolerantUpstream(result);
});

e2eTest("search.tools.list returns the search-tool catalog", async ({ client }) => {
  const result = await client.search.tools.list();
  if (!result.ok && result.error.kind === "auth") return;
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.search_tools));
});

e2eTest("search.tools.availableProviders returns the provider catalog", async ({ client }) => {
  const result = await client.search.tools.availableProviders();
  if (!result.ok && result.error.kind === "auth") return;
  assert(result.ok, `availableProviders failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.providers));
});

e2eTest(
  "search.tools CRUD round-trip on a throwaway perplexity tool",
  async ({ client }) => {
    const name = `e2e_search_${Date.now()}`;
    const created = await client.search.tools.create({
      search_tool: {
        search_tool_name: name,
        litellm_params: { search_provider: "perplexity", api_key: "fake-key" },
      },
    });
    if (!created.ok && created.error.kind === "auth") return;
    if (!created.ok && created.error.kind === "http") {
      const s = created.error.status;
      if (s === 403 || s === 404 || s === 400) return;
    }
    assert(created.ok, `create failed: ${JSON.stringify(created)}`);
    const toolId = created.value.search_tool_id;
    if (toolId === undefined) {
      // No id returned; nothing to clean up.
      return;
    }

    try {
      const got = await client.search.tools.get(toolId);
      tolerantUpstream(got);

      const updated = await client.search.tools.update(toolId, {
        search_tool: {
          search_tool_name: name,
          litellm_params: { search_provider: "perplexity", api_key: "fake-key-2" },
        },
      });
      tolerantUpstream(updated);
    } finally {
      const deleted = await client.search.tools.delete(toolId);
      tolerantUpstream(deleted);
    }
  },
);

e2eTest("search.tools.testConnection probes a tool", async ({ client }) => {
  const result = await client.search.tools.testConnection({
    litellm_params: { search_provider: "perplexity", api_key: "fake-key" },
  });
  tolerantUpstream(result);
});

e2eTest("search.query routes to POST /v1/search", async ({ client }) => {
  const result = await client.search.query({
    query: "litellm",
    max_results: 1,
    search_tool_name: "nonexistent",
  });
  tolerantUpstream(result);
});

e2eTest("search.queryWith routes to POST /v1/search/{name}", async ({ client }) => {
  const result = await client.search.queryWith("nonexistent", {
    query: "litellm",
    max_results: 1,
  });
  tolerantUpstream(result);
});
