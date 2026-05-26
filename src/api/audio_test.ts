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

Deno.test("audio.transcribe sends a multipart body with the file blob", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ text: "hello world" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const audio = new Uint8Array([1, 2, 3, 4]);
  const result = await client.audio.transcribe({
    model: "whisper-1",
    file: audio,
    filename: "clip.wav",
    language: "en",
  });
  assertEquals(result, { ok: true, value: { text: "hello world" } });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/audio/transcriptions");
  assertStrictEquals(calls[0]?.init?.method, "POST");
  assertEquals(calls[0]?.init?.body instanceof FormData, true);
  const fd = calls[0]?.init?.body as FormData;
  assertStrictEquals(fd.get("model"), "whisper-1");
  assertStrictEquals(fd.get("language"), "en");
  const file = fd.get("file");
  assertEquals(file instanceof Blob, true);
});

Deno.test("audio.speak returns the raw audio bytes", async () => {
  const audioBytes = new Uint8Array([0xff, 0xf3, 0x82, 0xc4]);
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(audioBytes, {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const result = await client.audio.speak({
    model: "tts-1",
    input: "hello world",
    voice: "alloy",
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals([...result.value], [...audioBytes]);
  }
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { model: "tts-1", input: "hello world", voice: "alloy" });
});

Deno.test("audio.speak surfaces an HTTP error as a Result failure", async () => {
  const { fetch } = recordingFetch([
    () =>
      new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        statusText: "Bad Request",
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const result = await client.audio.speak({
    model: "tts-1",
    input: "x",
    voice: "alloy",
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
  }
});
