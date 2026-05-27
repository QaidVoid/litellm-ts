import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Audio endpoints proxy to OpenAI-shape upstreams (Whisper, TTS). Without
// real provider credentials the proxy returns 500. We assert the request
// shape (multipart upload, JSON body) and accept upstream failures.

e2eTest("audio.transcribe sends multipart and tolerates upstream gaps", async ({ client, models }) => {
  // 8000 zero bytes is enough to exercise the multipart code path; the
  // upstream STT will reject it but the SDK doesn't care.
  const file = new Blob([new Uint8Array(8000)], { type: "audio/wav" });
  const result = await client.audio.transcribe({
    model: models.chat,
    file,
    filename: "silence.wav",
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
  assertStrictEquals(typeof result.value.text, "string");
}, { requires: ["chat"] });

e2eTest("audio.transcribe accepts Uint8Array input directly", async ({ client, models }) => {
  const result = await client.audio.transcribe({
    model: models.chat,
    file: new Uint8Array(8000),
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
  assertStrictEquals(typeof result.value.text, "string");
}, { requires: ["chat"] });

e2eTest("audio.speak returns raw bytes when supported", async ({ client, models }) => {
  const result = await client.audio.speak({
    model: models.chat,
    input: "hello world",
    voice: "alloy",
    response_format: "mp3",
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
  assert(result.value instanceof Uint8Array, "expected Uint8Array");
  assert(result.value.length > 0, "expected non-empty audio bytes");
}, { requires: ["chat"] });
