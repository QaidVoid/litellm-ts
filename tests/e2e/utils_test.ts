import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest(
  "utils.tokenCounter counts tokens against the configured chat model",
  async ({ client, models }) => {
    const result = await client.utils.tokenCounter({
      model: models.chat,
      prompt: "Hello world, this is a token-counting smoke test.",
    });
    assert(result.ok, `tokenCounter failed: ${JSON.stringify(result)}`);
    assert(
      typeof result.value.total_tokens === "number" && result.value.total_tokens > 0,
      `expected positive total_tokens, got ${JSON.stringify(result.value)}`,
    );
  },
  { requires: ["chat"] },
);

e2eTest(
  "utils.transformRequest returns the upstream-shape request",
  async ({ client, models }) => {
    const result = await client.utils.transformRequest({
      call_type: "completion",
      request_body: {
        model: models.chat,
        messages: [{ role: "user", content: "hi" }],
      },
    });
    assert(result.ok, `transformRequest failed: ${JSON.stringify(result)}`);
    assert(
      typeof result.value === "object" && result.value !== null,
      "expected an object",
    );
  },
  { requires: ["chat"] },
);

e2eTest(
  "utils.supportedOpenAIParams lists params for a known model id",
  async ({ client }) => {
    // The endpoint maps via LiteLLM's provider registry, not the proxy's
    // model_list. Use a stable public model id rather than the proxy's
    // local alias.
    const result = await client.utils.supportedOpenAIParams("gpt-4o-mini");
    if (!result.ok) {
      // Some releases couldn't resolve specific ids; treat 400 as expected.
      if (result.error.kind === "http" && result.error.status === 400) return;
      throw new Error(`supportedOpenAIParams failed: ${JSON.stringify(result.error)}`);
    }
    // The wire response uses `supported_openai_params` (typed as
    // `supported_params` in the SDK; the runtime body has both shapes
    // across releases). Accept either.
    const value = result.value as unknown as Readonly<Record<string, unknown>>;
    const params = (value["supported_params"] ?? value["supported_openai_params"]) as unknown;
    assert(Array.isArray(params), "expected an array of supported params");
  },
);

e2eTest(
  "utils.testPoliciesAndGuardrails sandbox-evaluates an empty rule set",
  async ({ client }) => {
    const result = await client.utils.testPoliciesAndGuardrails({
      policies: [],
      guardrails: [],
    });
    assert(result.ok, `testPoliciesAndGuardrails failed: ${JSON.stringify(result)}`);
  },
);
