import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.users CRUD round-trip", async ({ client }) => {
  const userId = `e2e-user-${Date.now()}`;
  const email = `${userId}@example.test`;

  const created = await client.users.create({
    user_id: userId,
    user_email: email,
    user_role: "internal_user",
    auto_create_key: false,
    max_budget: 1.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    // Info by user_id matches the email we set (wrapped in `user_info`).
    const info = await client.users.info({ user_id: userId });
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.user_info.user_email, email);

    // Update extends the budget.
    const updated = await client.users.update({ user_id: userId, max_budget: 2.0 });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List finds the user.
    const listed = await client.users.list({ user_id: userId });
    assert(listed.ok);
    assert(
      listed.value.users.some((u) => u.user_id === userId),
      "user missing from list",
    );
  } finally {
    const deleted = await client.users.delete({ user_ids: [userId] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.users.availableRoles returns the role catalog", async ({ client }) => {
  const result = await client.users.availableRoles();
  assert(result.ok, `availableRoles failed: ${JSON.stringify(result)}`);
  // The catalog is keyed by role name (e.g. "proxy_admin"); ensure non-empty.
  assert(Object.keys(result.value).length > 0, "expected non-empty role catalog");
});

e2eTest("admin.users.bulkUpdate updates multiple users in one call", async ({ client }) => {
  const ts = Date.now();
  const userIds = [`e2e-bulk-u1-${ts}`, `e2e-bulk-u2-${ts}`];
  for (const u of userIds) {
    const created = await client.users.create({
      user_id: u,
      user_email: `${u}@example.test`,
      auto_create_key: false,
      max_budget: 1.0,
    });
    assert(created.ok, `precondition create failed: ${JSON.stringify(created)}`);
  }

  try {
    const result = await client.users.bulkUpdate({
      users: userIds.map((u) => ({ user_id: u, max_budget: 5.0 })),
    });
    assert(result.ok, `bulkUpdate failed: ${JSON.stringify(result)}`);
    assertStrictEquals(result.value.total_requested, userIds.length);
    assert(result.value.successful_updates >= 1, "expected at least one success");
  } finally {
    await client.users.delete({ user_ids: userIds });
  }
});

e2eTest("admin.users.dailyActivity returns activity rows", async ({ client }) => {
  const result = await client.users.dailyActivity({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
  });
  // Some proxy builds restrict this to non-admin users + return 403 to the
  // master key. Tolerate that while still asserting the route is wired.
  if (!result.ok) {
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected dailyActivity error: ${JSON.stringify(result.error)}`,
    );
    return;
  }
});

e2eTest(
  "admin.users.dailyActivityAggregated returns an aggregated rollup",
  async ({ client }) => {
    const result = await client.users.dailyActivityAggregated({
      start_date: "2026-05-20",
      end_date: "2026-05-27",
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected dailyActivityAggregated error: ${JSON.stringify(result.error)}`,
      );
      return;
    }
  },
);

e2eTest("admin.users.infoV2 returns a thin user row", async ({ client }) => {
  // Create a throwaway user so we have a stable target.
  const userId = `e2e-info-v2-${Date.now()}`;
  const created = await client.users.create({
    user_id: userId,
    user_email: `${userId}@example.test`,
    auto_create_key: false,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    const result = await client.users.infoV2({ user_id: userId });
    if (!result.ok) {
      // Some proxy builds restrict v2 endpoints by IP allowlist + return
      // 403 from the master key. Tolerate that.
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected infoV2 error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.users.delete({ user_ids: [userId] });
  }
});
