# @qaidvoid/litellm

A type-safe TypeScript SDK for [LiteLLM], the LLM proxy and gateway.

- Literal model union over 2,700 known models, with capability and mode metadata baked in at build time.
- Compile-time gating: `tools` are rejected on non-function-calling models. Embeddings, images, and audio endpoints constrain `model` to the matching mode.
- No throws across the public boundary. Every call returns `Promise<Result<T, ApiError>>` with a discriminated error union you can `switch` over exhaustively.
- Streaming surfaces a per-frame `Result`. Bad frames don't poison the iterator.
- Deno first, published to JSR. An npm artifact via [dnt] for Node and Bun.
- Zero runtime dependencies beyond `@std/assert` (test-only) and `@std/testing`.

[LiteLLM]: https://github.com/BerriAI/litellm
[dnt]: https://github.com/denoland/dnt

## Install

```bash
deno add jsr:@qaidvoid/litellm
```

For Node or Bun, install the published npm package (built with dnt):

```bash
npm install @qaidvoid/litellm
```

## Quickstart

```ts
import { createClient } from "@qaidvoid/litellm";

const client = createClient({
  baseUrl: "http://localhost:4000",
  apiKey: "sk-...",
});

const result = await client.chat.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

if (result.ok) {
  console.log(result.value.choices[0]?.message.content);
} else {
  console.error(result.error);
}
```

## Streaming

```ts
const stream = client.chat.createStream({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Stream me a haiku." }],
});

for await (const chunk of stream) {
  if (!chunk.ok) {
    console.error(chunk.error);
    break;
  }
  const delta = chunk.value.choices[0]?.delta.content;
  if (delta) Deno.stdout.writeSync(new TextEncoder().encode(delta));
}
```

## Error handling

Errors are a discriminated union with a `kind` tag. The compiler enforces every variant is handled:

```ts
import type { ApiError } from "@qaidvoid/litellm";

const handle = (e: ApiError) => {
  switch (e.kind) {
    case "network":
      return `network failed: ${e.message}`;
    case "http":
      return `http ${e.status}`;
    case "validation":
      return `bad shape at ${e.path}`;
    case "stream":
      return `stream ${e.reason}`;
    case "auth":
      return `auth ${e.reason}`;
    case "timeout":
      return `timed out after ${e.ms}ms`;
    case "rate-limited":
      return `slow down (${e.retryAfterMs ?? "?"}ms)`;
  }
};
```

## Capability gating

`tools` only appears on `chat.create` when the model declares `function_calling`. Misuse fails to typecheck:

```ts
// OK. gpt-4o supports function_calling.
await client.chat.create({
  model: "gpt-4o",
  messages: [...],
  tools: [{ type: "function", function: { name: "lookup", parameters: {} } }],
});

// Type error. text-embedding-3-small does not declare function_calling, so
// `tools` is not in the request type when this model is chosen.
await client.chat.create({
  model: "text-embedding-3-small",
  messages: [...],
  tools: [...],
});
```

Mode narrowing applies on the other endpoints:

```ts
// OK.
await client.embeddings.create({ model: "text-embedding-3-small", input: "hi" });

// Type error. gpt-4o is a chat model, not an embedding model.
await client.embeddings.create({ model: "gpt-4o", input: "hi" });
```

## Endpoints

### LLM and content endpoints

| Namespace             | Endpoint                      | Notes                                                                  |
| --------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `client.chat`         | `/v1/chat/completions`        | OpenAI shape. `create` + `createStream`. Tool- and vision-gated.       |
| `client.messages`     | `/v1/messages`                | Anthropic shape. `create` + `createStream`. Any model.                 |
| `client.responses`    | `/v1/responses`               | OpenAI Responses API. `create` + `createStream` + retrieve/cancel/etc. |
| `client.completions`  | `/v1/completions`             | Legacy text completion. `create` + `createStream`.                     |
| `client.embeddings`   | `/v1/embeddings`              | Mode-gated to embedding models.                                        |
| `client.images`       | `/v1/images/*`                | `generate`, `edit` (multipart). Mode-gated.                            |
| `client.audio`        | `/v1/audio/*`                 | `transcribe` (multipart), `speak` (binary). Mode-gated.                |
| `client.rerank`       | `/v1/rerank`                  | Cohere shape. Mode-gated to rerank models.                             |
| `client.moderation`   | `/v1/moderations`             | Mode-gated to moderation models.                                       |
| `client.files`        | `/v1/files`, `/v1/files/{id}` | `create` (multipart), `list`, `retrieve`, `delete`, `content`.         |
| `client.batches`      | `/v1/batches`                 | `create`, `retrieve`, `list`, `cancel`.                                |
| `client.fineTuning`   | `/v1/fine_tuning/jobs`        | `create`, `retrieve`, `list`, `cancel`, `events`.                      |
| `client.vectorStores` | `/v1/vector_stores`           | CRUD plus file attach / list / retrieve / delete.                      |

### Proxy administration

| Namespace            | Endpoints   | Notes                                                                |
| -------------------- | ----------- | -------------------------------------------------------------------- |
| `client.health`      | `/health/*` | `liveliness`, `readiness`, `readinessDetails`, `testConnection`.     |
| `client.keys`        | `/key/*`    | Virtual key CRUD plus `block` / `unblock` / `regenerate` / `health`. |
| `client.proxyModels` | `/model/*`  | Live registry: register, retrieve, list, update, delete.             |
| `client.teams`       | `/team/*`   | Team CRUD plus member and model management.                          |
| `client.users`       | `/user/*`   | Internal user CRUD.                                                  |
| `client.spend`       | `/spend/*`  | `calculate`, `tags`, `logs`.                                         |
| `client.budgets`     | `/budget/*` | Budget CRUD.                                                         |

### Provider passthroughs (native upstream shape)

| Namespace           | Prefix        |
| ------------------- | ------------- |
| `client.anthropic`  | `/anthropic`  |
| `client.openai`     | `/openai`     |
| `client.gemini`     | `/gemini`     |
| `client.vertexAi`   | `/vertex-ai`  |
| `client.cohere`     | `/cohere`     |
| `client.mistral`    | `/mistral`    |
| `client.assemblyai` | `/assemblyai` |
| `client.azure`      | `/azure`      |
| `client.bedrock`    | `/bedrock`    |

## Lower layers

The client builds on a small set of public primitives:

- `createTransport(config)`: typed fetch wrapper with retries, timeouts, and `ApiError` mapping. Exposes `request<T>`, `stream`, and `fetchRaw`.
- `parseSSE(stream)`: minimal SSE parser yielding `AsyncIterable<SSEEvent>`.
- `Result<T, E>` with `ok`, `err`, `map`, `mapErr`, `andThen`, `match`, `tryAsync`, `trySync`.
- `MODELS` const, `ModelsWithCapability<C>`, `ModelsWithMode<M>` for runtime lookup and compile-time narrowing.

## Examples

Runnable examples in [`examples/`](./examples/):

```bash
LITELLM_BASE_URL=http://localhost:4000 \
LITELLM_API_KEY=sk-... \
deno run --allow-net --allow-env examples/quickstart.ts
```

## Contributing

Project conventions live in [`AGENTS.md`](./AGENTS.md). Run `deno task check` before sending a change.

## License

MIT.
