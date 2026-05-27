export type {
  Capability,
  Mode,
  ModelEntry,
  ModelId,
  ModelsByCapability,
  ModelsByMode,
  ModelsWithCapability,
  ModelsWithMode,
  Provider,
} from "./registry.ts";

export { MODELS } from "./registry.ts";

/**
 * Cast a proxy-registered model alias as a value the SDK's typed endpoints
 * will accept.
 *
 * The SDK ships a catalog of known models with declared modes and capabilities;
 * bare strings are checked against that catalog at the call site. When you
 * call against a LiteLLM proxy that has its own aliases (e.g. routing
 * `"my-fast-chat"` to a backend), wrap the alias in `customModel("my-fast-chat")`
 * to tell the SDK "trust me, this is fine."
 *
 * The SDK cannot verify the alias exists or that the upstream declares the
 * mode/capabilities the endpoint requires. The proxy is the source of truth.
 * Runtime: this is identity. Only the type signature changes.
 */
export const customModel = (name: string): never => name as never;
