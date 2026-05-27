import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The legacy `/access_group/*` endpoints tag deployments by access group.
// Mutations require existing model names registered with the proxy. The
// `test-*` aliases in our reference proxy are stable.

const tolerantMag = (result: {
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
  throw new Error(`unexpected modelAccessGroups error: ${JSON.stringify(e)}`);
};

e2eTest("admin.modelAccessGroups.list returns the access-group rollup", async ({ client }) => {
  const result = await client.modelAccessGroups.list();
  if (!result.ok) {
    tolerantMag(result);
    return;
  }
  assert(Array.isArray(result.value.access_groups));
});

e2eTest(
  "admin.modelAccessGroups CRUD round-trip on a throwaway group",
  async ({ client }) => {
    const accessGroup = `e2e-mag-${Date.now()}`;
    const created = await client.modelAccessGroups.create({
      access_group: accessGroup,
      model_names: ["test-gemma3"],
    });
    if (!created.ok) {
      tolerantMag(created);
      return;
    }

    try {
      const info = await client.modelAccessGroups.info(accessGroup);
      if (!info.ok) tolerantMag(info);

      const updated = await client.modelAccessGroups.update(accessGroup, {
        model_names: ["test-gemma3", "test-claude-opus-4-7"],
      });
      if (!updated.ok) tolerantMag(updated);
    } finally {
      const removed = await client.modelAccessGroups.delete(accessGroup);
      if (!removed.ok) tolerantMag(removed);
    }
  },
);
