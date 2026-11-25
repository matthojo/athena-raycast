// Saving to Athena's Saved (POST /api/saved), which a capture key opens.

import { randomUUID } from "node:crypto";
import { athenaSend } from "./athena";
import type { Saved } from "./types";

export interface SaveFields {
  url?: string;
  /** Selected text, kept exactly as a quote. */
  selection?: string;
  title?: string;
  /** The page a quote came from. */
  source_url?: string;
}

/**
 * Saves a link or a quote. `created` is false when Athena already had that
 * link. An Athena from before it knew the "raycast" source files the save as
 * the app's own, so this works against older copies too.
 */
export async function save(fields: SaveFields): Promise<Saved & { created: boolean }> {
  const { status, body } = await athenaSend<Saved>("/api/saved", {
    method: "POST",
    body: { ...fields, source: "raycast", client_id: randomUUID() },
    capture: true,
    timeout: 30_000,
  });
  return { ...body, created: status === 201 };
}
