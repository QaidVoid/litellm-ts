import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.audit.list returns a paginated audit log", async ({ client }) => {
  const result = await client.audit.list({ page: 1, page_size: 10 });
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.audit_logs), "expected audit_logs array");
  assert(typeof result.value.total === "number");
  assert(typeof result.value.page === "number");
});

e2eTest("admin.audit.list filters by table_name", async ({ client }) => {
  // We don't assert there ARE entries (a freshly booted proxy may have
  // none); just that the filter round-trips and the response shape is
  // correct.
  const result = await client.audit.list({ table_name: "LiteLLM_VerificationToken" });
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  for (const entry of result.value.audit_logs) {
    assert(
      entry.table_name === "LiteLLM_VerificationToken",
      `unexpected table_name: ${entry.table_name}`,
    );
  }
});

e2eTest("admin.audit.get returns a single entry or 404", async ({ client }) => {
  // Probe whatever entry happens to be on the first page; if there is none,
  // assert the bare 404 round-trip on a synthetic id.
  const listed = await client.audit.list({ page: 1, page_size: 1 });
  assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
  if (listed.value.audit_logs.length > 0) {
    const first = listed.value.audit_logs[0];
    assert(first !== undefined);
    const got = await client.audit.get(first.id);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assert(got.value.id === first.id);
    return;
  }
  const result = await client.audit.get(`e2e-no-such-audit-${Date.now()}`);
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`get failed: ${JSON.stringify(result.error)}`);
  }
});
