import { assertEquals, assertStrictEquals } from "@std/assert";
import type { ChatCompletion } from "./api/chat.ts";
import { createClient } from "./client.ts";

type FetchCall = {
  readonly input: string | URL | Request;
  readonly init: RequestInit | undefined;
};

const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): { fetch: typeof fetch; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) throw new Error(`mock fetch exhausted at call ${i}`);
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

const completion: ChatCompletion = {
  id: "chatcmpl-abc",
  object: "chat.completion",
  created: 1716,
  model: "gpt-4o",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hello back" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
};

Deno.test("client.chat.create posts to /v1/chat/completions with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(completion), {
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
  const result = await client.chat.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "hello" }],
    temperature: 0,
  });
  assertEquals(result, { ok: true, value: completion });
  assertStrictEquals(calls.length, 1);
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/chat/completions");
  assertStrictEquals(calls[0]?.init?.method, "POST");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hello" }],
    temperature: 0,
  });
});

Deno.test("client.chat.create surfaces HTTP errors as a Result failure", async () => {
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
  const result = await client.chat.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "x" }],
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assertStrictEquals(result.error.status, 400);
    }
  }
});

Deno.test("client.chat.create accepts multi-part user content with image_url", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(completion), {
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
  await client.chat.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "describe" },
          { type: "image_url", image_url: { url: "https://x/y.png", detail: "low" } },
        ],
      },
    ],
  });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body.messages[0].content[1].image_url.url, "https://x/y.png");
});

Deno.test("client.chat.create accepts a tool call round-trip", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(completion), {
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
  await client.chat.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "what's the weather?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "get_weather", arguments: '{"city":"SF"}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: '{"temp":62}',
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Lookup the weather in a city",
          parameters: { type: "object", properties: { city: { type: "string" } } },
        },
      },
    ],
    tool_choice: "auto",
  });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.tools[0].function.name, "get_weather");
  assertStrictEquals(body.tool_choice, "auto");
});
