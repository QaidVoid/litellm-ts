import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("utils.tokenCounter POSTs to /utils/token_counter", async () => {
  const { client, calls } = clientReturning({ total_tokens: 3 });
  await client.utils.tokenCounter({ model: "gpt-4o", prompt: "hi" });
  const r = recorded(calls);
  assertStrictEquals(r.method, "POST");
  assertStrictEquals(r.pathname, "/utils/token_counter");
  assertStrictEquals(r.body.model, "gpt-4o");
});

Deno.test("utils.supportedOpenAIParams GETs /utils/supported_openai_params", async () => {
  const { client, calls } = clientReturning({ supported_params: [] });
  await client.utils.supportedOpenAIParams("gpt-4o");
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/utils/supported_openai_params");
});
