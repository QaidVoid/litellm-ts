import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// admin_test.ts covers the brief tags CRUD smoke. This file covers the
// analytics sub-namespace as well as `info` + `update` which the admin
// smoke doesn't exercise. Analytics endpoints are read-only and may
// return empty rows on a freshly booted proxy.

e2eTest("admin.tags full CRUD with info + update", async ({ client }) => {
  const name = `e2e-tag-full-${Date.now()}`;

  const created = await client.tags.create({
    name,
    description: "e2e throwaway",
    max_budget: 1.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    // Info returns a map keyed by tag name.
    const info = await client.tags.info({ names: [name] });
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assert(name in info.value, `expected ${name} in info map`);

    // Update lifts the budget.
    const updated = await client.tags.update({
      name,
      description: "e2e updated",
      max_budget: 2.0,
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List contains the tag.
    const listed = await client.tags.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.some((t) => t.name === name),
      `tag ${name} missing from list`,
    );
  } finally {
    const deleted = await client.tags.delete({ name });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.tags.analytics.dailyActivity round-trips", async ({ client }) => {
  const result = await client.tags.analytics.dailyActivity({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
    page: 1,
    page_size: 10,
  });
  assert(result.ok, `dailyActivity failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.tags.analytics.dau / wau / mau return active-user rollups", async ({ client }) => {
  const dau = await client.tags.analytics.dau();
  assert(dau.ok, `dau failed: ${JSON.stringify(dau)}`);
  assert(Array.isArray(dau.value.results), "expected dau.results array");

  const wau = await client.tags.analytics.wau();
  assert(wau.ok, `wau failed: ${JSON.stringify(wau)}`);
  assert(Array.isArray(wau.value.results), "expected wau.results array");

  const mau = await client.tags.analytics.mau();
  assert(mau.ok, `mau failed: ${JSON.stringify(mau)}`);
  assert(Array.isArray(mau.value.results), "expected mau.results array");
});

e2eTest("admin.tags.analytics.distinct returns distinct tags", async ({ client }) => {
  const result = await client.tags.analytics.distinct();
  assert(result.ok, `distinct failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.results), "expected results array");
});

e2eTest("admin.tags.analytics.summary returns aggregated metrics", async ({ client }) => {
  const result = await client.tags.analytics.summary({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
  });
  assert(result.ok, `summary failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.results), "expected results array");
});

e2eTest("admin.tags.analytics.perUserAnalytics returns paginated rows", async ({ client }) => {
  const result = await client.tags.analytics.perUserAnalytics({ page: 1, page_size: 10 });
  assert(result.ok, `perUserAnalytics failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.results), "expected results array");
  assert(typeof result.value.total_count === "number");
});
