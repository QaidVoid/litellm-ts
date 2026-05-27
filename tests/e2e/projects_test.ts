import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// `/project/*` is an enterprise feature. Non-enterprise proxies return
// a 403 with a license-required message; we skip the round-trip in that
// case and just verify the surface compiles + the call reaches the
// proxy.
e2eTest("admin.projects CRUD round-trip (enterprise-only)", async ({ client }) => {
  const team = await client.teams.create({ team_alias: `e2e-proj-team-${Date.now()}` });
  assert(team.ok, `team create failed: ${JSON.stringify(team)}`);
  const teamId = team.value.team_id;

  try {
    const alias = `e2e-project-${Date.now()}`;
    const created = await client.projects.create({
      team_id: teamId,
      project_alias: alias,
      max_budget: 1.0,
    });
    if (!created.ok && created.error.kind === "auth" && created.error.status === 403) {
      // Proxy isn't enterprise-licensed; nothing further to exercise.
      return;
    }
    assert(created.ok, `create failed: ${JSON.stringify(created)}`);
    const projectId = created.value.project_id;

    try {
      const info = await client.projects.info(projectId);
      assert(info.ok, `info failed: ${JSON.stringify(info)}`);
      assertStrictEquals(info.value.project_alias, alias);

      const updated = await client.projects.update({ project_id: projectId, max_budget: 2.0 });
      assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

      const listed = await client.projects.list();
      assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
      assert(
        listed.value.some((p) => p.project_id === projectId),
        "project missing from list",
      );
    } finally {
      await client.projects.delete({ project_ids: [projectId] });
    }
  } finally {
    await client.teams.delete({ team_ids: [teamId] });
  }
});
