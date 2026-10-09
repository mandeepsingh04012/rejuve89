// Shared code for the online-order mailbox.
//
//   website --POST /api/order-------------> Netlify Blobs ("orders" store) <----POST /api/pos/sync---- POS (Mac)
//   website <-GET /api/ordering / status--/                                 (every ~15 s, secret key)
//
// The POS pushes its settings (mode, hours, UPI) and a heartbeat on every sync. The website asks
// /api/ordering which channel to use: "web" (orders go to the POS), "whatsapp", "paused" or "closed".
import { getStore } from "@netlify/blobs";
import catalog from "./catalog.json" with { type: "json" };

export { catalog };

export const DEFAULT_CONFIG = {
  mode: "whatsapp",          // whatsapp | web_pos | paused   (set in POS Admin)
  open: "08:00",
  close: "22:00",
  cutoff_min: 15,            // stop taking orders this long before closing
  offline_after_s: 600,      // POS silent this long -> website falls back to WhatsApp
  upi_id: "",
  upi_name: "re.juve/89",
  whatsapp: "918816809822",
};

export const MAX_LINES = 20;
export const MAX_QTY = 10;
const RATE_LIMIT = { count: 6, windowMs: 10 * 60 * 1000 };

// ---------------------------------------------------------------- storage

export function store() {
  const opts = { name: "orders", consistency: "strong" };
  // local tests run against @netlify/blobs' BlobsServer
  if (process.env.BLOBS_TEST_URL) {
    Object.assign(opts, { edgeURL: process.env.BLOBS_TEST_URL, uncachedEdgeURL: process.env.BLOBS_TEST_URL, siteID: "test", token: "test" });
  }
  return getStore(opts);
}

export async function getConfig(s) {
  return { ...DEFAULT_CONFIG, ...((await s.get("state/config", { type: "json" })) || {}) };
}

export async function getHeartbeat(s) {
  return (await s.get("state/heartbeat", { type: "json" })) || null;
}

// ---------------------------------------------------------------- time (shop runs on India time)

export function istParts(now = new Date()) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? 0 : Number(p.hour);
  return { date: `${p.year}${p.month}${p.day}`, minutes: hour * 60 + Number(p.minute) };
}

export const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
export const fmtMin = (min) => {
  const h = Math.floor(min / 60) % 24, m = min % 60, ap = h < 12 ? "AM" : "PM";
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${ap}`;
};

/** Which ordering channel the website should offer right now. */
export function orderingState(config, heartbeat, now = new Date()) {
  const { minutes } = istParts(now);
  const open = toMin(config.open), close = toMin(config.close), last = close - Number(config.cutoff_min || 0);
  const base = { open: config.open, close: config.close, last_order: fmtMin(last), whatsapp: config.whatsapp };
  if (minutes < open || minutes >= last) {
    return { ...base, channel: "closed", accepting: false,
      message: minutes < open ? `Online orders open at ${fmtMin(open)}` : `Online orders are closed for today. We open at ${fmtMin(open)}.` };
  }
  if (config.mode === "paused") return { ...base, channel: "paused", accepting: false, message: "Online ordering is paused right now. Please visit us at the counter." };
  if (config.mode === "web_pos") {
    const fresh = heartbeat && (now - new Date(heartbeat.at)) / 1000 < Number(config.offline_after_s || 600);
    if (fresh) return { ...base, channel: "web", accepting: true, upi: !!config.upi_id };
    return { ...base, channel: "whatsapp", accepting: true, fallback: true };
  }
  return { ...base, channel: "whatsapp", accepting: true };
}

// ---------------------------------------------------------------- validation + pricing

export function cleanPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const clip = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

/** Check items against the menu and price them server-side. Throws Error(message) on bad input. */
export function priceItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error("Your order is empty");
  if (items.length > MAX_LINES) throw new Error(`Too many lines (max ${MAX_LINES})`);
  let total = 0;
  const lines = items.map((raw) => {
    const name = clip(raw.name, 80);
    const item = catalog.items[name];
    if (!item) throw new Error(`"${name}" is not on the menu any more. Please remove it.`);
    const sizes = Object.keys(item.sizes);
    const size = raw.size ? clip(raw.size, 20) : sizes.length === 1 ? sizes[0] : "";
    if (!(size in item.sizes)) throw new Error(`Pick a size for ${name}`);
    const qty = Math.floor(Number(raw.qty));
    if (!(qty >= 1 && qty <= MAX_QTY)) throw new Error(`Quantity for ${name} must be 1–${MAX_QTY}`);
    const opts = [...new Set((raw.opts || []).map((o) => clip(o, 40)))];
    const adds = [...new Set((raw.adds || []).map((a) => clip(a, 40)))];
    for (const o of opts) if (!item.options.includes(o)) throw new Error(`"${o}" isn't available for ${name}`);
    for (const a of adds) if (!(a in item.addons)) throw new Error(`"${a}" isn't available for ${name}`);
    const unit = item.sizes[size] + adds.reduce((s, a) => s + item.addons[a], 0);
    total += unit * qty;
    return { name, size, opts, adds, qty, unit };
  });
  return { lines, total };
}

export function validateOrder(body, config, now = new Date()) {
  const name = clip(body.name, 40);
  if (!name) throw new Error("Add your name so we can call it out");
  const phone = cleanPhone(body.phone);
  if (!phone) throw new Error("Enter a valid 10-digit mobile number");
  const payment = body.payment === "upi" ? "upi" : "counter";
  if (payment === "upi" && !config.upi_id) throw new Error("Online payment isn't available right now. Choose pay at counter.");
  // pickup_in: minutes from now (0 = on my way). Stored as an India-time clock time.
  const { minutes } = istParts(now);
  const inMin = Math.floor(Number(body.pickup_in) || 0);
  if (!(inMin >= 0 && inMin <= 120)) throw new Error("Pick a valid pickup time");
  const at = minutes + inMin, close = toMin(config.close);
  if (at > close) throw new Error(`We close at ${fmtMin(close)}. Please pick a sooner pickup time.`);
  const pickup = inMin === 0 ? "ASAP" : `${String(Math.floor(at / 60) % 24).padStart(2, "0")}:${String(at % 60).padStart(2, "0")}`;
  const { lines, total } = priceItems(body.items);
  return { name, phone, payment, pickup, note: clip(body.note, 200), lines, total };
}

// ---------------------------------------------------------------- helpers

export function randomHex(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export const nowIso = () => new Date().toISOString();

/** Small per-IP limiter so nobody can flood the POS with fake orders. */
export async function rateLimited(s, ip) {
  if (!ip) return false;
  const key = `rl/${ip.replace(/[^0-9a-fA-F:.]/g, "")}`;
  const now = Date.now();
  const rec = (await s.get(key, { type: "json" })) || { start: now, count: 0 };
  if (now - rec.start > RATE_LIMIT.windowMs) { rec.start = now; rec.count = 0; }
  rec.count += 1;
  await s.setJSON(key, rec);
  return rec.count > RATE_LIMIT.count;
}

/** What the customer's status page shows. */
export function publicOrder(o) {
  return {
    id: o.id, code: o.code, name: o.name, status: o.status, payment: o.payment, payment_status: o.payment_status,
    pickup: o.pickup, lines: o.lines, total: o.total, message: o.message || "", created_at: o.created_at, updated_at: o.updated_at,
  };
}

export function upiLink(config, order) {
  const p = new URLSearchParams({ pa: config.upi_id, pn: config.upi_name || "re.juve/89", am: order.total.toFixed(2), cu: "INR", tn: `Order ${order.code}` });
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

// constant-time compare for the POS key
export function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function posKey() {
  return (globalThis.Netlify?.env?.get?.("POS_SYNC_KEY")) || process.env.POS_SYNC_KEY || "";
}
