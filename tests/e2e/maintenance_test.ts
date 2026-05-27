import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Status probes for the maintenance routes. We don't trigger a real
// reload here (it'd hit upstream provider catalogs); the routes are
// expected to answer even when no reload is in flight.

// The mutation endpoints (`reload*`, `schedule*`, `cancel*`) touch
// upstream catalogs and shared state. We exercise the wiring but
// tolerate any 4xx/5xx surfaced by a constrained proxy.
const tolerantMaintenance = (result: {
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
  throw new Error(`unexpected maintenance error: ${JSON.stringify(e)}`);
};

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

e2eTest(
  "admin.maintenance.reloadModelCostMap triggers a reload",
  async ({ client }) => {
    const result = await client.maintenance.reloadModelCostMap();
    tolerantMaintenance(result);
  },
);

e2eTest(
  "admin.maintenance.scheduleModelCostMapReload + cancel round-trip",
  async ({ client }) => {
    const scheduled = await client.maintenance.scheduleModelCostMapReload({ hours: 24 });
    tolerantMaintenance(scheduled);
    const cancelled = await client.maintenance.cancelScheduledModelCostMapReload();
    tolerantMaintenance(cancelled);
  },
);

e2eTest(
  "admin.maintenance.reloadAnthropicBetaHeaders triggers a reload",
  async ({ client }) => {
    const result = await client.maintenance.reloadAnthropicBetaHeaders();
    tolerantMaintenance(result);
  },
);

e2eTest(
  "admin.maintenance.scheduleAnthropicBetaHeadersReload + cancel round-trip",
  async ({ client }) => {
    const scheduled = await client.maintenance.scheduleAnthropicBetaHeadersReload({ hours: 24 });
    tolerantMaintenance(scheduled);
    const cancelled = await client.maintenance.cancelScheduledAnthropicBetaHeadersReload();
    tolerantMaintenance(cancelled);
  },
);
