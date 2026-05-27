import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.tools.policyOptions returns the static policy catalog", async ({ client }) => {
  const result = await client.tools.policyOptions();
  assert(result.ok, `policyOptions failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.input_policies), "expected input_policies array");
  assert(Array.isArray(result.value.output_policies), "expected output_policies array");
});

e2eTest("admin.tools.list returns the discovered tool registry", async ({ client }) => {
  const result = await client.tools.list();
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.tools), "expected tools array");
  assert(typeof result.value.total === "number", "expected total number");
});

e2eTest("admin.tools.list filters by input_policy", async ({ client }) => {
  const result = await client.tools.list({ input_policy: "untrusted" });
  assert(result.ok, `list (filtered) failed: ${JSON.stringify(result)}`);
  for (const t of result.value.tools) {
    assert(
      t.input_policy === "untrusted",
      `unexpected input_policy: ${t.input_policy}`,
    );
  }
});

e2eTest("admin.tools.get + detail + logs round-trip on a discovered tool", async ({
  client,
}) => {
  const listed = await client.tools.list();
  assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
  if (listed.value.tools.length === 0) {
    // No tools discovered on this proxy; the type surface is the only thing
    // we can assert.
    return;
  }
  const tool = listed.value.tools[0];
  assert(tool !== undefined);

  const got = await client.tools.get(tool.tool_name);
  assert(got.ok, `get failed: ${JSON.stringify(got)}`);
  assert(got.value.tool_name === tool.tool_name);

  const detail = await client.tools.detail(tool.tool_name);
  assert(detail.ok, `detail failed: ${JSON.stringify(detail)}`);
  assert(detail.value.tool.tool_name === tool.tool_name);
  assert(Array.isArray(detail.value.overrides), "expected overrides array");

  const logs = await client.tools.logs(tool.tool_name, { page: 1, page_size: 5 });
  assert(logs.ok, `logs failed: ${JSON.stringify(logs)}`);
  assert(Array.isArray(logs.value.logs), "expected logs array");
  assert(typeof logs.value.total === "number");
});

e2eTest("admin.tools.updatePolicy smoke-runs on a throwaway tool name", async ({ client }) => {
  const result = await client.tools.updatePolicy({
    tool_name: `e2e-nonexistent-tool-${Date.now()}`,
    input_policy: "untrusted",
  });
  // The proxy may return 200 (creating an implicit override) or a 4xx if the
  // tool is unknown; either way the SDK should wire the call cleanly.
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 500
    ) return;
    throw new Error(`updatePolicy failed: ${JSON.stringify(result.error)}`);
  }
  assert(typeof result.value.updated === "boolean");
});

e2eTest("admin.tools.deleteOverride smoke-runs against a missing override", async ({
  client,
}) => {
  const result = await client.tools.deleteOverride(`e2e-nonexistent-tool-${Date.now()}`, {
    team_id: "e2e-no-such-team",
  });
  // Expect any 4xx/5xx for a tool/scope combination that doesn't exist.
  // 1.87 surfaces a Prisma TypeError as a 500 for missing rows.
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    throw new Error(`deleteOverride failed: ${JSON.stringify(result.error)}`);
  }
});
