import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.agents CRUD round-trip", async ({ client }) => {
  const agentName = `e2e-agent-${Date.now()}`;

  const created = await client.agents.create({
    agent_name: agentName,
    agent_card_params: {
      protocolVersion: "0.0.1",
      name: agentName,
      description: "e2e throwaway",
      url: "https://example.test/agent",
      version: "0.0.1",
      capabilities: {},
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [
        {
          id: "echo",
          name: "echo",
          description: "echoes input",
          tags: ["e2e"],
        },
      ],
    },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const agentId = created.value.agent_id;

  try {
    // Get round-trips the name.
    const got = await client.agents.get(agentId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.agent_name, agentName);

    // List contains the new agent.
    const listed = await client.agents.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.some((a) => a.agent_id === agentId),
      "agent missing from list",
    );

    // Patch renames in place.
    const patched = await client.agents.patch(agentId, {
      agent_name: `${agentName}-renamed`,
    });
    assert(patched.ok, `patch failed: ${JSON.stringify(patched)}`);
    assertStrictEquals(patched.value.agent_name, `${agentName}-renamed`);
  } finally {
    const deleted = await client.agents.delete(agentId);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});
