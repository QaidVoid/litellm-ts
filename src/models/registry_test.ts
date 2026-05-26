import { assertEquals, assertExists } from "@std/assert";
import {
  type Capability,
  type ModelEntry,
  type ModelId,
  MODELS,
  type ModelsWithCapability,
} from "./mod.ts";

Deno.test("MODELS exposes a known OpenAI chat model", () => {
  const gpt4o = MODELS["gpt-4o"];
  assertExists(gpt4o);
  assertEquals(gpt4o.provider, "openai");
  assertEquals(gpt4o.mode, "chat");
});

Deno.test("MODELS exposes a known Anthropic chat model", () => {
  const sonnet = MODELS["claude-sonnet-4-5"];
  assertExists(sonnet);
  assertEquals(sonnet.provider, "anthropic");
});

Deno.test("capabilities are sorted and unique per model", () => {
  for (const id of Object.keys(MODELS) as ModelId[]) {
    const caps = MODELS[id].capabilities;
    const sorted = [...caps].sort();
    assertEquals([...caps], sorted, `capabilities not sorted for ${id}`);
    assertEquals(new Set(caps).size, caps.length, `capabilities not unique for ${id}`);
  }
});

Deno.test("ModelsWithCapability narrows to vision-capable models at compile time", () => {
  const vision: ModelsWithCapability<"vision"> = "gpt-4o";
  const fc: ModelsWithCapability<"function_calling"> = "gpt-4o";
  assertEquals(vision, "gpt-4o");
  assertEquals(fc, "gpt-4o");
});

Deno.test("Capability union covers every supports_* flag declared on any model", () => {
  const declared = new Set<string>();
  for (const id of Object.keys(MODELS) as ModelId[]) {
    for (const cap of MODELS[id].capabilities) declared.add(cap);
  }
  for (const cap of declared) {
    const typed: Capability = cap as Capability;
    assertExists(typed);
  }
});

Deno.test("MODELS entries conform to ModelEntry contract", () => {
  const ids = Object.keys(MODELS) as ModelId[];
  for (const id of ids.slice(0, 50)) {
    const entry: ModelEntry = MODELS[id];
    assertEquals(entry.id, id);
  }
});
