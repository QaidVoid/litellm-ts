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
