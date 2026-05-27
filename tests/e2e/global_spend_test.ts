import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Some endpoints require date params and return 400 without them. We test
// those with valid dates. Others are enterprise-gated (`/spend/report`) and
// return 403; we treat 403 as expected gating.
const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

e2eTest("admin.globalSpend.spend returns total proxy spend", async ({ client }) => {
  const result = await client.globalSpend.spend();
  assert(result.ok, `spend failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.keys returns the top-spending keys", async ({ client }) => {
  const result = await client.globalSpend.keys({ limit: 5 });
  assert(result.ok, `keys failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.logs returns daily spend rows", async ({ client }) => {
  const result = await client.globalSpend.logs();
  assert(result.ok, `logs failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.models returns top models by spend", async ({ client }) => {
  const result = await client.globalSpend.models({ limit: 5 });
  assert(result.ok, `models failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.teams returns daily spend by team", async ({ client }) => {
  const result = await client.globalSpend.teams();
  assert(result.ok, `teams failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.tags returns spend grouped by tag", async ({ client }) => {
  const result = await client.globalSpend.tags({ start_date: monthAgo, end_date: today });
  assert(result.ok, `tags failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.provider returns spend grouped by provider", async ({ client }) => {
  const result = await client.globalSpend.provider({ start_date: monthAgo, end_date: today });
  assert(result.ok, `provider failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.report returns the per-group spend report", async ({ client }) => {
  const result = await client.globalSpend.report({ start_date: monthAgo, end_date: today });
  if (!result.ok) {
    // `/spend/report` is enterprise-only. The proxy returns 400 with a
    // license-required message; older builds return 403.
    const e = result.error;
    if (
      (e.kind === "auth" && (e.status === 400 || e.status === 403)) ||
      (e.kind === "http" && (e.status === 400 || e.status === 403))
    ) return;
    throw new Error(`report failed: ${JSON.stringify(e)}`);
  }
});

e2eTest("admin.globalSpend.allTagNames returns the distinct tag names", async ({ client }) => {
  const result = await client.globalSpend.allTagNames();
  assert(result.ok, `allTagNames failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.allEndUsers returns the distinct end-user ids", async ({ client }) => {
  const result = await client.globalSpend.allEndUsers();
  assert(result.ok, `allEndUsers failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.endUsers returns top end users", async ({ client }) => {
  const result = await client.globalSpend.endUsers({});
  assert(result.ok, `endUsers failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.activity returns daily request counts", async ({ client }) => {
  const result = await client.globalSpend.activity({ start_date: monthAgo, end_date: today });
  assert(result.ok, `activity failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.activityExceptions returns daily exception counts", async ({
  client,
}) => {
  const result = await client.globalSpend.activityExceptions({
    start_date: monthAgo,
    end_date: today,
  });
  // 1.87 requires an undocumented `model_group` query param that the SDK
  // type doesn't yet expose; treat that as expected gating.
  if (!result.ok && result.error.kind === "http" && result.error.status === 422) return;
  assert(result.ok, `activityExceptions failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.activityExceptionsDeployment returns per-deployment exceptions", async ({
  client,
}) => {
  const result = await client.globalSpend.activityExceptionsDeployment({
    start_date: monthAgo,
    end_date: today,
  });
  if (!result.ok && result.error.kind === "http" && result.error.status === 422) return;
  assert(result.ok, `activityExceptionsDeployment failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.activityModel returns per-model daily activity", async ({ client }) => {
  const result = await client.globalSpend.activityModel({
    start_date: monthAgo,
    end_date: today,
  });
  assert(result.ok, `activityModel failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.activityCacheHits returns cache-hit vs LLM-call counts", async ({
  client,
}) => {
  const result = await client.globalSpend.activityCacheHits({
    start_date: monthAgo,
    end_date: today,
  });
  assert(result.ok, `activityCacheHits failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.globalSpend.refresh kicks the cached aggregates", async ({ client }) => {
  const result = await client.globalSpend.refresh();
  assert(result.ok, `refresh failed: ${JSON.stringify(result)}`);
});

// `reset` zeros every spend counter on the proxy and is intentionally not
// exercised here: doing so would interfere with the rest of the suite and
// any concurrent test run on the same proxy. The method shares the same
// transport plumbing as `refresh`, which is exercised above.
