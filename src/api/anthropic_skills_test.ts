import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("anthropicSkills.list GETs /v1/skills", async () => {
  const { client, calls } = clientReturning({ data: [] });
  await client.anthropicSkills.list();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/skills");
});

Deno.test("anthropicSkills.retrieve GETs /v1/skills/{id}", async () => {
  const { client, calls } = clientReturning({ id: "sk-1" });
  await client.anthropicSkills.retrieve("sk 1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/v1/skills/sk%201");
});

Deno.test("anthropicSkills.delete DELETEs /v1/skills/{id}", async () => {
  const { client, calls } = clientReturning({});
  await client.anthropicSkills.delete("sk-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/v1/skills/sk-1");
});
