import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("claudeCode.marketplace GETs /claude-code/marketplace.json", async () => {
  const { client, calls } = clientReturning({});
  await client.claudeCode.marketplace();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/claude-code/marketplace.json");
});

Deno.test("claudeCode.list GETs /claude-code/plugins", async () => {
  const { client, calls } = clientReturning({ plugins: [] });
  await client.claudeCode.list();
  assertStrictEquals(recorded(calls).pathname, "/claude-code/plugins");
});

Deno.test("claudeCode.get GETs /claude-code/plugins/{name}", async () => {
  const { client, calls } = clientReturning({});
  await client.claudeCode.get("my plugin");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/claude-code/plugins/my%20plugin");
});

Deno.test("claudeCode.delete DELETEs /claude-code/plugins/{name}", async () => {
  const { client, calls } = clientReturning({});
  await client.claudeCode.delete("p-1");
  const r = recorded(calls);
  assertStrictEquals(r.method, "DELETE");
  assertStrictEquals(r.pathname, "/claude-code/plugins/p-1");
});
