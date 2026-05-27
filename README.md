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

| Namespace                | Endpoint                      | Notes                                                                                                                     |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `client.chat`            | `/v1/chat/completions`        | OpenAI shape. `create` + `createStream`. Tool- and vision-gated.                                                          |
| `client.messages`        | `/v1/messages`                | Anthropic shape. `create` + `createStream` + `countTokens`. Any model.                                                    |
| `client.responses`       | `/v1/responses`               | OpenAI Responses API. `create` + `createStream` + retrieve/cancel/etc.                                                    |
| `client.completions`     | `/v1/completions`             | Legacy text completion. `create` + `createStream`.                                                                        |
| `client.embeddings`      | `/v1/embeddings`              | Mode-gated to embedding models.                                                                                           |
| `client.images`          | `/v1/images/*`                | `generate`, `edit` (multipart). Mode-gated.                                                                               |
| `client.audio`           | `/v1/audio/*`                 | `transcribe` (multipart), `speak` (binary). Mode-gated.                                                                   |
| `client.rerank`          | `/v1/rerank`                  | Cohere shape. Mode-gated to rerank models.                                                                                |
| `client.moderation`      | `/v1/moderations`             | Mode-gated to moderation models.                                                                                          |
| `client.files`           | `/v1/files`, `/v1/files/{id}` | `create` (multipart), `list`, `retrieve`, `delete`, `content`.                                                            |
| `client.batches`         | `/v1/batches`                 | `create`, `retrieve`, `list`, `cancel`.                                                                                   |
| `client.fineTuning`      | `/v1/fine_tuning/jobs`        | `create`, `retrieve`, `list`, `cancel`, `events`.                                                                         |
| `client.vectorStores`    | `/v1/vector_stores`           | CRUD plus file attach / list / retrieve / delete / content.                                                               |
| `client.realtime`        | `wss:.../v1/realtime`         | WebSocket session. `connect` opens, yields typed server events.                                                           |
| `client.videos`          | `/v1/videos/*`                | `generate`, `list`, `retrieve`, `content`, `remix`, `edit`, `extend`, `createCharacter`, `retrieveCharacter`. Mode-gated. |
| `client.ocr`             | `/v1/ocr`                     | `process` (URL or file_id) and `processFile` (multipart). Mode-gated.                                                     |
| `client.rag`             | `/v1/rag/*`                   | `ingest` + `query`. Vector store backends: OpenAI, Bedrock, Vertex AI, S3 Vectors.                                        |
| `client.containers`      | `/v1/containers/*`            | OpenAI Containers API (`create`, `list`, `retrieve`, `delete`).                                                           |
| `client.evals`           | `/v1/evals/*`                 | OpenAI Evals API: eval CRUD + cancel; `runs` sub-namespace for run lifecycle.                                             |
| `client.agents`          | `/v1/agents/*`, `/v1/a2a/*`   | A2A agents API. CRUD, `agentCard`, `sendMessage`, `invoke`, `makePublic`.                                                 |
| `client.assistants`      | `/v1/assistants/*`            | OpenAI Assistants API: list, create, delete.                                                                              |
| `client.threads`         | `/v1/threads/*`               | OpenAI Threads API: create, retrieve, plus `messages` and `runs` sub-namespaces.                                          |
| `client.search`          | `/v1/search/*`                | Web search (`query`, `queryWith`) plus `tools` sub-namespace for search-tool admin.                                       |
| `client.googleGenai`     | `/v1beta/models/*`            | Native Google GenAI shape: `generateContent`, `streamGenerateContent`, `countTokens`, plus `agents` and `interactions`.   |
| `client.anthropicSkills` | `/v1/skills/*`                | Anthropic Skills API (beta). `create` (multipart), `list`, `retrieve`, `delete`.                                          |
| `client.utils`           | `/utils/*`                    | `tokenCounter`, `transformRequest`, `supportedOpenAIParams`, `testPoliciesAndGuardrails`.                                 |
| `client.public`          | `/public/*`                   | Anonymous discovery: model hub, agent hub, MCP hub, skill hub, providers, endpoints, cost map.                            |

### Proxy administration

| Namespace                      | Endpoints                                                   | Notes                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `client.health`                | `/health/*`                                                 | liveliness, readiness, services, sharedStatus, license, backlog, history, latest, testConnection.                          |
| `client.keys`                  | `/key/*`                                                    | Virtual key CRUD plus block, unblock, regenerate (by-path), reset_spend, aliases, bulk_update, health.                     |
| `client.proxyModels`           | `/model/*`, `/models/*`                                     | Live registry CRUD plus OpenAI-shape list/retrieve and metrics (regular, exceptions, slow, streaming, settings, cost map). |
| `client.teams`                 | `/team/*`                                                   | Team CRUD, member management, callbacks, permissions (per-team + bulk), daily activity, my-membership, available teams.    |
| `client.users`                 | `/user/*`                                                   | Internal user CRUD plus available roles, bulk_update, daily activity.                                                      |
| `client.organizations`         | `/organization/*`                                           | Organization CRUD plus member management + daily activity.                                                                 |
| `client.spend`                 | `/spend/*`                                                  | calculate, tags, logs (v1 + v2), spend by key, spend by user.                                                              |
| `client.budgets`               | `/budget/*`                                                 | Budget CRUD plus infoBatch + settings.                                                                                     |
| `client.callbacks`             | `/callbacks/*`                                              | List, update, health, configs.                                                                                             |
| `client.guardrails`            | `/guardrails/*`                                             | Full CRUD + submissions workflow + apply + custom-code testing + blocked-words validation + usage sub-namespace.           |
| `client.cache`                 | `/cache/*`                                                  | ping, flushAll, delete, get/update/test settings.                                                                          |
| `client.config`                | `/config/*`                                                 | Get, update, yaml, callback delete; fields/costDiscounts/costMargins/passThroughEndpoints sub-namespaces.                  |
| `client.customers`             | `/customer/*`                                               | End-user CRUD plus block / unblock / daily activity.                                                                       |
| `client.tags`                  | `/tag/*`                                                    | Tag CRUD; `analytics` sub-namespace for DAU/WAU/MAU + per-user activity + distinct + summary.                              |
| `client.fallbacks`             | `/fallback/*`                                               | Per-model fallback configuration (general, context_window, content_policy).                                                |
| `client.router`                | `/router/*`                                                 | Router field metadata and current setting reads.                                                                           |
| `client.accessGroups`          | `/v1/access_group/*`                                        | Unified access groups across models, MCP servers, and agents.                                                              |
| `client.modelAccessGroups`     | `/access_group/*`                                           | Legacy model-only access group CRUD.                                                                                       |
| `client.jwtMappings`           | `/jwt/key/mapping/*`                                        | JWT-claim-to-virtual-key mappings.                                                                                         |
| `client.compliance`            | `/compliance/*`                                             | EU AI Act and GDPR compliance checks on spend logs.                                                                        |
| `client.tools`                 | `/v1/tool/*`                                                | Tool registry and per-tool input/output policy administration.                                                             |
| `client.mcp`                   | `/v1/mcp/*`                                                 | MCP servers, toolsets, submissions workflow, discovery, user-credentials, programmatic OAuth (authorize, token, register). |
| `client.scim`                  | `/scim/v2/*`                                                | SCIM v2 Users + Groups CRUD (enterprise).                                                                                  |
| `client.credentials`           | `/credentials/*`                                            | Stored credential CRUD (create, list, getByName, getByModel, update, delete).                                              |
| `client.claudeCode`            | `/claude-code/*`                                            | Claude Code marketplace plugins (marketplace, register, list, get, enable, disable, delete).                               |
| `client.prompts`               | `/prompts/*`                                                | Prompt registry: CRUD with environments, versions, render (`test`), dotprompt → JSON converter.                            |
| `client.policies`              | `/policies/*`                                               | Policy engine: CRUD, version lifecycle, attachments + estimateImpact, resolve, testPipeline, compare.                      |
| `client.workflows`             | `/v1/workflows/*`                                           | Workflow runs with appended events and messages.                                                                           |
| `client.memory`                | `/v1/memory/*`                                              | KV store with create, list, get, upsert, delete plus per-user/per-team scoping.                                            |
| `client.spendConnectors`       | `/vantage/*`, `/cloudzero/*`                                | Vantage + CloudZero billing-connector administration (settings, init, dryRun, export, delete).                             |
| `client.globalSpend`           | `/global/spend/*`, `/global/activity/*`                     | Dashboard analytics: spend by key/model/team/tag/provider, activity, exceptions, cache hits, end users.                    |
| `client.policy`                | `/policy/*`                                                 | Policy template registry: list, info, test, validate, templates (+ enrich, suggest, stream).                               |
| `client.invitations`           | `/invitation/*`                                             | Invitation CRUD (new, info, update, delete).                                                                               |
| `client.vectorStoresAdmin`     | `/vector_store/*`                                           | Legacy proxy-side vector store admin (new, list, info, update, delete).                                                    |
| `client.maintenance`           | `/schedule/*`, `/reload/*`                                  | Triggered reloads and scheduled model-cost-map / anthropic-beta-headers refreshes.                                         |
| `client.allowedIps`            | `/get/allowed_ips`, `/add/allowed_ip`, `/delete/allowed_ip` | IP allowlist administration.                                                                                               |
| `client.alerting`              | `/alerting/settings`                                        | Alerting settings read.                                                                                                    |
| `client.adaptiveRouter`        | `/adaptive_router/state`                                    | Adaptive router state read.                                                                                                |
| `client.anthropicEventLogging` | `/api/event_logging/batch`                                  | Anthropic event-logging batch ingest.                                                                                      |

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
