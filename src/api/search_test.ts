import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("search.tools.list GETs /search_tools/list", async () => {
  const { client, calls } = clientReturning({ search_tools: [] });
  await client.search.tools.list();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/search_tools/list");
});

Deno.test("search.tools.get GETs /search_tools/{id}", async () => {
  const { client, calls } = clientReturning({ search_tool_id: "st-1", search_tool_name: "x" });
  await client.search.tools.get("st 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/search_tools/st%201");
});

Deno.test("search.tools.testConnection POSTs litellm_params to /search_tools/test_connection", async () => {
  const { client, calls } = clientReturning({});
  await client.search.tools.testConnection({ litellm_params: { search_provider: "tavily" } });
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/search_tools/test_connection");
  assertStrictEquals(r.body.litellm_params.search_provider, "tavily");
});
