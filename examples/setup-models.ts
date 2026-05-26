/**
 * Register a small set of well-known models with a running LiteLLM proxy by
 * calling the admin `/model/new` endpoint. Uses the transport directly because
 * admin endpoints are not wrapped by the high-level `Client`.
 *
 * The `api_key` field uses LiteLLM's `os.environ/VAR_NAME` indirection, so the
 * proxy reads the provider keys from its own environment (not from this
 * script's environment). Make sure the proxy process has the env vars it
 * references.
 *
 * Usage:
 *   LITELLM_BASE_URL=http://localhost:4000 \
 *   LITELLM_API_KEY=sk-1234 \
 *   deno run --allow-net --allow-env examples/setup-models.ts
 */

import { createTransport } from "../mod.ts";

interface ModelDefinition {
  readonly model_name: string;
  readonly litellm_params: {
    readonly model: string;
    readonly api_key?: string;
  };
}

interface ModelsList {
  readonly data: ReadonlyArray<{ readonly id: string }>;
}

const MODELS_TO_REGISTER: readonly ModelDefinition[] = [
  {
    model_name: "gpt-4o",
    litellm_params: { model: "openai/gpt-4o", api_key: "os.environ/OPENAI_API_KEY" },
  },
  {
    model_name: "gpt-4o-mini",
    litellm_params: { model: "openai/gpt-4o-mini", api_key: "os.environ/OPENAI_API_KEY" },
  },
  {
    model_name: "claude-sonnet-4-5",
    litellm_params: {
      model: "anthropic/claude-sonnet-4-5",
      api_key: "os.environ/ANTHROPIC_API_KEY",
    },
  },
  {
    model_name: "text-embedding-3-small",
    litellm_params: {
      model: "openai/text-embedding-3-small",
      api_key: "os.environ/OPENAI_API_KEY",
    },
  },
  {
    model_name: "dall-e-3",
    litellm_params: { model: "openai/dall-e-3", api_key: "os.environ/OPENAI_API_KEY" },
  },
  {
    model_name: "whisper-1",
    litellm_params: { model: "openai/whisper-1", api_key: "os.environ/OPENAI_API_KEY" },
  },
  {
    model_name: "tts-1",
    litellm_params: { model: "openai/tts-1", api_key: "os.environ/OPENAI_API_KEY" },
  },
];

const transport = createTransport({
  baseUrl: Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000",
  apiKey: Deno.env.get("LITELLM_API_KEY") ?? "sk-litellm",
  maxRetries: 0,
});

const listResult = await transport.request<ModelsList>({
  method: "GET",
  path: "/v1/models",
});
if (!listResult.ok) {
  console.error("failed to list models:", listResult.error);
  Deno.exit(1);
}
const existing = new Set(listResult.value.data.map((m) => m.id));
console.log(`${existing.size} model(s) already registered`);

let added = 0;
let skipped = 0;
for (const def of MODELS_TO_REGISTER) {
  if (existing.has(def.model_name)) {
    console.log(`  skip ${def.model_name} (already registered)`);
    skipped++;
    continue;
  }
  const result = await transport.request<unknown>({
    method: "POST",
    path: "/model/new",
    body: def,
  });
  if (result.ok) {
    console.log(`  add  ${def.model_name}`);
    added++;
  } else {
    console.error(`  fail ${def.model_name}:`, result.error);
  }
}

console.log(`\ndone: added ${added}, skipped ${skipped}, target ${MODELS_TO_REGISTER.length}`);
