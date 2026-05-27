import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../../client.ts";
import type { Team } from "./teams.ts";

const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): {
  fetch: typeof fetch;
  calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }>;
} => {
  const calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }> = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) throw new Error(`mock fetch exhausted at call ${i}`);
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

const baseClient = (fetchFn: typeof fetch) =>
  createClient({ baseUrl: "https://api.test", apiKey: "test", maxRetries: 0, fetch: fetchFn });

const sampleTeam: Team = {
  team_id: "team-1",
  team_alias: "engineering",
  models: ["gpt-4o"],
};

Deno.test("teams.create posts to /team/new with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleTeam), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.teams.create({ team_alias: "engineering", max_budget: 100 });
  assertStrictEquals(calls[0]?.input, "https://api.test/team/new");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { team_alias: "engineering", max_budget: 100 });
});

Deno.test("teams.info passes team_id as a query parameter", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleTeam), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.teams.info("team-1");
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.searchParams.get("team_id"), "team-1");
});

Deno.test("teams.addMember POSTs to /team/member_add", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(
        JSON.stringify({ user_id: "u-1", team_id: "team-1", role: "admin" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  ]);
  const client = baseClient(fetch);
  await client.teams.addMember({
    team_id: "team-1",
    member: { user_email: "alice@x", role: "admin" },
  });
  assertStrictEquals(calls[0]?.input, "https://api.test/team/member_add");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.member.role, "admin");
});

Deno.test("teams.addModels POSTs to /team/model/add", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleTeam), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.teams.addModels({ team_id: "team-1", models: ["claude-sonnet-4-5"] });
  assertStrictEquals(calls[0]?.input, "https://api.test/team/model/add");
});
