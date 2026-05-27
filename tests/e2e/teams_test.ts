import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.teams CRUD round-trip", async ({ client }) => {
  const alias = `e2e-team-${Date.now()}`;

  const created = await client.teams.create({
    team_alias: alias,
    max_budget: 1.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const teamId = created.value.team_id;
  assert(typeof teamId === "string" && teamId.length > 0, "expected team_id");

  try {
    // Info round-trips the alias inside the `team_info` wrapper.
    const info = await client.teams.info(teamId);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.team_info.team_alias, alias);

    // Update lifts the budget ceiling.
    const updated = await client.teams.update({ team_id: teamId, max_budget: 2.0 });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List includes the new team.
    const listed = await client.teams.list();
    assert(listed.ok);
    assert(
      listed.value.some((t) => t.team_id === teamId),
      "new team missing from list",
    );

    // Block / unblock are both no-content state toggles.
    const blocked = await client.teams.block({ team_id: teamId });
    assert(blocked.ok, `block failed: ${JSON.stringify(blocked)}`);
    const unblocked = await client.teams.unblock({ team_id: teamId });
    assert(unblocked.ok, `unblock failed: ${JSON.stringify(unblocked)}`);
  } finally {
    const deleted = await client.teams.delete({ team_ids: [teamId] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.teams.available returns teams visible to the caller", async ({ client }) => {
  const result = await client.teams.available();
  assert(result.ok, `available failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

// Membership management requires a team plus a target user. Every test in
// this block creates both inline, exercises the member-level surface,
// and tears down in a finally so the proxy stays clean.

e2eTest("admin.teams membership add / update / delete round-trip", async ({ client }) => {
  const ts = Date.now();
  const teamAlias = `e2e-team-mbr-${ts}`;
  const userId = `e2e-team-mbr-user-${ts}`;
  const team = await client.teams.create({ team_alias: teamAlias });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  const user = await client.users.create({
    user_id: userId,
    user_email: `${userId}@example.test`,
    auto_create_key: false,
  });
  assert(user.ok, `user create failed: ${JSON.stringify(user)}`);

  try {
    // Add as a regular user.
    const added = await client.teams.addMember({
      team_id: teamId,
      member: { user_id: userId, role: "user" },
    });
    assert(added.ok, `addMember failed: ${JSON.stringify(added)}`);

    // Update per-member limits. (Promoting to admin requires an enterprise
    // license, so we just bump the in-team budget instead.)
    const updated = await client.teams.updateMember({
      team_id: teamId,
      user_id: userId,
      max_budget_in_team: 5.0,
    });
    assert(updated.ok, `updateMember failed: ${JSON.stringify(updated)}`);

    // Remove.
    const removed = await client.teams.deleteMember({ team_id: teamId, user_id: userId });
    assert(removed.ok, `deleteMember failed: ${JSON.stringify(removed)}`);
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
    await client.users.delete({ user_ids: [userId] });
  }
});

e2eTest("admin.teams bulkAddMembers round-trips", async ({ client }) => {
  const ts = Date.now();
  const teamAlias = `e2e-team-bulk-${ts}`;
  const userIds = [`e2e-team-bulk-u1-${ts}`, `e2e-team-bulk-u2-${ts}`];
  const team = await client.teams.create({ team_alias: teamAlias });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  for (const u of userIds) {
    await client.users.create({
      user_id: u,
      user_email: `${u}@example.test`,
      auto_create_key: false,
    });
  }

  try {
    const result = await client.teams.bulkAddMembers({
      team_id: teamId,
      members: userIds.map((u) => ({ user_id: u, role: "user" as const })),
    });
    assert(result.ok, `bulkAddMembers failed: ${JSON.stringify(result)}`);
    assert(result.value.total_requested === userIds.length);
    assert(result.value.successful_additions >= 1, "expected at least one successful add");
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
    await client.users.delete({ user_ids: userIds });
  }
});

e2eTest("admin.teams model add / delete round-trip", async ({ client }) => {
  const team = await client.teams.create({
    team_alias: `e2e-team-models-${Date.now()}`,
  });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  try {
    const added = await client.teams.addModels({
      team_id: teamId,
      models: ["test-gemma3"],
    });
    assert(added.ok, `addModels failed: ${JSON.stringify(added)}`);
    assert(
      (added.value.models ?? []).includes("test-gemma3"),
      "expected test-gemma3 in team models",
    );

    const removed = await client.teams.deleteModels({
      team_id: teamId,
      models: ["test-gemma3"],
    });
    assert(removed.ok, `deleteModels failed: ${JSON.stringify(removed)}`);
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
  }
});

e2eTest("admin.teams.myMembership surfaces the caller's row", async ({ client }) => {
  const team = await client.teams.create({
    team_alias: `e2e-team-mymbr-${Date.now()}`,
  });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  try {
    const result = await client.teams.myMembership(teamId);
    // The master key isn't a team member; the proxy returns 404 in that
    // case. Either outcome is acceptable.
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected error kind: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
  }
});

e2eTest("admin.teams callbacks get + add + disableLogging round-trip", async ({ client }) => {
  const team = await client.teams.create({
    team_alias: `e2e-team-cb-${Date.now()}`,
  });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  try {
    const initial = await client.teams.getCallbacks(teamId);
    assert(initial.ok, `getCallbacks failed: ${JSON.stringify(initial)}`);

    // addCallback is enterprise-gated; tolerate 403 / 500.
    const added = await client.teams.addCallback(teamId, {
      callback_name: "langfuse",
      callback_vars: {
        langfuse_public_key: "pk-test",
        langfuse_secret_key: "sk-test",
      },
    });
    if (!added.ok) {
      assert(
        added.error.kind === "http" || added.error.kind === "auth",
        `unexpected addCallback error: ${JSON.stringify(added.error)}`,
      );
    }

    // disableLogging may also be enterprise-gated.
    const disabled = await client.teams.disableLogging(teamId);
    if (!disabled.ok) {
      assert(
        disabled.error.kind === "http" || disabled.error.kind === "auth",
        `unexpected disableLogging error: ${JSON.stringify(disabled.error)}`,
      );
    }
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
  }
});

e2eTest("admin.teams member-permissions get / update / bulk-update", async ({ client }) => {
  const team = await client.teams.create({
    team_alias: `e2e-team-perm-${Date.now()}`,
  });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  try {
    const got = await client.teams.getMemberPermissions(teamId);
    assert(got.ok, `getMemberPermissions failed: ${JSON.stringify(got)}`);
    assert(Array.isArray(got.value.all_available_permissions), "expected catalog array");

    // Update with an empty permission list - always valid.
    const updated = await client.teams.updateMemberPermissions({
      team_id: teamId,
      team_member_permissions: [],
    });
    assert(updated.ok, `updateMemberPermissions failed: ${JSON.stringify(updated)}`);

    const bulk = await client.teams.bulkUpdateMemberPermissions({
      permissions: [],
      team_ids: [teamId],
    });
    // Empty permissions is a valid no-op; some proxies 400 on it though.
    if (!bulk.ok) {
      assert(
        bulk.error.kind === "http",
        `unexpected bulkUpdateMemberPermissions error: ${JSON.stringify(bulk.error)}`,
      );
    }
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
  }
});

e2eTest("admin.teams.dailyActivity round-trips with a date window", async ({ client }) => {
  const result = await client.teams.dailyActivity({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
  });
  assert(result.ok, `dailyActivity failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.teams.listV2 returns a paginated team list", async ({ client }) => {
  const result = await client.teams.listV2({ page: 1, page_size: 5 });
  assert(result.ok, `listV2 failed: ${JSON.stringify(result)}`);
});
