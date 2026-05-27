import { assert, assertStrictEquals } from "@std/assert";
import type { ApiError, Result } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

// Video generation requires a Sora / Bedrock / etc. backend. The local
// proxy reliably 500/400s every method when no real video provider is
// configured. We smoke each method to confirm the request shape is built
// correctly and reaches the proxy.

const tolerateUpstream = <T>(result: Result<T, ApiError>): void => {
  if (result.ok) return;
  assertStrictEquals(result.error.kind, "http");
  if (result.error.kind === "http") {
    assert(
      result.error.status === 500 || result.error.status === 400 ||
        result.error.status === 404,
      `unexpected status: ${result.error.status}`,
    );
  }
};

e2eTest("videos.generate routes to POST /v1/videos", async ({ client, models }) => {
  const result = await client.videos.generate({
    model: models.chat,
    prompt: "a sunset over the ocean",
    seconds: "4",
    size: "1280x720",
  });
  tolerateUpstream(result);
  if (result.ok) {
    assertStrictEquals(result.value.object, "video");
  }
}, { requires: ["chat"] });

e2eTest("videos.list routes to GET /v1/videos", async ({ client }) => {
  const result = await client.videos.list();
  tolerateUpstream(result);
  if (result.ok) {
    assert(Array.isArray(result.value.data));
  }
});

e2eTest("videos.retrieve routes to GET /v1/videos/{id}", async ({ client }) => {
  const result = await client.videos.retrieve("video_not_real");
  // Expected to fail (id doesn't exist). The proxy returns 400 or 500.
  assert(!result.ok, "expected an error for a fake id");
  if (result.error.kind === "http") {
    assert(
      result.error.status === 400 || result.error.status === 404 ||
        result.error.status === 500,
      `unexpected status: ${result.error.status}`,
    );
  }
});

e2eTest("videos.content routes to GET /v1/videos/{id}/content", async ({ client }) => {
  const result = await client.videos.content("video_not_real");
  // Some proxy builds happily return an empty/dummy body for an unknown id
  // instead of 4xx. The route wiring is the only thing we can assert.
  if (result.ok) {
    assert(result.value instanceof Uint8Array, "expected a Uint8Array body");
    return;
  }
  if (result.error.kind === "http") {
    assert(
      result.error.status === 400 || result.error.status === 404 ||
        result.error.status === 500,
      `unexpected status: ${result.error.status}`,
    );
  }
});

e2eTest("videos.remix routes to POST /v1/videos/{id}/remix", async ({ client }) => {
  const result = await client.videos.remix("video_not_real", {
    prompt: "make it darker",
  });
  tolerateUpstream(result);
});

e2eTest("videos.edit routes to POST /v1/videos/edits", async ({ client }) => {
  const result = await client.videos.edit({
    prompt: "make it darker",
    video: { id: "video_not_real" },
  });
  tolerateUpstream(result);
});

e2eTest("videos.extend routes to POST /v1/videos/extensions", async ({ client }) => {
  const result = await client.videos.extend({
    prompt: "keep panning",
    seconds: "2",
    video: { id: "video_not_real" },
  });
  tolerateUpstream(result);
});

e2eTest("videos.createCharacter sends multipart to /v1/videos/characters", async ({ client }) => {
  const bytes = new Blob([new Uint8Array(1024)], { type: "video/mp4" });
  const result = await client.videos.createCharacter({
    name: "test-character",
    video: bytes,
    filename: "ref.mp4",
  });
  tolerateUpstream(result);
});

e2eTest("videos.retrieveCharacter routes to /v1/videos/characters/{id}", async ({ client }) => {
  const result = await client.videos.retrieveCharacter("char_not_real");
  assert(!result.ok, "expected an error for a fake id");
  if (result.error.kind === "http") {
    assert(
      result.error.status === 400 || result.error.status === 404 ||
        result.error.status === 500,
      `unexpected status: ${result.error.status}`,
    );
  }
});
