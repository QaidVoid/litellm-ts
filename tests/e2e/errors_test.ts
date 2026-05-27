import { assert, assertStrictEquals } from "@std/assert";
import { createClient } from "../../mod.ts";
import { e2eTest, MODELS, proxyReachable } from "./_helpers.ts";

const baseUrl = Deno.env.get("LITELLM_BASE_URL") ?? "http://localhost:4000";

Deno.test({
  name: "auth error: bogus bearer token surfaces kind=auth",
  async fn(t) {
    if (!await proxyReachable()) {
      t.step({ name: "skipped: proxy unreachable", fn: () => {}, ignore: true });
      return;
    }
    if (MODELS.chat === undefined) {
      t.step({
        name: "skipped: LITELLM_E2E_CHAT_MODEL not set",
        fn: () => {},
        ignore: true,
      });
      return;
    }
    const client = createClient({ baseUrl, apiKey: "sk-not-a-real-key", maxRetries: 0 });
    const result = await client.chat.create({
      model: MODELS.chat,
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 5,
    });

    assert(!result.ok, "expected an error");
    assertStrictEquals(result.error.kind, "auth");
  },
});

e2eTest("unknown model surfaces kind=http", async ({ client }) => {
  const result = await client.chat.create({
    // Cast through unknown to bypass the literal-union model id type since
    // we explicitly want a name the proxy has never heard of.
    model: "test-this-model-does-not-exist" as unknown as Parameters<
      typeof client.chat.create
    >[0]["model"],
    messages: [{ role: "user", content: "hi" }],
    max_tokens: 5,
  });

  assert(!result.ok, "expected an error");
  assertStrictEquals(result.error.kind, "http");
  // The proxy returns 400 BadRequestError ("model not in model_list") for
  // unrecognized model ids; pin the status range rather than a specific code
  // since LiteLLM has tweaked it across releases.
  if (result.error.kind === "http") {
    assert(
      result.error.status === 400 || result.error.status === 404,
      `expected 400 or 404, got ${result.error.status}`,
    );
  }
});

e2eTest(
  "streaming surfaces a per-frame Result and terminates when the upstream completes",
  async ({ client }) => {
    // Verify the iterator closes naturally rather than hanging or yielding
    // anything after the upstream sends [DONE].
    const stream = client.chat.createStream({
      model: MODELS.chat!,
      messages: [{ role: "user", content: "Say 'x'." }],
      max_tokens: 5,
      temperature: 0,
    });

    let frames = 0;
    for await (const chunk of stream) {
      if (chunk.ok) frames++;
      if (frames > 200) throw new Error("stream did not terminate");
    }
    assert(frames > 0, "expected at least one frame");
  },
  { requires: ["chat"] },
);

e2eTest("admin.health.liveliness returns a non-JSON body the SDK accepts", async ({ client }) => {
  // The liveliness endpoint returns a plain-text body (`"I'm alive!"`)
  // rather than JSON. This exercises the SDK's content-type handling on a
  // route the proxy always answers, regardless of upstream provider config.
  const result = await client.health.liveliness();
  assert(result.ok, `liveliness should succeed: ${JSON.stringify(result)}`);
});
