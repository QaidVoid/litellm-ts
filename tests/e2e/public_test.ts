import { e2eTest } from "./_helpers.ts";

// Public discovery endpoints don't require auth. They're stable on every
// recent proxy build; tolerate 404 only as a fallback for community
// builds that omit a route.
const tolerantPublic = (result: {
  ok: boolean;
  error?: { kind: string; status?: number };
}): void => {
  if (result.ok) return;
  const e = result.error!;
  if (e.kind === "auth") return;
  if (e.kind === "http") {
    const s = e.status ?? 0;
    if (s >= 400 && s < 600) return;
  }
  throw new Error(`unexpected public error: ${JSON.stringify(e)}`);
};

e2eTest("public.modelHub returns the model hub listing", async ({ client }) => {
  const result = await client.public.modelHub();
  tolerantPublic(result);
});

e2eTest("public.modelHubInfo returns the hub metadata", async ({ client }) => {
  const result = await client.public.modelHubInfo();
  tolerantPublic(result);
});

e2eTest("public.agentHub returns the agent listing", async ({ client }) => {
  const result = await client.public.agentHub();
  tolerantPublic(result);
});

e2eTest("public.agentFields returns the agent field metadata", async ({ client }) => {
  const result = await client.public.agentFields();
  tolerantPublic(result);
});

e2eTest("public.mcpHub returns the MCP hub listing", async ({ client }) => {
  const result = await client.public.mcpHub();
  tolerantPublic(result);
});

e2eTest("public.skillHub returns the skills listing", async ({ client }) => {
  const result = await client.public.skillHub();
  tolerantPublic(result);
});

e2eTest("public.providers returns the provider catalog", async ({ client }) => {
  const result = await client.public.providers();
  tolerantPublic(result);
});

e2eTest("public.providerFields returns per-provider field metadata", async ({ client }) => {
  const result = await client.public.providerFields();
  tolerantPublic(result);
});

e2eTest("public.endpoints returns the supported endpoint catalog", async ({ client }) => {
  const result = await client.public.endpoints();
  tolerantPublic(result);
});

e2eTest("public.litellmModelCostMap returns the cost map snapshot", async ({ client }) => {
  const result = await client.public.litellmModelCostMap();
  tolerantPublic(result);
});

e2eTest("public.litellmBlogPosts returns the blog post manifest", async ({ client }) => {
  const result = await client.public.litellmBlogPosts();
  tolerantPublic(result);
});
