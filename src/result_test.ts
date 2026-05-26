import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  andThen,
  err,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  type Result,
  tryAsync,
  trySync,
  unwrapOr,
} from "./result.ts";

Deno.test("ok wraps a value", () => {
  assertEquals(ok(42), { ok: true, value: 42 });
});

Deno.test("err wraps an error", () => {
  assertEquals(err("bad"), { ok: false, error: "bad" });
});

Deno.test("isOk and isErr narrow opposite branches", () => {
  const good: Result<number, string> = ok(1);
  const bad: Result<number, string> = err("x");
  assertEquals(isOk(good), true);
  assertEquals(isErr(good), false);
  assertEquals(isOk(bad), false);
  assertEquals(isErr(bad), true);
});

Deno.test("map transforms ok and passes err through", () => {
  assertEquals(map(ok(2), (v) => v * 3), { ok: true, value: 6 });
  const bad: Result<number, string> = err("oops");
  assertEquals(map(bad, (v) => v + 1), { ok: false, error: "oops" });
});

Deno.test("mapErr transforms err and passes ok through", () => {
  const bad: Result<number, string> = err("oops");
  assertEquals(mapErr(bad, (e) => e.length), { ok: false, error: 4 });
  const good: Result<number, string> = ok(7);
  assertEquals(mapErr(good, (e) => e.length), { ok: true, value: 7 });
});

Deno.test("andThen chains on success and short-circuits on failure", () => {
  const safeDiv = (a: number, b: number): Result<number, string> =>
    b === 0 ? err("div by zero") : ok(a / b);
  assertEquals(andThen(ok(10), (v) => safeDiv(v, 2)), { ok: true, value: 5 });
  assertEquals(andThen(ok(10), (v) => safeDiv(v, 0)), {
    ok: false,
    error: "div by zero",
  });
  const upstream: Result<number, string> = err("upstream");
  assertEquals(andThen(upstream, (v) => ok(v + 1)), {
    ok: false,
    error: "upstream",
  });
});

Deno.test("unwrapOr returns value on ok, default on err", () => {
  assertStrictEquals(unwrapOr(ok(9), 0), 9);
  const bad: Result<number, string> = err("nope");
  assertStrictEquals(unwrapOr(bad, -1), -1);
});

Deno.test("match dispatches to the right handler", () => {
  assertStrictEquals(match(ok(3), { ok: (v) => v * 2, err: () => 0 }), 6);
  const bad: Result<number, string> = err("oops");
  assertStrictEquals(
    match(bad, { ok: () => 0, err: (e) => e.length }),
    4,
  );
});

Deno.test("tryAsync captures resolved values and thrown errors", async () => {
  const good = await tryAsync(() => Promise.resolve(42));
  assertEquals(good, { ok: true, value: 42 });

  const bad = await tryAsync(() => Promise.reject(new Error("kaboom")));
  assertEquals(bad.ok, false);
  if (!bad.ok) {
    assertStrictEquals((bad.error as Error).message, "kaboom");
  }
});

Deno.test("trySync captures returned values and thrown errors", () => {
  const good = trySync(() => "hi");
  assertEquals(good, { ok: true, value: "hi" });

  const bad = trySync(() => {
    throw new Error("boom");
  });
  assertEquals(bad.ok, false);
  if (!bad.ok) {
    assertStrictEquals((bad.error as Error).message, "boom");
  }
});
