// GET /api/order-status?id=...&t=<token> -> live status for the customer's order page.
import { getConfig, json, publicOrder, store, upiLink } from "../lib/shared.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "", token = url.searchParams.get("t") || "";
  if (!/^\d{8}-W\d{3}$/.test(id)) return json({ error: "Order not found" }, 404);
  const s = store();
  const o = await s.get(`o/${id}`, { type: "json" });
  if (!o || o.token !== token) return json({ error: "Order not found" }, 404);
  const config = await getConfig(s);
  return json({ order: publicOrder(o), upi: o.payment === "upi" && config.upi_id ? { link: upiLink(config, o), pa: config.upi_id, pn: config.upi_name, amount: o.total } : null });
};

export const config = { path: "/api/order-status" };
