// POST /api/pos/sync  (header X-POS-Key)  -- called by the POS every ~15 s.
//   body: { config: {mode, open, close, cutoff_min, upi_id, upi_name, whatsapp},
//           ack: [{id, v}],                       orders the POS has saved (removed from the inbox)
//           updates: [{id, status, payment_status, message}] }   status changes to show the customer
//   reply: { orders: [...new or changed orders], state }
import { cleanConfig, getHeartbeat, json, nowIso, ORDER_ID, orderingState, posKey, readBody, safe, sameSecret, store } from "../lib/shared.mjs";

const STATUSES = ["received", "accepted", "preparing", "ready", "collected", "rejected"];
const PAY = ["unpaid", "pending", "claimed", "verified", "paid"];

export default safe(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!sameSecret(req.headers.get("x-pos-key") || "", posKey())) return json({ error: "Not allowed" }, 403);
  const body = await readBody(req, 256 * 1024);
  if (!body) return json({ error: "Bad request" }, 400);
  for (const k of ["ack", "updates"]) {
    if (body[k] !== undefined && !Array.isArray(body[k])) return json({ error: `${k} must be a list` }, 400);
  }
  const s = store();

  const { cfg, warnings } = cleanConfig(body.config);
  await s.setJSON("state/config", cfg);
  await s.setJSON("state/heartbeat", { at: nowIso() });

  for (const a of body.ack || []) {
    if (!ORDER_ID.test(String(a?.id))) continue;
    const box = await s.get(`inbox/${a.id}`, { type: "json" });
    if (box && box.v <= a.v) await s.delete(`inbox/${a.id}`);   // a newer change stays queued
  }
  for (const u of body.updates || []) {
    if (!ORDER_ID.test(String(u?.id))) continue;
    const o = await s.get(`o/${u.id}`, { type: "json" });
    if (!o) continue;
    if (STATUSES.includes(u.status)) o.status = u.status;
    if (PAY.includes(u.payment_status)) o.payment_status = u.payment_status;
    if (typeof u.message === "string") o.message = u.message.slice(0, 200);
    o.updated_at = nowIso();
    await s.setJSON(`o/${u.id}`, o);              // status only: the POS already has this order
  }

  const { blobs } = await s.list({ prefix: "inbox/" });
  const orders = [];
  for (const b of blobs.slice(0, 50)) {
    const o = await s.get(`o/${b.key.slice(6)}`, { type: "json" });
    if (o) { const { token, ...rest } = o; orders.push(rest); } else await s.delete(b.key);
  }
  return json({ orders, state: orderingState(cfg, await getHeartbeat(s)), ...(warnings.length ? { warnings } : {}) });
});

export const config = { path: "/api/pos/sync" };
