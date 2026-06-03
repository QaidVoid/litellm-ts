import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("vectorStores.list GETs /v1/vector_stores", async () => {
  const { client, calls } = clientReturning({ object: "list", data: [] });
  await client.vectorStores.list();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/vector_stores");
});

Deno.test("vectorStores.retrieve GETs /v1/vector_stores/{id}", async () => {
  const { client, calls } = clientReturning({ id: "vs-1", object: "vector_store" });
  await client.vectorStores.retrieve("vs 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/vector_stores/vs%201");
});

Deno.test("vectorStores.delete DELETEs /v1/vector_stores/{id}", async () => {
  const { client, calls } = clientReturning({ id: "vs-1", deleted: true });
  await client.vectorStores.delete("vs-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/v1/vector_stores/vs-1");
});
