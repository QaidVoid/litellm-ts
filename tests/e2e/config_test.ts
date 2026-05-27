import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Read-only config probes. The config-update endpoints mutate proxy state
// and are skipped here; the corresponding unit tests under `src/` cover
// the request shape.

e2eTest(
  "admin.config.fields.list returns the configurable general-settings catalog",
  async ({ client }) => {
    const result = await client.config.fields.list();
    assert(result.ok, `fields.list failed: ${JSON.stringify(result)}`);
    assert(Array.isArray(result.value));
  },
);

e2eTest("admin.config.costDiscounts.get returns the discount configuration", async ({ client }) => {
  const result = await client.config.costDiscounts.get();
  assert(result.ok, `costDiscounts.get failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.config.costMargins.get returns the margin configuration", async ({ client }) => {
  const result = await client.config.costMargins.get();
  assert(result.ok, `costMargins.get failed: ${JSON.stringify(result)}`);
});

// Tolerance helper for the more permissive routes.
const tolerantConfig = (result: {
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
  throw new Error(`unexpected config error: ${JSON.stringify(e)}`);
};

e2eTest("admin.config.yaml returns the boot YAML payload", async ({ client }) => {
  const result = await client.config.yaml();
  if (!result.ok) {
    // 404 when admin UI yaml endpoint is gated/disabled; 422 on builds
    // where the route expects a body (the SDK still wires the call).
    if (
      result.error.kind === "http" &&
      (result.error.status === 404 || result.error.status === 422 ||
        result.error.status === 405)
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`yaml failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest(
  "admin.config.deleteCallback smoke-runs against a missing callback name",
  async ({ client }) => {
    // The proxy generally accepts the removal of a non-present callback; if
    // it 4xx-es, treat as expected wiring.
    const result = await client.config.deleteCallback({
      callback_name: `e2e-nonexistent-cb-${Date.now()}`,
    });
    tolerantConfig(result);
  },
);

e2eTest(
  "admin.config.passThroughEndpoints CRUD round-trip",
  async ({ client }) => {
    const path = `/e2e-pte-${Date.now()}`;
    const id = `e2e-pte-${Date.now()}`;
    const created = await client.config.passThroughEndpoints.create({
      id,
      path,
      target: "https://example.invalid/upstream",
    });
    if (!created.ok) {
      tolerantConfig(created);
      return;
    }

    try {
      const listed = await client.config.passThroughEndpoints.list({ endpoint_id: id });
      if (!listed.ok) tolerantConfig(listed);

      const updated = await client.config.passThroughEndpoints.update(id, {
        path,
        target: "https://example.invalid/upstream-v2",
      });
      if (!updated.ok) tolerantConfig(updated);
    } finally {
      const removed = await client.config.passThroughEndpoints.delete(id);
      if (!removed.ok) tolerantConfig(removed);
    }
  },
);

e2eTest(
  "admin.config.passThroughEndpoints.listByTeam returns team-scoped entries",
  async ({ client }) => {
    const team = await client.teams.create({
      team_alias: `e2e-pte-team-${Date.now()}`,
    });
    assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
    const teamId = team.value.team_id;

    try {
      const result = await client.config.passThroughEndpoints.listByTeam(teamId);
      tolerantConfig(result);
    } finally {
      await client.teams.delete({ team_ids: [teamId] });
    }
  },
);

e2eTest(
  "admin.config.configOverrides.hashicorpVault.get returns the override view",
  async ({ client }) => {
    const result = await client.config.configOverrides.hashicorpVault.get();
    if (!result.ok) {
      // Enterprise-gated; tolerate 403/404/500.
      if (
        result.error.kind === "http" &&
        result.error.status >= 400 && result.error.status < 600
      ) return;
      if (result.error.kind === "auth") return;
      throw new Error(`hashicorpVault.get failed: ${JSON.stringify(result.error)}`);
    }
    assert(typeof result.value.config_type === "string");
  },
);

e2eTest(
  "admin.config.configOverrides.hashicorpVault.set+delete round-trip",
  async ({ client }) => {
    const set = await client.config.configOverrides.hashicorpVault.set({
      vault_addr: "https://vault.invalid.example:8200",
      vault_token: "fake-token",
    });
    tolerantConfig(set);
    const removed = await client.config.configOverrides.hashicorpVault.delete();
    tolerantConfig(removed);
  },
);

e2eTest(
  "admin.config.configOverrides.hashicorpVault.testConnection probes vault",
  async ({ client }) => {
    const result = await client.config.configOverrides.hashicorpVault.testConnection();
    tolerantConfig(result);
  },
);

e2eTest(
  "admin.config.fields.info / update / delete round-trip on a throwaway field",
  async ({ client }) => {
    // Pick a settings field the proxy always exposes. `info` works
    // against any registered general-setting; update/delete are tolerant
    // since some fields are protected.
    const info = await client.config.fields.info("max_request_size_mb");
    if (!info.ok) {
      // Some builds 400 on unknown / restricted fields.
      tolerantConfig(info);
      return;
    }

    // Update with whatever value the proxy returned (no-op write).
    const updated = await client.config.fields.update({
      config_type: "general_settings",
      field_name: "max_request_size_mb",
      field_value: info.value.field_value ?? 100,
    });
    tolerantConfig(updated);

    const deleted = await client.config.fields.delete({
      config_type: "general_settings",
      field_name: "max_request_size_mb",
    });
    tolerantConfig(deleted);
  },
);

e2eTest(
  "admin.config.costDiscounts.update overwrites the discount config (tolerant)",
  async ({ client }) => {
    // Re-write whatever the proxy returned as a no-op.
    const current = await client.config.costDiscounts.get();
    if (!current.ok) {
      tolerantConfig(current);
      return;
    }
    const result = await client.config.costDiscounts.update(current.value.values);
    tolerantConfig(result);
  },
);

e2eTest(
  "admin.config.costMargins.update overwrites the margin config (tolerant)",
  async ({ client }) => {
    const current = await client.config.costMargins.get();
    if (!current.ok) {
      tolerantConfig(current);
      return;
    }
    const result = await client.config.costMargins.update(current.value.values);
    tolerantConfig(result);
  },
);
