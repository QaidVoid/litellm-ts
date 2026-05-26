/**
 * Multi-modal chat with an image_url content part.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-... \
 *   deno run --allow-net --allow-env examples/vision.ts
 */

import { createClient } from "../mod.ts";

const client = createClient({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "sk-litellm",
});

const result = await client.chat.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        {
          type: "image_url",
          image_url: {
            url:
              "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
            detail: "low",
          },
        },
      ],
    },
  ],
});

if (!result.ok) {
  console.error("error:", result.error);
  Deno.exit(1);
}

console.log(result.value.choices[0]?.message.content);
