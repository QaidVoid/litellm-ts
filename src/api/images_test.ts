import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { ImageGenerationResponse } from "./images.ts";

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

const imageResponse: ImageGenerationResponse = {
  created: 1716,
  data: [{ url: "https://x/image.png", revised_prompt: "A clearer prompt" }],
};

Deno.test("client.images.generate posts to /v1/images/generations", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(imageResponse), {
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
  const result = await client.images.generate({
    model: "dall-e-3",
    prompt: "a litellm logo in space",
    n: 1,
    size: "1024x1024",
  });
  assertEquals(result, { ok: true, value: imageResponse });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/images/generations");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, {
    model: "dall-e-3",
    prompt: "a litellm logo in space",
    n: 1,
    size: "1024x1024",
  });
});

Deno.test({
  name: "type-level: images.generate is constrained to image_generation-mode models",
  ignore: true,
  fn: () => {
    const client = createClient({ baseUrl: "https://x", apiKey: "k" });

    void client.images.generate({
      model: "dall-e-3",
      prompt: "a dog",
    });

    void client.images.generate({
      // @ts-expect-error gpt-4o is a chat model
      model: "gpt-4o",
      prompt: "a dog",
    });
  },
});
