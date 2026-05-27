import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.guardrails CRUD round-trip", async ({ client }) => {
  const guardrailName = `e2e-guardrail-${Date.now()}`;

  const created = await client.guardrails.create({
    guardrail: {
      guardrail_name: guardrailName,
      litellm_params: {
        guardrail: "presidio",
        mode: "pre_call",
      },
      guardrail_info: { purpose: "e2e" },
    },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const guardrailId = created.value.guardrail_id;
  assert(typeof guardrailId === "string" && guardrailId.length > 0, "expected guardrail_id");

  try {
    // Get round-trips the name.
    const got = await client.guardrails.get(guardrailId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.guardrail_name, guardrailName);

    // ListV2 includes DB-stored guardrails (the legacy `list` only returns
    // ones declared in config.yaml).
    const listed = await client.guardrails.listV2();
    assert(listed.ok, `listV2 failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.guardrails.some((g) => g.guardrail_name === guardrailName),
      "guardrail missing from listV2",
    );

    // Patch mutates the metadata bag.
    const patched = await client.guardrails.patch(guardrailId, {
      guardrail_info: { purpose: "e2e-updated" },
    });
    assert(patched.ok, `patch failed: ${JSON.stringify(patched)}`);
  } finally {
    const deleted = await client.guardrails.delete(guardrailId);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.guardrails.list returns the configured guardrail catalog", async ({ client }) => {
  const result = await client.guardrails.list();
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.guardrails));
});
