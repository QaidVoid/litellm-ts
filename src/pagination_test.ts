import { assertEquals } from "@std/assert";
import { httpError } from "./error.ts";
import { paginate } from "./pagination.ts";
import { err, ok } from "./result.ts";

Deno.test("paginate yields each item across pages then stops on undefined cursor", async () => {
  const pages: ReadonlyArray<{ items: number[]; next: string | undefined }> = [
    { items: [1, 2], next: "p2" },
    { items: [3, 4], next: "p3" },
    { items: [5], next: undefined },
  ];
  const seen: Array<string | undefined> = [];
  let i = 0;
  const results: number[] = [];
  for await (
    const r of paginate<number, string>(undefined, (cursor) => {
      seen.push(cursor);
      const page = pages[i++]!;
      return Promise.resolve(ok({ items: page.items, next: page.next }));
    })
  ) {
    if (r.ok) results.push(r.value);
  }
  assertEquals(results, [1, 2, 3, 4, 5]);
  assertEquals(seen, [undefined, "p2", "p3"]);
});

Deno.test("paginate yields the error from a failed page and stops iteration", async () => {
  let calls = 0;
  const errors: Array<{ kind: string }> = [];
  const items: number[] = [];
  for await (
    const r of paginate<number, string>(undefined, () => {
      calls++;
      if (calls === 1) return Promise.resolve(ok({ items: [1, 2], next: "p2" }));
      return Promise.resolve(
        err(httpError({ status: 502, statusText: "Bad Gateway", body: "" })),
      );
    })
  ) {
    if (r.ok) items.push(r.value);
    else errors.push({ kind: r.error.kind });
  }
  assertEquals(calls, 2);
  assertEquals(items, [1, 2]);
  assertEquals(errors, [{ kind: "http" }]);
});

Deno.test("paginate stops fetching when the consumer breaks", async () => {
  let calls = 0;
  for await (
    const r of paginate<number, string>(undefined, () => {
      calls++;
      return Promise.resolve(ok({ items: [calls, calls + 1], next: `c${calls}` }));
    })
  ) {
    if (r.ok && r.value === 2) break;
  }
  assertEquals(calls, 1);
});
