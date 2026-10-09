// POST /api/order-paid {id, t, ref} -> customer says they paid by UPI; staff verify it in the POS.
import { json, nowIso, publicOrder, store } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const id = String(body.id || "");
  if (!/^\d{8}-W\d{3}$/.test(id)) return json({ error: "Order not found" }, 404);
  const s = store();
  const o = await s.get(`o/${id}`, { type: "json" });
  if (!o || o.token !== body.t) return json({ error: "Order not found" }, 404);
  if (o.payment !== "upi") return json({ error: "This order is pay at counter" }, 400);
  if (o.payment_status === "pending") {
    o.payment_status = "claimed";
    o.payment_ref = String(body.ref || "").replace(/[^0-9A-Za-z]/g, "").slice(0, 30);
    o.updated_at = nowIso();
    o.version += 1;
    await s.setJSON(`o/${id}`, o);
    await s.setJSON(`inbox/${id}`, { v: o.version });   // POS picks up the change on its next sync
  }
  return json({ order: publicOrder(o) });
};

export const config = { path: "/api/order-paid" };
