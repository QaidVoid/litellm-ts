import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("agents.list GETs /v1/agents", async () => {
  const { client, calls } = clientReturning({ data: [] });
  await client.agents.list();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/agents");
});

Deno.test("agents.get GETs /v1/agents/{id}", async () => {
  const { client, calls } = clientReturning({ agent_id: "a-1", agent_name: "x" });
  await client.agents.get("a 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/agents/a%201");
});

Deno.test("agents.delete DELETEs /v1/agents/{id}", async () => {
  const { client, calls } = clientReturning({});
  await client.agents.delete("a-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/v1/agents/a-1");
});

Deno.test("agents.makePublic POSTs /v1/agents/{id}/make_public with no body", async () => {
  const { client, calls } = clientReturning({
    message: "ok",
    public_agent_groups: [],
    updated_by: "u",
  });
  await client.agents.makePublic("a-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/v1/agents/a-1/make_public");
  assertStrictEquals(r.body, undefined);
});

Deno.test("agents.dailyActivity GETs /agent/daily/activity with query", async () => {
  const { client, calls } = clientReturning({ results: [], metadata: {} });
  await client.agents.dailyActivity({ start_date: "2026-01-01" });
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/agent/daily/activity");
  assertStrictEquals(r.search.get("start_date"), "2026-01-01");
});
