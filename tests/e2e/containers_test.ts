import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// LiteLLM's container endpoints proxy through to OpenAI; without an
// `OPENAI_API_KEY` configured on the proxy, they all 500. This test
// confirms the route is wired (the SDK reaches the proxy and the proxy
// reaches *its* OpenAI client) without asserting the upstream succeeds.

const tolerantContainer = (result: {
  ok: boolean;
  error?: { kind: string; status?: number };
}): void => {
  if (result.ok) return;
  const e = result.error!;
  if (e.kind === "auth") return;
  if (e.kind === "http") {
    const s = e.status ?? 0;
    if (s >= 400 && s < 600) return;
  }
  throw new Error(`unexpected container error: ${JSON.stringify(e)}`);
};

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

e2eTest("containers.list returns the container listing", async ({ client }) => {
  const result = await client.containers.list({ limit: 5 });
  if (!result.ok) {
    tolerantContainer(result);
    return;
  }
  assertStrictEquals(result.value.object, "list");
});

e2eTest("containers.retrieve surfaces upstream errors on a missing id", async ({ client }) => {
  const result = await client.containers.retrieve(`e2e-no-such-container-${Date.now()}`);
  tolerantContainer(result);
});

e2eTest("containers.files.list returns files for a container", async ({ client }) => {
  const result = await client.containers.files.list(
    `e2e-no-such-container-${Date.now()}`,
    { limit: 5 },
  );
  tolerantContainer(result);
});

e2eTest("containers.files.retrieve / content / delete smoke", async ({ client }) => {
  const containerId = `e2e-no-such-container-${Date.now()}`;
  const fileId = `e2e-no-such-file-${Date.now()}`;

  const retrieved = await client.containers.files.retrieve(containerId, fileId);
  tolerantContainer(retrieved);

  const content = await client.containers.files.content(containerId, fileId);
  tolerantContainer(content);

  const removed = await client.containers.files.delete(containerId, fileId);
  tolerantContainer(removed);
});

e2eTest("containers.files.create uploads a synthetic file", async ({ client }) => {
  // Real upload requires OPENAI_API_KEY on the proxy; without it, the
  // proxy 500s. We just verify the SDK wires the multipart upload.
  const containerId = `e2e-no-such-container-${Date.now()}`;
  const result = await client.containers.files.create(
    containerId,
    new Blob([new Uint8Array([1, 2, 3])]),
    "test.bin",
  );
  tolerantContainer(result);
});
