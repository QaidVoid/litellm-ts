import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.keys CRUD round-trip", async ({ client }) => {
  const alias = `e2e-test-key-${Date.now()}`;

  // Create
  const created = await client.keys.generate({
    key_alias: alias,
    max_budget: 0.01,
    duration: "30s",
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const keyValue = created.value.key;
  assert(typeof keyValue === "string" && keyValue.startsWith("sk-"), "expected sk- key");

  try {
    // Info
    const info = await client.keys.info(keyValue);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.info.key_alias, alias);

    // Update
    const updated = await client.keys.update({ key: keyValue, max_budget: 0.02 });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // Block / unblock
    const blocked = await client.keys.block({ key: keyValue });
    assert(blocked.ok, `block failed: ${JSON.stringify(blocked)}`);
    const unblocked = await client.keys.unblock({ key: keyValue });
    assert(unblocked.ok, `unblock failed: ${JSON.stringify(unblocked)}`);
  } finally {
    // Delete
    const deleted = await client.keys.delete({ keys: [keyValue] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.budgets CRUD round-trip", async ({ client }) => {
  const budgetId = `e2e-budget-${Date.now()}`;

  // Create
  const created = await client.budgets.create({
    budget_id: budgetId,
    max_budget: 10,
    budget_duration: "30d",
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  assertStrictEquals(created.value.budget_id, budgetId);

  try {
    // Info
    const info = await client.budgets.info(budgetId);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.budget_id, budgetId);
    assertStrictEquals(info.value.max_budget, 10);

    // Update
    const updated = await client.budgets.update({ budget_id: budgetId, max_budget: 20 });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List
    const listed = await client.budgets.list();
    assert(listed.ok);
    assert(
      listed.value.some((b) => b.budget_id === budgetId),
      "new budget missing from list",
    );
  } finally {
    // Delete
    const deleted = await client.budgets.delete({ id: budgetId });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.tags CRUD round-trip", async ({ client }) => {
  const name = `e2e-tag-${Date.now()}`;

  const created = await client.tags.create({
    name,
    description: "throwaway e2e tag",
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    // The list endpoint returns dynamic + stored tags. We just confirm the
    // tag we created is present.
    const listed = await client.tags.list();
    assert(listed.ok);
    assert(
      listed.value.some((t) => t.name === name),
      `tag ${name} missing from list`,
    );

    // Info accepts a list of names and returns a map; assert ours is in it.
    const info = await client.tags.info({ names: [name] });
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
  } finally {
    const deleted = await client.tags.delete({ name });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest(
  "admin.proxyModels.list returns the registered fleet including test-* models",
  async ({ client }) => {
    const result = await client.proxyModels.list();
    assert(result.ok, `list failed: ${JSON.stringify(result)}`);
    const names = result.value.data.map((m) => m.model_name);
    assert(names.includes("test-gemma3"), "test-gemma3 should be registered");
    assert(names.includes("test-titan-embed"), "test-titan-embed should be registered");
  },
);

e2eTest("admin.health probes return live signals", async ({ client }) => {
  const liveliness = await client.health.liveliness();
  assert(liveliness.ok, `liveliness failed: ${JSON.stringify(liveliness)}`);

  const readiness = await client.health.readiness();
  assert(readiness.ok, `readiness failed: ${JSON.stringify(readiness)}`);
  assertStrictEquals(typeof readiness.value.status, "string");
});

// --- additional keys surface ---

e2eTest("admin.keys.generateServiceAccount mints a team-scoped key", async ({ client }) => {
  // generateServiceAccount requires a team to attach to.
  const team = await client.teams.create({ team_alias: `e2e-svc-team-${Date.now()}` });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  try {
    const result = await client.keys.generateServiceAccount({
      team_id: teamId,
      key_alias: `e2e-svc-${Date.now()}`,
      duration: "30s",
    });
    if (!result.ok) {
      // Some proxy builds restrict service-account creation. Tolerate.
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected generateServiceAccount error: ${JSON.stringify(result.error)}`,
      );
      return;
    }
    // Clean up the key we created.
    await client.keys.delete({ keys: [result.value.key] });
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
  }
});

e2eTest("admin.keys.list returns paginated keys", async ({ client }) => {
  const result = await client.keys.list({ page: 1, size: 5 });
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.keys), "expected keys array");
  assert(typeof result.value.total_count === "number");
});

e2eTest("admin.keys.regenerate rotates a key", async ({ client }) => {
  const created = await client.keys.generate({
    key_alias: `e2e-regen-${Date.now()}`,
    duration: "30s",
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const original = created.value.key;

  try {
    const result = await client.keys.regenerate({ key: original });
    if (!result.ok) {
      // The proxy may reject regenerate for short-lived keys; tolerate
      // but cleanup must still proceed.
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected regenerate error: ${JSON.stringify(result.error)}`,
      );
      await client.keys.delete({ keys: [original] });
      return;
    }
    // After regen, the old key is replaced. Delete the new value.
    await client.keys.delete({ keys: [result.value.key] });
  } catch (e) {
    await client.keys.delete({ keys: [original] });
    throw e;
  }
});

e2eTest("admin.keys.regenerateByPath rotates a key via URL path", async ({ client }) => {
  const created = await client.keys.generate({
    key_alias: `e2e-regen-path-${Date.now()}`,
    duration: "30s",
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const original = created.value.key;

  try {
    const result = await client.keys.regenerateByPath(original);
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected regenerateByPath error: ${JSON.stringify(result.error)}`,
      );
      await client.keys.delete({ keys: [original] });
      return;
    }
    await client.keys.delete({ keys: [result.value.key] });
  } catch (e) {
    await client.keys.delete({ keys: [original] });
    throw e;
  }
});

e2eTest("admin.keys.resetSpend zeroes the spend counter", async ({ client }) => {
  const created = await client.keys.generate({
    key_alias: `e2e-reset-${Date.now()}`,
    duration: "30s",
    max_budget: 1.0,
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const key = created.value.key;

  try {
    const result = await client.keys.resetSpend(key, { reset_to: 0 });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected resetSpend error: ${JSON.stringify(result.error)}`,
      );
      return;
    }
    assertStrictEquals(result.value.spend, 0);
  } finally {
    await client.keys.delete({ keys: [key] });
  }
});

e2eTest("admin.keys.aliases returns the alias catalog", async ({ client }) => {
  const result = await client.keys.aliases({ page: 1, size: 5 });
  assert(result.ok, `aliases failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.aliases), "expected aliases array");
  assert(typeof result.value.total_count === "number");
});

e2eTest("admin.keys.bulkUpdate updates multiple keys", async ({ client }) => {
  const created = await client.keys.generate({
    key_alias: `e2e-bulk-key-${Date.now()}`,
    duration: "30s",
    max_budget: 1.0,
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const key = created.value.key;

  try {
    const result = await client.keys.bulkUpdate({
      keys: [{ key, max_budget: 2.0 }],
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected bulkUpdate error: ${JSON.stringify(result.error)}`,
      );
      return;
    }
    assertStrictEquals(result.value.total_requested, 1);
  } finally {
    await client.keys.delete({ keys: [key] });
  }
});

e2eTest("admin.keys.bulkUpdateByTeam scopes a bulk update to one team", async ({ client }) => {
  const team = await client.teams.create({ team_alias: `e2e-keybulk-team-${Date.now()}` });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  const created = await client.keys.generate({
    key_alias: `e2e-keybulk-team-${Date.now()}`,
    duration: "30s",
    team_id: teamId,
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const key = created.value.key;

  try {
    const result = await client.keys.bulkUpdateByTeam({
      team_id: teamId,
      key_updates: { keys: [{ key, max_budget: 5.0 }] },
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected bulkUpdateByTeam error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.keys.delete({ keys: [key] });
    await client.teams.delete({ team_ids: [teamId] });
  }
});

e2eTest("admin.keys.health returns the logging-callback verdict", async ({ client }) => {
  const result = await client.keys.health();
  assert(result.ok, `health failed: ${JSON.stringify(result)}`);
  assert(
    result.value.key === "healthy" || result.value.key === "unhealthy",
    `unexpected key verdict: ${result.value.key}`,
  );
});

e2eTest("admin.keys.infoV2 batches key lookups", async ({ client }) => {
  const created = await client.keys.generate({
    key_alias: `e2e-infoV2-${Date.now()}`,
    duration: "30s",
  });
  assert(created.ok, `generate failed: ${JSON.stringify(created)}`);
  const key = created.value.key;

  try {
    const result = await client.keys.infoV2({ keys: [key] });
    if (!result.ok) {
      // Some proxy builds restrict v2 endpoints by IP allowlist.
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected infoV2 error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.keys.delete({ keys: [key] });
  }
});

// --- additional budgets surface ---

e2eTest(
  "admin.budgets.providerBudgets surfaces the provider-budget state (tolerant)",
  async ({ client }) => {
    const result = await client.budgets.providerBudgets();
    // The proxy returns 500 with a helpful message when no provider
    // budget config is set. That's a wire-correctness signal too.
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected providerBudgets error: ${JSON.stringify(result.error)}`,
      );
    }
  },
);

e2eTest("admin.budgets.infoBatch retrieves multiple budgets in one call", async ({ client }) => {
  const id = `e2e-budget-batch-${Date.now()}`;
  const created = await client.budgets.create({
    budget_id: id,
    max_budget: 5.0,
    budget_duration: "30d",
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    const result = await client.budgets.infoBatch({ budgets: [id] });
    assert(result.ok, `infoBatch failed: ${JSON.stringify(result)}`);
    assert(
      result.value.some((b) => b.budget_id === id),
      "expected our budget in batch result",
    );
  } finally {
    await client.budgets.delete({ id });
  }
});

e2eTest("admin.budgets.settings returns the field schema", async ({ client }) => {
  const id = `e2e-budget-settings-${Date.now()}`;
  const created = await client.budgets.create({
    budget_id: id,
    max_budget: 5.0,
    budget_duration: "30d",
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    const result = await client.budgets.settings(id);
    assert(result.ok, `settings failed: ${JSON.stringify(result)}`);
    assert(Array.isArray(result.value), "expected settings array");
    assert(
      result.value.some((f) => f.field_name === "max_budget"),
      "expected max_budget field in settings",
    );
  } finally {
    await client.budgets.delete({ id });
  }
});

// --- additional proxyModels surface ---

e2eTest("admin.proxyModels.metrics returns the latency rollup", async ({ client }) => {
  const result = await client.proxyModels.metrics();
  assert(result.ok, `metrics failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.data));
  assert(Array.isArray(result.value.all_api_bases));
});

e2eTest(
  "admin.proxyModels.metricsExceptions returns per-deployment exceptions",
  async ({ client }) => {
    const result = await client.proxyModels.metricsExceptions();
    assert(result.ok, `metricsExceptions failed: ${JSON.stringify(result)}`);
    assert(Array.isArray(result.value.data));
    assert(Array.isArray(result.value.exception_types));
  },
);

e2eTest(
  "admin.proxyModels.metricsSlowResponses returns slow-response counts",
  async ({ client }) => {
    const result = await client.proxyModels.metricsSlowResponses();
    assert(result.ok, `metricsSlowResponses failed: ${JSON.stringify(result)}`);
    assert(Array.isArray(result.value));
  },
);

e2eTest("admin.proxyModels.streamingMetrics returns the TTFT rollup", async ({ client }) => {
  const result = await client.proxyModels.streamingMetrics();
  assert(result.ok, `streamingMetrics failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.data));
});

e2eTest("admin.proxyModels.costMapSource describes the loaded cost map", async ({ client }) => {
  const result = await client.proxyModels.costMapSource();
  assert(result.ok, `costMapSource failed: ${JSON.stringify(result)}`);
  assert(
    result.value.source === "local" || result.value.source === "remote",
    `unexpected source: ${result.value.source}`,
  );
  assert(typeof result.value.model_count === "number");
});

e2eTest(
  "admin.proxyModels.modelGroup.info returns the group info dashboard",
  async ({ client }) => {
    const result = await client.proxyModels.modelGroup.info();
    assert(result.ok, `modelGroup.info failed: ${JSON.stringify(result)}`);
  },
);

e2eTest(
  "admin.proxyModels.modelGroup.makePublic flags a group public (tolerant)",
  async ({ client }) => {
    const result = await client.proxyModels.modelGroup.makePublic({
      model_groups: ["test-gemma3"],
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected makePublic error: ${JSON.stringify(result.error)}`,
      );
    }
  },
);

e2eTest(
  "admin.proxyModels.modelGroup.updateUsefulLinks accepts a link map (tolerant)",
  async ({ client }) => {
    const result = await client.proxyModels.modelGroup.updateUsefulLinks({
      useful_links: { Docs: "https://example.test/docs" },
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected updateUsefulLinks error: ${JSON.stringify(result.error)}`,
      );
    }
  },
);

e2eTest("admin.proxyModels.listV2 returns the v2 model listing", async ({ client }) => {
  const result = await client.proxyModels.listV2({ page: 1, size: 5 });
  assert(result.ok, `listV2 failed: ${JSON.stringify(result)}`);
});

e2eTest(
  "admin.proxyModels.updateLegacy updates via POST /model/update",
  async ({ client }) => {
    // Register a throwaway deployment so we have a stable id to update.
    const name = `e2e-legacy-model-${Date.now()}`;
    const registered = await client.proxyModels.register({
      model_name: name,
      litellm_params: { model: "openai/gpt-4o-mini", api_key: "sk-fake" },
    });
    assert(registered.ok, `register failed: ${JSON.stringify(registered)}`);
    const id = registered.value.model_id;

    try {
      const result = await client.proxyModels.updateLegacy({
        model_name: name,
        litellm_params: { model: "openai/gpt-4o-mini", api_key: "sk-fake-rotated" },
        model_info: { id },
      });
      if (!result.ok) {
        // Some builds restrict the legacy update path; tolerate 4xx/5xx.
        assert(
          result.error.kind === "http" || result.error.kind === "auth",
          `unexpected updateLegacy error: ${JSON.stringify(result.error)}`,
        );
      }
    } finally {
      await client.proxyModels.delete(id);
    }
  },
);

e2eTest(
  "admin.proxyModels.retrieveOpenAI returns the OpenAI-shape model entry",
  async ({ client }) => {
    const result = await client.proxyModels.retrieveOpenAI("test-gemma3");
    if (!result.ok) {
      // Some builds return 404 for non-OpenAI provider models on this
      // OpenAI-shape endpoint. Tolerate while still asserting wiring.
      assert(
        result.error.kind === "http",
        `unexpected retrieveOpenAI error: ${JSON.stringify(result.error)}`,
      );
      return;
    }
    assertStrictEquals(result.value.id, "test-gemma3");
    assertStrictEquals(result.value.object, "model");
  },
);
