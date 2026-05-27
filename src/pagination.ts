import type { ApiError } from "./error.ts";
import type { Result } from "./result.ts";
import { err, ok } from "./result.ts";

/**
 * A single page returned by a `fetchPage` callback. `items` holds the
 * records on this page; `next` is the cursor for the next page, or
 * `undefined` when iteration should stop.
 */
export interface PaginationPage<T, TCursor> {
  readonly items: readonly T[];
  readonly next: TCursor | undefined;
}

/**
 * Drive cursor-based pagination as an `AsyncIterable<Result<T, ApiError>>`.
 *
 * The supplied `fetchPage` is invoked with the current cursor (initially
 * `initial`), expected to return one page at a time. Each item on each
 * page is yielded individually. When `fetchPage` reports `next: undefined`,
 * iteration ends. When `fetchPage` resolves to an error, that error is
 * yielded and iteration ends. Aborting the iteration (`break`) stops
 * further requests immediately.
 *
 * Each namespace's `iterate(...)` method is built on top of this helper;
 * it is exported so callers can apply the same pattern to bespoke list
 * endpoints.
 */
export const paginate = async function* <T, TCursor>(
  initial: TCursor | undefined,
  fetchPage: (
    cursor: TCursor | undefined,
  ) => Promise<Result<PaginationPage<T, TCursor>, ApiError>>,
): AsyncIterable<Result<T, ApiError>> {
  let cursor = initial;
  while (true) {
    const result = await fetchPage(cursor);
    if (!result.ok) {
      yield err(result.error);
      return;
    }
    for (const item of result.value.items) yield ok(item);
    if (result.value.next === undefined) return;
    cursor = result.value.next;
  }
};
