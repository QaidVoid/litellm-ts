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
