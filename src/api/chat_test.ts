import { assert, assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("chat.create POSTs to /v1/chat/completions with the request body", async () => {
  const { client, calls } = clientReturning({ id: "c-1", object: "chat.completion", choices: [] });
  const res = await client.chat.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
  });
  assert(res.ok);
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/v1/chat/completions");
  assertStrictEquals(r.body.model, "gpt-4o");
  assertStrictEquals(r.body.messages[0].content, "hi");
});

Deno.test("chat.create forwards optional fields", async () => {
  const { client, calls } = clientReturning({ id: "c-2", object: "chat.completion", choices: [] });
  await client.chat.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
    temperature: 0,
    max_tokens: 16,
  });
  const r = recorded(calls);
  assertStrictEquals(r.body.temperature, 0);
  assertStrictEquals(r.body.max_tokens, 16);
});
