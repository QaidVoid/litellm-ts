import { assert, assertStrictEquals } from "@std/assert";
import type { EmbeddingsDatum } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

e2eTest(
  "embeddings.create returns a single vector for a string input",
  async ({ client, models }) => {
    const result = await client.embeddings.create({
      model: models.embed,
      input: "hello world",
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    assertStrictEquals(result.value.object, "list");
    assertStrictEquals(result.value.data.length, 1);
    const first = result.value.data[0];
    assert(first !== undefined);
    assertStrictEquals(first.object, "embedding");
    assertStrictEquals(first.index, 0);
    assert(Array.isArray(first.embedding));
    assert(first.embedding.length > 0, "expected non-empty embedding");
    assert(
      first.embedding.every((n) => typeof n === "number"),
      "embedding values must be numbers",
    );
  },
  { requires: ["embed"] },
);

e2eTest("embeddings.create handles a batch of inputs", async ({ client, models }) => {
  const inputs = ["one", "two", "three"];
  const result = await client.embeddings.create({
    model: models.embed,
    input: inputs,
  });

  assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
  assertStrictEquals(result.value.data.length, inputs.length);
  for (let i = 0; i < inputs.length; i++) {
    const datum: EmbeddingsDatum | undefined = result.value.data[i];
    assert(datum !== undefined);
    assertStrictEquals(datum.index, i);
    assert(datum.embedding.length > 0);
  }
}, { requires: ["embed"] });

e2eTest(
  "embeddings via a second backend produces a vector of the same shape",
  async ({ client, models }) => {
    const result = await client.embeddings.create({
      model: models.embedAlt,
      input: "hello world",
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    assertStrictEquals(result.value.data.length, 1);
    const vec = result.value.data[0]?.embedding;
    assert(vec !== undefined);
    assert(vec.length > 0);
  },
  { requires: ["embedAlt"] },
);

e2eTest("embeddings are stable across two identical calls", async ({ client, models }) => {
  const input = "the quick brown fox";
  const a = await client.embeddings.create({ model: models.embed, input });
  const b = await client.embeddings.create({ model: models.embed, input });

  assert(a.ok && b.ok);
  const va = a.value.data[0]?.embedding;
  const vb = b.value.data[0]?.embedding;
  assert(va !== undefined && vb !== undefined);
  // The default `encoding_format` is `"float"`, so the proxy returns number arrays.
  assert(Array.isArray(va) && Array.isArray(vb), "expected float embeddings");
  assertStrictEquals(va.length, vb.length);

  for (let i = 0; i < Math.min(8, va.length); i++) {
    const av: number | undefined = va[i];
    const bv: number | undefined = vb[i];
    assert(av !== undefined && bv !== undefined);
    assert(Math.abs(av - bv) < 1e-5, `coord ${i} drifted: ${av} vs ${bv}`);
  }
}, { requires: ["embed"] });
