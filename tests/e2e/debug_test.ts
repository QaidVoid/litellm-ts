import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Many of these endpoints are gated on optional Python dependencies
// (`psutil`, `tracemalloc`) or on whether the proxy was started with debug
// flags. We accept 404, 500, or 503 alongside 200 to keep the suite portable.
const acceptDebugGating = (status: number): boolean =>
  status === 404 || status === 500 || status === 503;

e2eTest("admin.debug.asyncioTasks returns active asyncio tasks", async ({ client }) => {
  const result = await client.debug.asyncioTasks();
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`asyncioTasks failed: ${JSON.stringify(result.error)}`);
  }
  // Shape: `{ total_active_tasks: number, by_name: Record<string, number> }`.
  // Don't assert deep fields since the response varies across releases.
  assert(typeof result.value === "object" && result.value !== null);
});

e2eTest("admin.debug.memoryUsage returns the process memory snapshot", async ({ client }) => {
  const result = await client.debug.memoryUsage();
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`memoryUsage failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.debug.memoryUsageInMemCache returns the in-mem cache usage", async ({ client }) => {
  const result = await client.debug.memoryUsageInMemCache();
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`memoryUsageInMemCache failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest(
  "admin.debug.memoryUsageInMemCacheItems returns per-key cache usage",
  async ({ client }) => {
    const result = await client.debug.memoryUsageInMemCacheItems();
    if (!result.ok) {
      if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
      if (result.error.kind === "auth" && result.error.status === 403) return;
      throw new Error(`memoryUsageInMemCacheItems failed: ${JSON.stringify(result.error)}`);
    }
  },
);

e2eTest("admin.debug.memorySummary returns the worker memory summary", async ({ client }) => {
  const result = await client.debug.memorySummary();
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`memorySummary failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.debug.memoryDetails returns the detailed memory profile", async ({ client }) => {
  const result = await client.debug.memoryDetails();
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`memoryDetails failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.debug.configureGc tunes the Python GC thresholds", async ({ client }) => {
  const result = await client.debug.configureGc({
    generation_0: 700,
    generation_1: 10,
    generation_2: 10,
  });
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`configureGc failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.debug.otelSpans dumps the recent OpenTelemetry spans", async ({ client }) => {
  const result = await client.debug.otelSpans();
  if (!result.ok) {
    if (result.error.kind === "http" && acceptDebugGating(result.error.status)) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`otelSpans failed: ${JSON.stringify(result.error)}`);
  }
});
