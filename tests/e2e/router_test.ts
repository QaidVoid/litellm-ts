import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.router.settings returns the router config with values", async ({ client }) => {
  const result = await client.router.settings();
  assert(result.ok, `settings failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.fields), "expected fields array");
  assert(
    typeof result.value.current_values === "object" && result.value.current_values !== null,
    "expected current_values object",
  );
  assert(
    typeof result.value.routing_strategy_descriptions === "object" &&
      result.value.routing_strategy_descriptions !== null,
    "expected routing_strategy_descriptions object",
  );
});

e2eTest("admin.router.fields returns field metadata only", async ({ client }) => {
  const result = await client.router.fields();
  assert(result.ok, `fields failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.fields), "expected fields array");
  assert(
    typeof result.value.routing_strategy_descriptions === "object" &&
      result.value.routing_strategy_descriptions !== null,
    "expected routing_strategy_descriptions object",
  );
});
