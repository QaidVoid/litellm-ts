import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";

const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): {
  fetch: typeof fetch;
  calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }>;
} => {
  const calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }> = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) throw new Error(`mock fetch exhausted at call ${i}`);
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

const baseClient = (fetchFn: typeof fetch) =>
  createClient({ baseUrl: "https://api.test", apiKey: "test", maxRetries: 0, fetch: fetchFn });

Deno.test("videos.generate POSTs JSON to /v1/videos", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ id: "v-1", object: "video", status: "queued" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.videos.generate({
    model: "vertex_ai/veo-3.0-generate-001",
    prompt: "A sunset over the ocean",
  });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/videos");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body.prompt, "A sunset over the ocean");
});

Deno.test("videos.content downloads bytes from /content", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const { fetch, calls } = recordingFetch([
    () => new Response(bytes, { status: 200, headers: { "content-type": "video/mp4" } }),
  ]);
  const client = baseClient(fetch);
  const result = await client.videos.content("v-1");
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/v1/videos/v-1/content");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(Array.from(result.value), [1, 2, 3, 4]);
  }
});

Deno.test("videos.createCharacter posts multipart with name and video", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(
        JSON.stringify({ id: "c-1", object: "character", created_at: 0, name: "alice" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  ]);
  const client = baseClient(fetch);
  await client.videos.createCharacter({
    name: "alice",
    video: new Blob([new Uint8Array([0])], { type: "video/mp4" }),
  });
  const init = calls[0]?.init;
  assertEquals(init?.method, "POST");
  const fd = init?.body as FormData;
  assertStrictEquals(fd.get("name"), "alice");
  const video = fd.get("video");
  if (video instanceof Blob) {
    assertStrictEquals(video.type, "video/mp4");
  } else {
    throw new Error("expected video to be a Blob");
  }
});
