import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAddress, readKey, readSettings } from "../src/lib/settings";

const CAPTURE = `athc_${"a".repeat(43)}`;
const FULL = `athk_${"b".repeat(43)}`;

test("an address becomes an origin", () => {
  assert.deepEqual(normalizeAddress("athena.example.com"), { ok: true, origin: "https://athena.example.com" });
  assert.deepEqual(normalizeAddress(" https://athena.example.com/#/saved "), { ok: true, origin: "https://athena.example.com" });
  assert.deepEqual(normalizeAddress("http://localhost:8888"), { ok: true, origin: "http://localhost:8888" });
});

test("an address that would send the key somewhere unsafe is refused", () => {
  for (const bad of ["", "http://athena.example.com", "ftp://athena.example.com", "https://me:secret@athena.example.com", "athena", "not a url"]) {
    assert.equal(normalizeAddress(bad).ok, false, bad);
  }
});

test("a key's prefix says what it can do", () => {
  assert.deepEqual(readKey(CAPTURE), { ok: true, key: CAPTURE, scope: "capture" });
  assert.deepEqual(readKey(`Bearer ${FULL} `), { ok: true, key: FULL, scope: "full" });
});

test("a Claude only key, a short key and anything else are refused", () => {
  const mcp = readKey(`athm_${"c".repeat(43)}`);
  assert.equal(mcp.ok, false);
  assert.match(mcp.ok ? "" : mcp.error, /Claude only/);
  assert.equal(readKey("athc_short").ok, false);
  assert.equal(readKey("some-long-master-token-value-0123456789").ok, false);
  assert.equal(readKey("").ok, false);
});

test("settings need both", () => {
  assert.deepEqual(readSettings({ address: "athena.example.com", key: FULL }), {
    ok: true,
    settings: { origin: "https://athena.example.com", key: FULL, scope: "full" },
  });
  assert.equal(readSettings({ address: "", key: FULL }).ok, false);
  assert.equal(readSettings({ address: "athena.example.com", key: "" }).ok, false);
});
