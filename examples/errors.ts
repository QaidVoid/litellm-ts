/**
 * Demonstrates exhaustive `switch` over `ApiError["kind"]`. The compiler
 * verifies every case is handled and refuses to compile when a new variant is
 * added without a corresponding branch.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-... \
 *   deno run --allow-net --allow-env examples/errors.ts
 */

import type { ApiError } from "../mod.ts";
import { createClient } from "../mod.ts";

const describe = (e: ApiError): string => {
  switch (e.kind) {
    case "network":
      return `network: ${e.message}`;
    case "http":
      return `http ${e.status} ${e.statusText}`;
    case "validation":
      return `validation at ${e.path}: expected ${e.expected}`;
    case "stream":
      return `stream ${e.reason}`;
    case "auth": {
      const status = e.status === undefined ? "" : ` (${e.status})`;
      const detail = e.body === undefined ? "" : `: ${JSON.stringify(e.body)}`;
      return `auth ${e.reason}${status}${detail}`;
    }
    case "timeout":
      return `timeout after ${e.ms}ms`;
    case "rate-limited":
      return e.retryAfterMs === undefined
        ? "rate limited (no retry hint)"
        : `rate limited, retry after ${e.retryAfterMs}ms`;
  }
};

const client = createClient({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "wrong-key",
  maxRetries: 0,
});

const result = await client.chat.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "hi" }],
});

if (result.ok) {
  console.log("ok:", result.value.choices[0]?.message.content);
} else {
  console.log("error:", describe(result.error));
}
