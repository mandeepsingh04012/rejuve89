// GET /api/order-qr?id=...&t=<token> -> UPI QR (SVG) for that order, amount filled in.
import QRCode from "qrcode";
import { getConfig, ORDER_ID, safe, sameSecret, store, upiLink } from "../lib/shared.mjs";

export default safe(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "", token = url.searchParams.get("t") || "";
  if (!ORDER_ID.test(id)) return new Response("Not found", { status: 404 });
  const s = store();
  const o = await s.get(`o/${id}`, { type: "json" });
  if (!o || !sameSecret(token, o.token) || o.payment !== "upi") return new Response("Not found", { status: 404 });
  const config = await getConfig(s);
  if (!config.upi_id) return new Response("UPI not set up", { status: 404 });
  const svg = await QRCode.toString(upiLink(config, o), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0F271D", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=3600" } });
});

export const config = { path: "/api/order-qr" };
