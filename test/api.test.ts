import assert from "node:assert/strict";
import { test } from "node:test";
import { AthenaError, buildUrl, failureFor, NEEDS_FULL_KEY, request, send, type Fetch } from "../src/lib/api";
import type { Settings } from "../src/lib/settings";

const full: Settings = { origin: "https://athena.example.com", key: `athk_${"b".repeat(43)}`, scope: "full" };
const capture: Settings = { origin: "https://athena.example.com", key: `athc_${"a".repeat(43)}`, scope: "capture" };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function recorder(answer: () => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: Fetch = async (url, init) => {
    calls.push({ url, init });
    return answer();
  };
  return { calls, fetchImpl };
}

const failure = async (run: () => Promise<unknown>): Promise<AthenaError> => {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof AthenaError, String(error));
    return error;
  }
  throw new Error("Expected a failure");
};

test("a URL keeps the query that's set and drops what isn't", () => {
  assert.equal(buildUrl("https://athena.example.com", "/api/recall", { q: "sleep & rest", limit: 20, tz: undefined }), "https://athena.example.com/api/recall?q=sleep+%26+rest&limit=20");
});

test("a request carries the key, refuses redirects and sends JSON", async () => {
  const { calls, fetchImpl } = recorder(() => json({ id: "1" }, 201));
  const answer = await send<{ id: string }>(full, "/api/commitments", { method: "POST", body: { title: "Book the dentist" } }, fetchImpl);
  assert.deepEqual(answer, { status: 201, body: { id: "1" } });
  assert.equal(calls[0].url, "https://athena.example.com/api/commitments");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.body, JSON.stringify({ title: "Book the dentist" }));
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Bearer ${full.key}`);
  assert.equal(headers["Content-Type"], "application/json");
});

test("a capture key is stopped before a read is sent", async () => {
  const { calls, fetchImpl } = recorder(() => json({}));
  const error = await failure(() => request(capture, "/api/today", {}, fetchImpl));
  assert.equal(error.failure, "scope");
  assert.equal(error.message, NEEDS_FULL_KEY);
  assert.equal(calls.length, 0);
});

test("a capture key can use the capture paths", async () => {
  const { calls, fetchImpl } = recorder(() => json({ reply: "Added a to-do.", changes: [] }));
  const answer = await request<{ reply: string }>(capture, "/api/assistant/capture", { method: "POST", query: { format: "json" }, body: { text: "Book the dentist" }, capture: true }, fetchImpl);
  assert.equal(answer.reply, "Added a to-do.");
  assert.equal(calls[0].url, "https://athena.example.com/api/assistant/capture?format=json");
});

test("Athena's own words are passed on for a refusal", async () => {
  const { fetchImpl } = recorder(() => json({ error: "No habit called “Meditat”. Check its name in Library → Habits." }, 400));
  const error = await failure(() => request(capture, "/api/habits/log", { method: "POST", body: { habit: "Meditat" }, capture: true }, fetchImpl));
  assert.equal(error.failure, "rejected");
  assert.match(error.message, /No habit called/);
});

test("statuses map to what to do next", () => {
  assert.equal(failureFor(401, "").failure, "auth");
  assert.equal(failureFor(403, "").failure, "auth");
  assert.equal(failureFor(429, "").failure, "offline");
  assert.equal(failureFor(503, "").failure, "offline");
  assert.equal(failureFor(404, "").failure, "rejected");
  assert.equal(failureFor(400, "Say which habit.").message, "Say which habit.");
});

test("a refused key never shows up in the message", async () => {
  const { fetchImpl } = recorder(() => json({ error: "Unauthorized" }, 401));
  const error = await failure(() => request(full, "/api/today", {}, fetchImpl));
  assert.equal(error.failure, "auth");
  assert.ok(!error.message.includes(full.key));
});

test("no connection reads as offline", async () => {
  const error = await failure(() =>
    request(full, "/api/today", {}, async () => {
      throw new TypeError("fetch failed");
    }),
  );
  assert.equal(error.failure, "offline");
});

test("a cancelled request stays cancelled, not offline", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    request(full, "/api/recall", { query: { q: "a" }, signal: controller.signal }, async (_url, init) => {
      throw (init.signal as AbortSignal).reason;
    }),
    (error: Error) => !(error instanceof AthenaError),
  );
});

test("an empty answer is fine", async () => {
  const { fetchImpl } = recorder(() => new Response(null, { status: 204 }));
  assert.equal(await request(full, "/api/anything", {}, fetchImpl), null);
});
