import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Status probes for the maintenance routes. We don't trigger a real
// reload here (it'd hit upstream provider catalogs); the routes are
// expected to answer even when no reload is in flight.

e2eTest(
  "admin.maintenance.modelCostMapReloadStatus returns a status payload",
  async ({ client }) => {
    const result = await client.maintenance.modelCostMapReloadStatus();
    assert(result.ok, `modelCostMapReloadStatus failed: ${JSON.stringify(result)}`);
  },
);

e2eTest(
  "admin.maintenance.anthropicBetaHeadersReloadStatus returns a status payload",
  async ({ client }) => {
    const result = await client.maintenance.anthropicBetaHeadersReloadStatus();
    assert(result.ok, `anthropicBetaHeadersReloadStatus failed: ${JSON.stringify(result)}`);
  },
);
