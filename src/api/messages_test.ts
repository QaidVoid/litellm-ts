import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { MessagesResponse, MessagesStreamEvent } from "./messages.ts";
import type { ApiError } from "../error.ts";
import { isErr, isOk, type Result } from "../result.ts";

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

const collectStream = async <T, E>(
  iter: AsyncIterable<Result<T, E>>,
): Promise<Array<Result<T, E>>> => {
  const out: Array<Result<T, E>> = [];
  for await (const v of iter) out.push(v);
  return out;
};

const messagesResponse: MessagesResponse = {
  id: "msg_01abc",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-4-5",
  content: [{ type: "text", text: "hi" }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 3, output_tokens: 2 },
};

Deno.test("client.messages.create posts to /v1/messages with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(messagesResponse), {
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
  const result = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 64,
    messages: [{ role: "user", content: "hello" }],
    system: "Be concise.",
  });
  assertEquals(result, { ok: true, value: messagesResponse });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/messages");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body.system, "Be concise.");
  assertEquals(body.max_tokens, 64);
});

Deno.test("client.messages.createStream yields typed Anthropic events", async () => {
  const events: MessagesStreamEvent[] = [
    { type: "message_start", message: messagesResponse },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "hi" },
    },
    { type: "content_block_stop", index: 0 },
    { type: "message_stop" },
  ];
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  const { fetch } = recordingFetch([
    () =>
      new Response(body, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const collected = await collectStream(
    client.messages.createStream({
      model: "claude-sonnet-4-5",
      max_tokens: 8,
      messages: [{ role: "user", content: "hi" }],
    }),
  );
  assertStrictEquals(collected.length, 5);
  for (const c of collected) assertStrictEquals(isOk(c), true);
});

Deno.test("client.messages.createStream surfaces upstream HTTP error as a single failure", async () => {
  const { fetch } = recordingFetch([
    () => new Response("denied", { status: 401, statusText: "Unauthorized" }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const collected = await collectStream(
    client.messages.createStream({
      model: "claude-sonnet-4-5",
      max_tokens: 8,
      messages: [{ role: "user", content: "hi" }],
    }),
  );
  assertStrictEquals(collected.length, 1);
  const only = collected[0] as Result<MessagesStreamEvent, ApiError>;
  assertStrictEquals(isErr(only), true);
  if (!only.ok) {
    assertStrictEquals(only.error.kind, "auth");
  }
});
