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
