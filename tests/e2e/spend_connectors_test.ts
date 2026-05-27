import { e2eTest } from "./_helpers.ts";

// Spend connectors (Vantage, CloudZero) are enterprise integrations.
// Without configured credentials on the proxy, every endpoint surfaces
// some 4xx/5xx state. We just verify the SDK wires each call.

const tolerantConnector = (result: {
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
  throw new Error(`unexpected connector error: ${JSON.stringify(e)}`);
};

e2eTest("admin.spendConnectors.vantage.settings reads masked settings", async ({ client }) => {
  const result = await client.spendConnectors.vantage.settings();
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.vantage.updateSettings smoke", async ({ client }) => {
  const result = await client.spendConnectors.vantage.updateSettings({
    base_url: "https://api.vantage.sh",
  });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.vantage.init smoke", async ({ client }) => {
  const result = await client.spendConnectors.vantage.init({
    api_key: "fake-key",
    integration_token: "fake-token",
  });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.vantage.dryRun smoke", async ({ client }) => {
  const result = await client.spendConnectors.vantage.dryRun({ limit: 1 });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.vantage.export smoke", async ({ client }) => {
  const result = await client.spendConnectors.vantage.export({ limit: 1 });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.vantage.delete smoke", async ({ client }) => {
  const result = await client.spendConnectors.vantage.delete();
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.cloudzero.settings reads masked settings", async ({ client }) => {
  const result = await client.spendConnectors.cloudzero.settings();
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.cloudzero.updateSettings smoke", async ({ client }) => {
  const result = await client.spendConnectors.cloudzero.updateSettings({
    timezone: "UTC",
  });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.cloudzero.init smoke", async ({ client }) => {
  const result = await client.spendConnectors.cloudzero.init({
    api_key: "fake-key",
    connection_id: "fake-connection",
    timezone: "UTC",
  });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.cloudzero.dryRun smoke", async ({ client }) => {
  const result = await client.spendConnectors.cloudzero.dryRun({ limit: 1 });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.cloudzero.export smoke", async ({ client }) => {
  const result = await client.spendConnectors.cloudzero.export({ limit: 1 });
  tolerantConnector(result);
});

e2eTest("admin.spendConnectors.cloudzero.delete smoke", async ({ client }) => {
  const result = await client.spendConnectors.cloudzero.delete();
  tolerantConnector(result);
});
