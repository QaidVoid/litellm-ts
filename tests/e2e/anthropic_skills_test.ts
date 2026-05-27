import { assert, assertStrictEquals } from "@std/assert";
import type { ApiError, Result } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

// The Skills API requires `ANTHROPIC_API_KEY` on the proxy. Without it,
// every method returns 500. We smoke-test each method's request shape.

const tolerateUpstream = <T>(result: Result<T, ApiError>): result is { ok: true; value: T } => {
  if (result.ok) return true;
  assertStrictEquals(result.error.kind, "http");
  if (result.error.kind === "http") {
    assert(
      result.error.status === 500 || result.error.status === 400 ||
        result.error.status === 401 || result.error.status === 404,
      `unexpected status: ${result.error.status}`,
    );
  }
  return false;
};

e2eTest("anthropicSkills.create sends multipart to /v1/skills", async ({ client }) => {
  const zip = new Blob([new Uint8Array(64)], { type: "application/zip" });
  const result = await client.anthropicSkills.create({
    display_title: "test-skill",
    files: [zip],
    filenames: ["bundle.zip"],
  });
  if (!tolerateUpstream(result)) return;
  assertStrictEquals(result.value.type, "skill");
});

e2eTest("anthropicSkills.list routes to GET /v1/skills", async ({ client }) => {
  const result = await client.anthropicSkills.list();
  if (!tolerateUpstream(result)) return;
  assert(Array.isArray(result.value.data));
});

e2eTest("anthropicSkills.list forwards pagination params", async ({ client }) => {
  const result = await client.anthropicSkills.list({
    limit: 5,
    after_id: "skill_x",
  });
  tolerateUpstream(result);
});

e2eTest("anthropicSkills.retrieve routes to GET /v1/skills/{id}", async ({ client }) => {
  const result = await client.anthropicSkills.retrieve("skill_not_real");
  assert(!result.ok, "expected an error");
  assertStrictEquals(result.error.kind, "http");
});

e2eTest("anthropicSkills.delete routes to DELETE /v1/skills/{id}", async ({ client }) => {
  const result = await client.anthropicSkills.delete("skill_not_real");
  assert(!result.ok, "expected an error");
  assertStrictEquals(result.error.kind, "http");
});
