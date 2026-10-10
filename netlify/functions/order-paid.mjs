// POST /api/order-paid {id, t, ref} -> customer says they paid by UPI; staff verify it in the POS.
import { json, nowIso, ORDER_ID, publicOrder, readBody, safe, sameSecret, store } from "../lib/shared.mjs";

export default safe(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const body = await readBody(req, 4 * 1024);
  if (!body) return json({ error: "Bad request" }, 400);
  const id = String(body.id || "");
  if (!ORDER_ID.test(id)) return json({ error: "Order not found" }, 404);
  const s = store();
  const o = await s.get(`o/${id}`, { type: "json" });
  if (!o || !sameSecret(String(body.t || ""), o.token)) return json({ error: "Order not found" }, 404);
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
});

export const config = { path: "/api/order-paid" };
