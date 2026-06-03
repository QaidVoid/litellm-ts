import { assertStrictEquals } from "@std/assert";
import { clientReturning, recorded } from "./_testutil.ts";

Deno.test("public.modelHub GETs /public/model_hub", async () => {
  const { client, calls } = clientReturning([]);
  await client.public.modelHub();
  const r = recorded(calls);
  assertStrictEquals(r.method, "GET");
  assertStrictEquals(r.pathname, "/public/model_hub");
});

Deno.test("public.providers GETs /public/providers", async () => {
  const { client, calls } = clientReturning([]);
  await client.public.providers();
  assertStrictEquals(recorded(calls).pathname, "/public/providers");
});

Deno.test("public.endpoints GETs /public/endpoints", async () => {
  const { client, calls } = clientReturning({ endpoints: [] });
  await client.public.endpoints();
  assertStrictEquals(recorded(calls).pathname, "/public/endpoints");
});

Deno.test("public.litellmBlogPosts GETs /public/litellm_blog_posts", async () => {
  const { client, calls } = clientReturning({ posts: [] });
  await client.public.litellmBlogPosts();
  assertStrictEquals(recorded(calls).pathname, "/public/litellm_blog_posts");
});
