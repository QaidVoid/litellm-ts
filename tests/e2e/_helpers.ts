/**
 * Shared helpers for the e2e suite.
 *
 * Tests talk to a real LiteLLM proxy and skip when the proxy is unreachable
 * or when a required model isn't configured. Model ids are read from
 * environment variables so this suite can run against any proxy without
 * carrying provider-specific assumptions:
 *
 *   LITELLM_BASE_URL          (default `http://localhost:4000`)
 *   LITELLM_API_KEY           (default `sk-1234`)
 *   LITELLM_E2E_CHAT_MODEL    primary chat model id
 *   LITELLM_E2E_CHAT_MODEL_ALT optional second chat model (different backend)
 *   LITELLM_E2E_EMBED_MODEL   primary embedding model id
 *   LITELLM_E2E_EMBED_MODEL_ALT optional second embedding model
 *   LITELLM_E2E_REASONING_MODEL optional reasoning-style chat model
 *
 * Tests that require an unset model are marked ignored rather than failed.
 * See `README.md` for the model surface each test exercises.
 */

import { type Client, createClient, customModel } from "../../mod.ts";

const baseUrl = Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000";
const apiKey = Deno.env.get("LITELLM_API_KEY") ?? "sk-1234";

/** Build a client bound to the configured proxy. `maxRetries: 0` keeps test failures fast. */
export const e2eClient = (): Client => createClient({ baseUrl, apiKey, maxRetries: 0 });

/** Environment variable each model handle resolves from. */
const MODEL_ENV: Readonly<Record<ModelHandle, string>> = {
  chat: "LITELLM_E2E_CHAT_MODEL",
  chatAlt: "LITELLM_E2E_CHAT_MODEL_ALT",
  embed: "LITELLM_E2E_EMBED_MODEL",
  embedAlt: "LITELLM_E2E_EMBED_MODEL_ALT",
  reasoning: "LITELLM_E2E_REASONING_MODEL",
};

const resolveModel = (envVar: string): ReturnType<typeof customModel> | undefined => {
  const v = Deno.env.get(envVar);
  if (v === undefined || v.length === 0) return undefined;
  return customModel(v);
};

/** Test-model handle names. */
export type ModelHandle = "chat" | "chatAlt" | "embed" | "embedAlt" | "reasoning";

/**
 * Generic test-model handles. Each value is the `customModel(...)`-wrapped
 * id from the corresponding environment variable, or `undefined` when
 * unset. Tests reference a handle and declare `requires` on `e2eTest` so
 * unconfigured models surface as skipped rather than failures.
 */
export const MODELS: Readonly<Record<ModelHandle, ReturnType<typeof customModel> | undefined>> = {
  chat: resolveModel(MODEL_ENV.chat),
  chatAlt: resolveModel(MODEL_ENV.chatAlt),
  embed: resolveModel(MODEL_ENV.embed),
  embedAlt: resolveModel(MODEL_ENV.embedAlt),
  reasoning: resolveModel(MODEL_ENV.reasoning),
};

/**
 * Probe `/health/liveliness`. Memoized for the lifetime of the process so
 * the cost is paid once per `deno test` invocation regardless of how many
 * test files import the helpers.
 */
let reachable: boolean | undefined;
export const proxyReachable = async (): Promise<boolean> => {
  if (reachable !== undefined) return reachable;
  try {
    const res = await fetch(`${baseUrl}/health/liveliness`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(2000),
    });
    // Drain the body so Deno's leak sanitizer doesn't flag this as a leak
    // when the first test that touches `proxyReachable()` runs.
    await res.body?.cancel();
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  return reachable;
};

/** Optional gating for `e2eTest`. `requires` skips when the named model is unset. */
export interface E2eTestOptions {
  readonly requires?: readonly ModelHandle[];
}

/**
 * Wrap `Deno.test` with runtime reachability + model-availability gates.
 * The test is registered either way so the suite output still surfaces
 * what *would* have run.
 */
export const e2eTest = (
  name: string,
  fn: (ctx: { client: Client; baseUrl: string; apiKey: string }) => Promise<void> | void,
  opts: E2eTestOptions = {},
): void => {
  Deno.test({
    name,
    async fn(t) {
      if (!await proxyReachable()) {
        t.step({
          name: `skipped: proxy unreachable at ${baseUrl}`,
          fn: () => {},
          ignore: true,
        });
        return;
      }
      const missing = (opts.requires ?? []).filter((h) => MODELS[h] === undefined);
      if (missing.length > 0) {
        t.step({
          name: `skipped: missing model env: ${missing.map((h) => MODEL_ENV[h]).join(", ")}`,
          fn: () => {},
          ignore: true,
        });
        return;
      }
      await fn({ client: e2eClient(), baseUrl, apiKey });
    },
  });
};
