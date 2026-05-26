/**
 * Function-calling round-trip. The SDK enforces at compile time that `tools`
 * may only be supplied with a model that declares `function_calling`.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-... \
 *   deno run --allow-net --allow-env examples/tool-calls.ts
 */

import type { ChatMessage } from "../mod.ts";
import { createClient } from "../mod.ts";

const client = createClient({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "sk-litellm",
});

const conversation: ChatMessage[] = [
  { role: "user", content: "What's the weather in San Francisco?" },
];

const first = await client.chat.create({
  model: "gpt-4o",
  messages: conversation,
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Lookup the current weather in a city.",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    },
  ],
});

if (!first.ok) {
  console.error("error:", first.error);
  Deno.exit(1);
}

const toolCall = first.value.choices[0]?.message.tool_calls?.[0];
if (toolCall === undefined) {
  console.log("Model declined to call a tool:", first.value.choices[0]?.message.content);
  Deno.exit(0);
}

console.log(`tool call: ${toolCall.function.name}(${toolCall.function.arguments})`);

conversation.push(
  { role: "assistant", content: null, tool_calls: [toolCall] },
  { role: "tool", tool_call_id: toolCall.id, content: '{"temperature_f": 62}' },
);

const second = await client.chat.create({
  model: "gpt-4o",
  messages: conversation,
});

if (!second.ok) {
  console.error("error:", second.error);
  Deno.exit(1);
}

console.log(second.value.choices[0]?.message.content);
