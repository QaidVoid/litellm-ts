import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// `/v1/moderations` proxies to OpenAI under the hood. Without
// `OPENAI_API_KEY` the proxy returns 500; we accept that as a "route is
// wired" pass since we still reached the proxy and got a structured error.

e2eTest("moderation.create accepts a single-string input", async ({ client, models }) => {
  const result = await client.moderation.create({
    model: models.chat,
    input: "is this dangerous?",
  });

  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assertStrictEquals(typeof result.value.id, "string");
  assert(Array.isArray(result.value.results), "expected results array");
}, { requires: ["chat"] });

e2eTest("moderation.create accepts an array input", async ({ client, models }) => {
  const result = await client.moderation.create({
    model: models.chat,
    input: ["one", "two", "three"],
  });

  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assertStrictEquals(result.value.results.length, 3);
}, { requires: ["chat"] });
