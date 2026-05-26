/**
 * Minimal non-streaming chat completion against a local LiteLLM proxy.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-... \
 *   deno run --allow-net --allow-env examples/quickstart.ts
 */

import { createClient } from "../mod.ts";

const client = createClient({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "sk-litellm",
});

const result = await client.chat.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are concise." },
    { role: "user", content: "Say hello in one word." },
  ],
});

if (!result.ok) {
  console.error("error:", result.error);
  Deno.exit(1);
}

const choice = result.value.choices[0];
console.log(choice?.message.content);
