import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// LiteLLM's container endpoints proxy through to OpenAI; without an
// `OPENAI_API_KEY` configured on the proxy, they all 500. This test
// confirms the route is wired (the SDK reaches the proxy and the proxy
// reaches *its* OpenAI client) without asserting the upstream succeeds.
e2eTest(
  "containers.create routes to the proxy and surfaces upstream errors",
  async ({ client }) => {
    const result = await client.containers.create({
      name: `e2e-container-${Date.now()}`,
    });
    if (result.ok) {
      // Container was actually created (OPENAI_API_KEY available): clean up.
      const id = result.value.id;
      const deleted = await client.containers.delete(id);
      assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
      return;
    }
    // Without OpenAI creds the proxy returns 500. Either is acceptable here.
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 401,
        `unexpected status: ${result.error.status}`,
      );
    }
  },
);
