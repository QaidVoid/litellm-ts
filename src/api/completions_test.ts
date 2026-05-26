import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { CompletionResponse } from "./completions.ts";

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

const sampleCompletion: CompletionResponse = {
  id: "cmpl-1",
  object: "text_completion",
  created: 1716,
  model: "gpt-3.5-turbo-instruct",
  choices: [{ text: "hello", index: 0, finish_reason: "stop" }],
};

Deno.test("completions.create POSTs to /v1/completions with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleCompletion), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.completions.create({
    model: "gpt-3.5-turbo-instruct",
    prompt: "Once upon a time",
    max_tokens: 32,
  });
  assertEquals(result, { ok: true, value: sampleCompletion });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/completions");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.prompt, "Once upon a time");
});
