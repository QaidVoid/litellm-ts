import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.adaptiveRouter.state returns snapshots or 404 when unconfigured", async ({
  client,
}) => {
  const result = await client.adaptiveRouter.state();
  if (!result.ok) {
    // The proxy returns 404 with `{"detail":{"error":"No adaptive_router is configured..."}}`
    // when no adaptive router is configured. That's an expected configuration
    // state, not a test failure.
    if (result.error.kind === "http" && result.error.status === 404) return;
    throw new Error(`state failed: ${JSON.stringify(result.error)}`);
  }
  assert(Array.isArray(result.value.routers), "expected routers array");
});
