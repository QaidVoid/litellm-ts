import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

/**
 * Registers a throwaway test model, exercises retrieve / list / update /
 * delete, and tears it down. The model is configured as a Bedrock alias
 * that the proxy will never call (no real upstream is hit), so this test
 * doesn't depend on any provider being reachable.
 */
e2eTest("admin.proxyModels CRUD round-trip", async ({ client }) => {
  const modelName = `e2e-throwaway-${Date.now()}`;

  const created = await client.proxyModels.register({
    model_name: modelName,
    litellm_params: {
      model: "bedrock/anthropic.claude-3-sonnet-20240229-v1:0",
      aws_region_name: "us-east-1",
    },
    model_info: { description: "e2e throwaway" },
  });
  assert(created.ok, `register failed: ${JSON.stringify(created)}`);
  const modelId = created.value.model_id;
  assert(typeof modelId === "string" && modelId.length > 0, "expected model_id");

  try {
    // Retrieve by id round-trips the public name.
    const retrieved = await client.proxyModels.retrieve(modelId);
    assert(retrieved.ok, `retrieve failed: ${JSON.stringify(retrieved)}`);
    assertStrictEquals(retrieved.value.model_name, modelName);

    // List eventually contains the model.
    const listed = await client.proxyModels.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.data.some((m) => m.model_name === modelName),
      "registered model missing from list",
    );

    // Update mutates the model_info description in place.
    const updated = await client.proxyModels.update(modelId, {
      model_info: { description: "updated" },
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);
  } finally {
    const deleted = await client.proxyModels.delete(modelId);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.proxyModels.listOpenAI mirrors /v1/models", async ({ client }) => {
  const result = await client.proxyModels.listOpenAI();
  assert(result.ok, `listOpenAI failed: ${JSON.stringify(result)}`);
  assertStrictEquals(result.value.object, "list");
  assert(Array.isArray(result.value.data));
});

e2eTest("admin.proxyModels.settings reports the active provider catalog", async ({ client }) => {
  const result = await client.proxyModels.settings();
  assert(result.ok, `settings failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});
