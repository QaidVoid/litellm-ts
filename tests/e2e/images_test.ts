import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Image endpoints proxy to DALL-E / SDXL / Bedrock. The local proxy
// happily returns an empty `data: []` for unknown providers (200) and
// 500s for others. Both are acceptable smoke outcomes.

e2eTest("images.generate routes to /v1/images/generations", async ({ client, models }) => {
  const result = await client.images.generate({
    model: models.chat,
    prompt: "a small orange cat",
    n: 1,
    size: "256x256",
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
  assert(typeof result.value.created === "number", "expected created timestamp");
  assert(Array.isArray(result.value.data), "expected data array");
}, { requires: ["chat"] });

e2eTest("images.edit sends multipart to /v1/images/edits", async ({ client, models }) => {
  // 1x1 transparent PNG header + zero padding is enough to exercise the
  // multipart code path; upstream will reject the bytes but the SDK's job
  // ends at "request was sent".
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...new Array(64).fill(0),
  ]);
  const result = await client.images.edit({
    model: models.chat,
    image: new Blob([png], { type: "image/png" }),
    prompt: "make it blue",
    imageFilename: "source.png",
    n: 1,
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
  assert(typeof result.value.created === "number");
  assert(Array.isArray(result.value.data));
}, { requires: ["chat"] });
