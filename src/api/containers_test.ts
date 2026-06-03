import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("containers.list GETs /v1/containers", async () => {
  const { client, calls } = clientReturning({ object: "list", data: [] });
  await client.containers.list();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/containers");
});

Deno.test("containers.retrieve GETs /v1/containers/{id}", async () => {
  const { client, calls } = clientReturning({ id: "c-1", object: "container" });
  await client.containers.retrieve("c 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/containers/c%201");
});

Deno.test("containers.delete DELETEs /v1/containers/{id}", async () => {
  const { client, calls } = clientReturning({});
  await client.containers.delete("c-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/v1/containers/c-1");
});

Deno.test("containers.files.list GETs the files sub-resource", async () => {
  const { client, calls } = clientReturning({ object: "list", data: [] });
  await client.containers.files.list("c-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/containers/c-1/files");
});
