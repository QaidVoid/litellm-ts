/**
 * Streaming chat completion. Writes content deltas to stdout as they arrive.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-... \
 *   deno run --allow-net --allow-env examples/streaming.ts
 */

import { createClient } from "../mod.ts";

const client = createClient({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "sk-litellm",
});

const stream = client.chat.createStream({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Count to five." }],
});

const encoder = new TextEncoder();
for await (const chunk of stream) {
  if (!chunk.ok) {
    console.error("stream error:", chunk.error);
    break;
  }
  const delta = chunk.value.choices[0]?.delta.content;
  if (delta) await Deno.stdout.write(encoder.encode(delta));
}
await Deno.stdout.write(encoder.encode("\n"));
