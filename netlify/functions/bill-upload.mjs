// POST /api/pos/bill  (header X-POS-Key)  body: { pdf: <base64>, name: "re.juve89-Bill-123.pdf" }
// Stores a bill PDF and returns a private link to send on WhatsApp (no manual attaching).
// Links look like /bill/202610-<random>; bills older than ~4 months are cleaned up as new ones arrive.
import { json, posKey, randomHex, sameSecret, store } from "../lib/shared.mjs";

const MAX_BYTES = 400 * 1024;
const KEEP_MONTHS = 4;

const monthKey = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!sameSecret(req.headers.get("x-pos-key") || "", posKey())) return json({ error: "Not allowed" }, 403);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const bytes = Buffer.from(String(body.pdf || ""), "base64");
  if (bytes.length < 100 || bytes.subarray(0, 5).toString() !== "%PDF-") return json({ error: "Not a PDF" }, 400);
  if (bytes.length > MAX_BYTES) return json({ error: "Bill too large" }, 413);
  const name = String(body.name || "Bill.pdf").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 60) || "Bill.pdf";

  const s = store();
  const now = new Date();
  const id = `${monthKey(now)}-${randomHex(12)}`;
  await s.set(`bill/${id}`, bytes, { metadata: { name, created_at: now.toISOString() } });

  // tidy up: drop bills from KEEP_MONTHS..KEEP_MONTHS+2 months ago
  for (let back = KEEP_MONTHS; back < KEEP_MONTHS + 3; back++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const { blobs } = await s.list({ prefix: `bill/${monthKey(d)}-` });
    for (const b of blobs) await s.delete(b.key);
  }
  const origin = new URL(req.url).origin;
  return json({ id, url: `${origin}/bill/${id}` }, 201);
};

export const config = { path: "/api/pos/bill" };
