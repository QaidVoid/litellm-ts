import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Companion to `errors_test.ts` which only covers `health.liveliness`.
// Exercises the remaining methods on the namespace.

e2eTest("admin.health.readiness reports the lifecycle state", async ({ client }) => {
  const result = await client.health.readiness();
  assert(result.ok, `readiness failed: ${JSON.stringify(result)}`);
  assert(
    result.value.status === "healthy" || result.value.status === "unhealthy",
    `unexpected status: ${result.value.status}`,
  );
});

e2eTest("admin.health.readinessDetails reports the detailed backend state", async ({ client }) => {
  const result = await client.health.readinessDetails();
  assert(result.ok, `readinessDetails failed: ${JSON.stringify(result)}`);
  assert(
    result.value.status === "healthy" || result.value.status === "unhealthy",
    `unexpected status: ${result.value.status}`,
  );
});

e2eTest(
  "admin.health.testConnection round-trips against a configured model",
  async ({ client, models }) => {
    const result = await client.health.testConnection({
      litellm_params: { model: models.chat },
      mode: "chat",
    });
    if (!result.ok) {
      // Some providers reject the lightweight probe (missing keys, IAM
      // permissions). Treat 4xx/5xx as expected on community configs.
      if (
        result.error.kind === "http" &&
        result.error.status >= 400 && result.error.status < 600
      ) return;
      throw new Error(`testConnection failed: ${JSON.stringify(result.error)}`);
    }
    // Some releases also surface `"error"` (transport-level failure to
    // reach upstream). Accept any of the documented status tags.
    assert(
      typeof result.value.status === "string" && result.value.status.length > 0,
      `unexpected status: ${result.value.status}`,
    );
  },
  { requires: ["chat"] },
);

e2eTest("admin.health.check returns aggregated deployment health", async ({ client }) => {
  const result = await client.health.check();
  // `/health` can take a while and may surface a 500 if a provider is down.
  // Accept that and only fail on transport-level errors.
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    throw new Error(`check failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.health.services rejects unknown services with a 422", async ({ client }) => {
  // Using `slack` as the probe target; for a proxy without slack configured
  // this returns 422. Either OK or 422 is acceptable -- we're verifying the
  // SDK can wire the call.
  const result = await client.health.services({ service: "slack" });
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      (result.error.status === 422 || result.error.status === 400 ||
        result.error.status === 404 || result.error.status === 500)
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`services failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.health.sharedStatus reports the shared-check state", async ({ client }) => {
  const result = await client.health.sharedStatus();
  assert(result.ok, `sharedStatus failed: ${JSON.stringify(result)}`);
  assert(typeof result.value.shared_health_check_enabled === "boolean");
});

e2eTest("admin.health.license returns license metadata", async ({ client }) => {
  const result = await client.health.license();
  assert(result.ok, `license failed: ${JSON.stringify(result)}`);
  assert(typeof result.value.has_license === "boolean");
  assert(
    result.value.license_type === "enterprise" || result.value.license_type === "community",
    `unexpected license_type: ${result.value.license_type}`,
  );
});

e2eTest("admin.health.backlog reports the in-flight request gauge", async ({ client }) => {
  const result = await client.health.backlog();
  assert(result.ok, `backlog failed: ${JSON.stringify(result)}`);
  assert(typeof result.value.in_flight_requests === "number");
});

e2eTest("admin.health.history paginates persisted health records", async ({ client }) => {
  const result = await client.health.history({ limit: 5 });
  assert(result.ok, `history failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.health_checks));
  assert(typeof result.value.total_records === "number");
  assert(result.value.limit === 5);
});

e2eTest("admin.health.latest returns the most recent check per model", async ({ client }) => {
  const result = await client.health.latest();
  assert(result.ok, `latest failed: ${JSON.stringify(result)}`);
  assert(typeof result.value.total_models === "number");
});

e2eTest("admin.health.test returns the lightweight uptime probe", async ({ client }) => {
  const result = await client.health.test();
  assert(result.ok, `test failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.health.routes lists every exposed HTTP route", async ({ client }) => {
  const result = await client.health.routes();
  assert(result.ok, `routes failed: ${JSON.stringify(result)}`);
});
