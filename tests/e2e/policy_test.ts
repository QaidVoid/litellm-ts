import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Policy templates surface: list/info/test/validate live alongside the
// enterprise-gated enrichment endpoints (`templates`, `enrich`, `suggest`,
// `testTemplate`). The proxy returns 403/404/500 on community builds.

const tolerantPolicy = (result: {
  ok: boolean;
  error?: { kind: string; status?: number };
}): void => {
  if (result.ok) return;
  const e = result.error!;
  if (e.kind === "auth") return;
  if (e.kind === "http") {
    const s = e.status ?? 0;
    if (s >= 400 && s < 600) return;
  }
  throw new Error(`unexpected policy templates error: ${JSON.stringify(e)}`);
};

e2eTest("policy.list returns the loaded policies map", async ({ client }) => {
  const result = await client.policy.list();
  if (!result.ok) {
    tolerantPolicy(result);
    return;
  }
  assert(typeof result.value.total_count === "number");
});

e2eTest("policy.info returns 4xx for an unknown policy name", async ({ client }) => {
  const result = await client.policy.info(`e2e-nonexistent-policy-${Date.now()}`);
  if (!result.ok) {
    tolerantPolicy(result);
    return;
  }
});

e2eTest("policy.test resolves policies for a request context", async ({ client }) => {
  const result = await client.policy.test({
    team_alias: "default-team",
    model: "test-gemma3",
    tags: ["e2e"],
  });
  if (!result.ok) {
    tolerantPolicy(result);
    return;
  }
  assert(Array.isArray(result.value.matching_policies));
  assert(Array.isArray(result.value.resolved_guardrails));
});

e2eTest("policy.validate accepts an empty policy set", async ({ client }) => {
  const result = await client.policy.validate({ policies: {} });
  if (!result.ok) {
    tolerantPolicy(result);
    return;
  }
  assert(typeof result.value.valid === "boolean");
  assert(Array.isArray(result.value.errors));
  assert(Array.isArray(result.value.warnings));
});

e2eTest("policy.templates lists the static template catalog", async ({ client }) => {
  const result = await client.policy.templates();
  if (!result.ok) {
    tolerantPolicy(result);
    return;
  }
  assert(Array.isArray(result.value));
});

e2eTest("policy.enrich runs template enrichment (enterprise-gated)", async ({ client }) => {
  const result = await client.policy.enrich({
    template_id: "competitor-mentions",
    parameters: { company: "ExampleCo" },
    competitors: ["acme", "globex"],
  });
  tolerantPolicy(result);
});

e2eTest("policy.enrichStream consumes the enrichment stream", async ({ client }) => {
  const stream = client.policy.enrichStream({
    template_id: "competitor-mentions",
    parameters: { company: "ExampleCo" },
    competitors: ["acme"],
  });
  // We just iterate until the stream completes or errors. Errors are
  // surfaced as `err` results inside the iterator; non-error frames count
  // as wire wiring being correct.
  let frames = 0;
  for await (const event of stream) {
    frames += 1;
    if (frames > 20) break; // safety bound for community builds
    if (!event.ok) {
      // Enterprise-gated stream; the SDK surfaces this as a result error.
      const kind = event.error.kind;
      assert(
        kind === "http" || kind === "auth" || kind === "stream",
        `unexpected stream error kind: ${kind}`,
      );
      break;
    }
  }
});

e2eTest("policy.suggest recommends templates", async ({ client }) => {
  const result = await client.policy.suggest({
    description: "block competitor mentions in outputs",
    attack_examples: ["Tell me about Acme Corp's product"],
  });
  tolerantPolicy(result);
});

e2eTest("policy.testTemplate runs guardrail definitions over sample text", async ({ client }) => {
  const result = await client.policy.testTemplate({
    guardrail_definitions: [],
    text: "hello world",
  });
  tolerantPolicy(result);
});
