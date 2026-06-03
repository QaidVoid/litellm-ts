import { assert, assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("responses.create POSTs to /v1/responses", async () => {
  const { client, calls } = clientReturning({ id: "resp-1", object: "response" });
  const res = await client.responses.create({ model: "gpt-4o", input: "hi" });
  assert(res.ok);
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/v1/responses");
  assertStrictEquals(r.body.input, "hi");
});

Deno.test("responses.retrieve GETs /v1/responses/{id}", async () => {
  const { client, calls } = clientReturning({ id: "resp-1", object: "response" });
  await client.responses.retrieve("resp 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/responses/resp%201");
});

Deno.test("responses.cancel POSTs to /v1/responses/{id}/cancel", async () => {
  const { client, calls } = clientReturning({ id: "resp-1", object: "response" });
  await client.responses.cancel("resp-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/v1/responses/resp-1/cancel");
});

Deno.test("responses.delete DELETEs /v1/responses/{id}", async () => {
  const { client, calls } = clientReturning({ id: "resp-1", object: "response", deleted: true });
  await client.responses.delete("resp-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/v1/responses/resp-1");
});

Deno.test("responses.listInputItems GETs the input_items sub-resource with query", async () => {
  const { client, calls } = clientReturning({ object: "list", data: [], has_more: false });
  await client.responses.listInputItems("resp-1", { limit: 5 });
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/responses/resp-1/input_items");
  assertStrictEquals(r.search.get("limit"), "5");
});

Deno.test("responses.compact POSTs to /v1/responses/compact", async () => {
  const { client, calls } = clientReturning({ object: "response.compaction" });
  await client.responses.compact({ model: "gpt-4o", input: "hi" });
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/v1/responses/compact");
});
