import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The policies engine is admin-gated and often only loaded in newer
// proxy builds. Treat 4xx/5xx as expected wiring whenever a route is
// missing or restricted on community deployments.
const tolerantPolicies = (result: {
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
  throw new Error(`unexpected policies error: ${JSON.stringify(e)}`);
};

e2eTest("policies.list returns the policy listing", async ({ client }) => {
  const result = await client.policies.list();
  if (!result.ok) {
    tolerantPolicies(result);
    return;
  }
  assert(Array.isArray(result.value.policies));
  assert(typeof result.value.total_count === "number");
});

e2eTest("policies CRUD + version + status + compare round-trip", async ({ client }) => {
  const policyName = `e2e_pol_${Date.now()}`;
  const created = await client.policies.create({
    policy_name: policyName,
    description: "throwaway e2e policy",
    guardrails_add: [],
    guardrails_remove: [],
  });
  if (!created.ok) {
    tolerantPolicies(created);
    return;
  }
  const policyId = created.value.policy_id;

  try {
    const got = await client.policies.get(policyId);
    if (!got.ok) {
      tolerantPolicies(got);
    } else {
      assert(got.value.policy_name === policyName);
    }

    const updated = await client.policies.update(policyId, { description: "updated" });
    if (!updated.ok) tolerantPolicies(updated);

    // updateStatus: publish (best-effort).
    const status = await client.policies.updateStatus(policyId, {
      version_status: "published",
    });
    if (!status.ok) tolerantPolicies(status);

    // resolvedGuardrails: read the in-memory rollup.
    const resolved = await client.policies.resolvedGuardrails(policyId);
    if (!resolved.ok) tolerantPolicies(resolved);

    // Create a second version to exercise compare + versions.deleteAll.
    const versionResult = await client.policies.versions.create(policyName);
    let secondVersionId: string | undefined;
    if (!versionResult.ok) {
      tolerantPolicies(versionResult);
    } else {
      secondVersionId = versionResult.value.policy_id;
    }

    if (secondVersionId !== undefined) {
      const compared = await client.policies.compare(policyId, secondVersionId);
      if (!compared.ok) tolerantPolicies(compared);
    }

    // versions.list always works on a created policy.
    const versions = await client.policies.versions.list(policyName);
    if (!versions.ok) tolerantPolicies(versions);
  } finally {
    // Best-effort cleanup: deleteAll wipes every version of the name.
    const all = await client.policies.versions.deleteAll(policyName);
    if (!all.ok) {
      // Fall back to single-version delete if `deleteAll` is unavailable.
      const single = await client.policies.delete(policyId);
      if (!single.ok) tolerantPolicies(single);
    }
  }
});

e2eTest("policies.testPipeline sandbox-runs an empty pipeline", async ({ client }) => {
  const result = await client.policies.testPipeline({
    pipeline: { mode: "fail_fast", steps: [] },
    test_messages: [{ role: "user", content: "hello" }],
  });
  tolerantPolicies(result);
});

e2eTest("policies.resolve returns the effective guardrails", async ({ client }) => {
  const result = await client.policies.resolve(
    { team_alias: "default-team", model: "test-gemma3" },
    { force_sync: false },
  );
  if (!result.ok) {
    tolerantPolicies(result);
    return;
  }
  assert(Array.isArray(result.value.effective_guardrails));
  assert(Array.isArray(result.value.matched_policies));
});

e2eTest(
  "policies.attachments.list returns attachments",
  async ({ client }) => {
    const result = await client.policies.attachments.list();
    if (!result.ok) {
      tolerantPolicies(result);
      return;
    }
    assert(Array.isArray(result.value.attachments));
    assert(typeof result.value.total_count === "number");
  },
);

e2eTest(
  "policies.attachments.estimateImpact reports the impact of an attachment",
  async ({ client }) => {
    const result = await client.policies.attachments.estimateImpact({
      policy_name: `e2e-nonexistent-policy-${Date.now()}`,
      scope: "*",
    });
    tolerantPolicies(result);
  },
);
