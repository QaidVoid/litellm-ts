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

/** Test-model handle names. */
export type ModelHandle = "chat" | "chatAlt" | "embed" | "embedAlt" | "reasoning";

/** Environment variable each model handle resolves from. */
const MODEL_ENV: Readonly<Record<ModelHandle, string>> = {
  chat: "LITELLM_E2E_CHAT_MODEL",
  chatAlt: "LITELLM_E2E_CHAT_MODEL_ALT",
  embed: "LITELLM_E2E_EMBED_MODEL",
  embedAlt: "LITELLM_E2E_EMBED_MODEL_ALT",
  reasoning: "LITELLM_E2E_REASONING_MODEL",
};

type ModelValue = ReturnType<typeof customModel>;

const resolveModel = (envVar: string): ModelValue | undefined => {
  const v = Deno.env.get(envVar);
  if (v === undefined || v.length === 0) return undefined;
  return customModel(v);
};

/**
 * Generic test-model handles. Each value is the `customModel(...)`-wrapped
 * id from the corresponding environment variable, or `undefined` when
 * unset. Tests usually reference a handle through the narrowed `models`
 * object on the test context (so non-null assertions aren't needed) and
 * declare `requires` on `e2eTest` so unconfigured models surface as
 * skipped rather than failures.
 */
export const MODELS: Readonly<Record<ModelHandle, ModelValue | undefined>> = {
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

/**
 * Models bag exposed on the test context. Handles declared in `requires`
 * narrow to a defined `ModelValue`; everything else stays optional. Tests
 * can use either the context-narrowed `models.chat` (preferred) or the
 * module-level `MODELS.chat` when they don't gate on a particular handle.
 */
export type E2eModels<R extends readonly ModelHandle[]> =
  & { readonly [K in R[number]]: ModelValue }
  & { readonly [K in Exclude<ModelHandle, R[number]>]: ModelValue | undefined };

/** Optional gating for `e2eTest`. `requires` skips when the named model is unset. */
export interface E2eTestOptions<R extends readonly ModelHandle[] = readonly ModelHandle[]> {
  readonly requires?: R;
}

export interface E2eTestContext<R extends readonly ModelHandle[]> {
  readonly client: Client;
  readonly baseUrl: string;
  readonly apiKey: string;
  /** Model handles, narrowed to `ModelValue` for any handle listed in `requires`. */
  readonly models: E2eModels<R>;
}

/**
 * Wrap `Deno.test` with runtime reachability + model-availability gates.
 * The test is registered either way so the suite output still surfaces
 * what *would* have run.
 *
 * `requires` is keyed on `ModelHandle`. Listed handles narrow on the
 * `models` ctx field so the test body can use `models.chat` directly
 * without a non-null assertion.
 */
export const e2eTest = <const R extends readonly ModelHandle[] = []>(
  name: string,
  fn: (ctx: E2eTestContext<R>) => Promise<void> | void,
  opts: E2eTestOptions<R> = {},
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
      await fn({
        client: e2eClient(),
        baseUrl,
        apiKey,
        models: MODELS as unknown as E2eModels<R>,
      });
    },
  });
};
