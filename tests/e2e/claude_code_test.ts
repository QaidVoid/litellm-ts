import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("claudeCode.marketplace returns the published plugin catalog", async ({ client }) => {
  const result = await client.claudeCode.marketplace();
  assert(result.ok, `marketplace failed: ${JSON.stringify(result)}`);
  assert(typeof result.value.name === "string" && result.value.name.length > 0);
  assert(typeof result.value.owner === "object" && result.value.owner !== null);
  assert(Array.isArray(result.value.plugins), "expected plugins array");
});

e2eTest("claudeCode.list returns the registered plugins", async ({ client }) => {
  const result = await client.claudeCode.list();
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.plugins), "expected plugins array");
  assert(typeof result.value.count === "number", "expected count");
});

e2eTest("claudeCode CRUD round-trip + enable/disable", async ({ client }) => {
  const pluginName = `e2e-plugin-${Date.now()}`;

  const created = await client.claudeCode.register({
    name: pluginName,
    source: { source: "github", repo: "anthropics/skills" },
    version: "1.0.0",
    description: "e2e throwaway",
  });
  assert(created.ok, `register failed: ${JSON.stringify(created)}`);
  assert(created.value.action === "created" || created.value.action === "updated");
  assertStrictEquals(created.value.plugin.name, pluginName);

  try {
    const got = await client.claudeCode.get(pluginName);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.name, pluginName);

    const disabled = await client.claudeCode.disable(pluginName);
    assert(disabled.ok, `disable failed: ${JSON.stringify(disabled)}`);

    const enabled = await client.claudeCode.enable(pluginName);
    assert(enabled.ok, `enable failed: ${JSON.stringify(enabled)}`);

    const listed = await client.claudeCode.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.plugins.some((p) => p.name === pluginName),
      "new plugin missing from list",
    );
  } finally {
    const deleted = await client.claudeCode.delete(pluginName);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});
