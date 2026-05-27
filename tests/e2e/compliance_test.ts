import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

const sampleRequest = {
  request_id: `e2e-compliance-${Date.now()}`,
  user_id: "e2e-user",
  model: "test-gemma3",
  timestamp: new Date().toISOString(),
  guardrail_information: [],
};

e2eTest("admin.compliance.euAiAct evaluates a sample request", async ({ client }) => {
  const result = await client.compliance.euAiAct(sampleRequest);
  if (!result.ok) {
    // The endpoint may be gated to enterprise on some deployments.
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`euAiAct failed: ${JSON.stringify(result.error)}`);
  }
  assert(typeof result.value.compliant === "boolean", "expected compliant boolean");
  assert(result.value.regulation === "EU AI Act", `unexpected regulation: ${result.value.regulation}`);
  assert(Array.isArray(result.value.checks), "expected checks array");
});

e2eTest("admin.compliance.gdpr evaluates a sample request", async ({ client }) => {
  const result = await client.compliance.gdpr(sampleRequest);
  if (!result.ok) {
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`gdpr failed: ${JSON.stringify(result.error)}`);
  }
  assert(typeof result.value.compliant === "boolean", "expected compliant boolean");
  assert(Array.isArray(result.value.checks), "expected checks array");
});
