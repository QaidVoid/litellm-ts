/**
 * Anthropic-shape `/v1/messages` request. LiteLLM accepts any model here and
 * translates as needed.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-... \
 *   deno run --allow-net --allow-env examples/messages.ts
 */

import { createClient } from "../mod.ts";

const client = createClient({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "sk-litellm",
});

const result = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 256,
  system: "Be precise.",
  messages: [{ role: "user", content: "Define entropy in one sentence." }],
});

if (!result.ok) {
  console.error("error:", result.error);
  Deno.exit(1);
}

for (const block of result.value.content) {
  if (block.type === "text") console.log(block.text);
}
