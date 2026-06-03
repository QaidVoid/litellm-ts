import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("evals.list GETs /v1/evals", async () => {
  const { client, calls } = clientReturning({ object: "list", data: [] });
  await client.evals.list();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/evals");
});

Deno.test("evals.retrieve GETs /v1/evals/{id}", async () => {
  const { client, calls } = clientReturning({ id: "ev-1", object: "eval" });
  await client.evals.retrieve("ev 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/evals/ev%201");
});

Deno.test("evals.delete DELETEs /v1/evals/{id}", async () => {
  const { client, calls } = clientReturning({ deleted: true });
  await client.evals.delete("ev-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/v1/evals/ev-1");
});
