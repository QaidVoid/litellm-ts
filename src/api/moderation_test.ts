import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { ModerationResponse } from "./moderation.ts";

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

const moderationResponse: ModerationResponse = {
  id: "modr-abc",
  model: "omni-moderation-latest",
  results: [
    {
      flagged: false,
      categories: { hate: false, violence: false },
      category_scores: { hate: 0.001, violence: 0.002 },
    },
  ],
};

Deno.test("client.moderation.create posts to /v1/moderations with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(moderationResponse), {
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
  const result = await client.moderation.create({
    model: "omni-moderation-latest",
    input: "is this a problem?",
  });
  assertEquals(result, { ok: true, value: moderationResponse });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/moderations");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, {
    model: "omni-moderation-latest",
    input: "is this a problem?",
  });
});

Deno.test("client.moderation.create accepts an array of inputs", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(moderationResponse), {
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
  await client.moderation.create({
    model: "omni-moderation-latest",
    input: ["a", "b", "c"],
  });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body.input, ["a", "b", "c"]);
});
