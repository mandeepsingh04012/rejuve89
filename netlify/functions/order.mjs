// POST /api/order -> place a pickup order that the POS will pull in.
import {
  getConfig, getHeartbeat, istParts, json, nowIso, orderingState, publicOrder, randomHex, rateLimited, readBody, safe, store,
  upiLink, validateOrder,
} from "../lib/shared.mjs";

export default safe(async (req, context) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const body = await readBody(req);
  if (!body) return json({ error: "Bad request" }, 400);
  if (body.website) return json({ error: "Bad request" }, 400);           // honeypot field, bots fill it

  const s = store();
  const [config, hb] = await Promise.all([getConfig(s), getHeartbeat(s)]);
  const state = orderingState(config, hb);
  if (state.channel !== "web") return json({ error: state.message || "Please order on WhatsApp", state }, 409);
  if (await rateLimited(s, context?.ip)) return json({ error: "Too many orders from this device. Please call us." }, 429);

  let order;
  try { order = validateOrder(body, config); } catch (e) { return json({ error: e.message }, 400); }

  // short code customers say at the counter: W + 3 digits, unique for the day
  const { date } = istParts();
  let code, id, free = false;
  for (let i = 0; i < 20 && !free; i++) {
    code = "W" + String(100 + Math.floor(Math.random() * 900));
    id = `${date}-${code}`;
    free = !(await s.get(`o/${id}`));
  }
  // never overwrite someone else's order
  if (!free) return json({ error: "We're very busy right now. Please try again in a minute, or order on WhatsApp." }, 503);
  const now = nowIso();
  const rec = {
    id, code, ...order, token: randomHex(16), status: "received",
    payment_status: order.payment === "upi" ? "pending" : "unpaid",
    created_at: now, updated_at: now, version: 1,
  };
  await s.setJSON(`o/${id}`, rec);
  await s.setJSON(`inbox/${id}`, { v: rec.version });
  return json({
    order: publicOrder(rec), token: rec.token,
    upi: order.payment === "upi" ? { link: upiLink(config, rec), pa: config.upi_id, pn: config.upi_name, amount: rec.total } : null,
  }, 201);
});

export const config = { path: "/api/order" };
