// End-to-end tests for the order mailbox, against @netlify/blobs' local BlobsServer.
//   npm test
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { BlobsServer } from "@netlify/blobs/server";

let server, fn = {};
const KEY = "test-pos-key-0123456789";

before(async () => {
  server = new BlobsServer({ directory: mkdtempSync(join(tmpdir(), "blobs-")), token: "test", port: 0 });
  const { port } = await server.start();
  process.env.BLOBS_TEST_URL = `http://localhost:${port}`;
  process.env.POS_SYNC_KEY = KEY;
  for (const n of ["ordering", "order", "order-status", "order-paid", "pos-sync", "bill-upload", "bill", "order-qr"]) fn[n] = (await import(`../functions/${n}.mjs`)).default;
});
after(async () => server.stop());

const call = async (name, { method = "GET", body, query = "", headers = {}, ip = "1.2.3.4" } = {}) => {
  const req = new Request(`http://site/api/${name}${query}`, {
    method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined,
  });
  const res = await fn[name](req, { ip });
  return { status: res.status, data: await res.json() };
};
const sync = (body = {}) => call("pos-sync", { method: "POST", headers: { "x-pos-key": KEY }, body });
const allDay = { open: "00:00", close: "23:59", cutoff_min: 0, upi_id: "8816809822@ptsbi", upi_name: "re.juve/89" };
const ITEMS = [
  { name: "Orange + Carrot + Ginger", size: "450ml", opts: ["No Ice"], adds: [], qty: 2 },
  { name: "Banana Protein", size: "300ml", opts: [], adds: ["Extra Whey Scoop"], qty: 1 },
  { name: "Peanut Chaat", size: "", opts: [], adds: [], qty: 1 },
];
const order = (extra = {}) => call("order", { method: "POST", ip: `9.9.9.${Math.floor(Math.random() * 250)}`,
  body: { name: "Riya", phone: "+91 98100 12345", pickup_in: 0, payment: "counter", items: ITEMS, ...extra } });

test("orderingState: hours, modes and POS-offline fallback", async () => {
  const { orderingState, DEFAULT_CONFIG } = await import("../lib/shared.mjs");
  const at = (h, m) => new Date(Date.UTC(2026, 9, 9, h, m) - 330 * 60000);   // IST wall time
  const cfg = { ...DEFAULT_CONFIG, mode: "web_pos" };
  const hb = (d) => ({ at: new Date(d - 60000).toISOString() });
  assert.equal(orderingState(cfg, hb(at(7, 59)), at(7, 59)).channel, "closed");
  assert.equal(orderingState(cfg, hb(at(8, 0)), at(8, 0)).channel, "web");
  assert.equal(orderingState(cfg, hb(at(21, 44)), at(21, 44)).channel, "web");
  assert.equal(orderingState(cfg, hb(at(21, 45)), at(21, 45)).channel, "closed");    // 15 min before 10 PM
  assert.equal(orderingState({ ...cfg, mode: "whatsapp" }, null, at(12, 0)).channel, "whatsapp");
  assert.equal(orderingState({ ...cfg, mode: "paused" }, hb(at(12, 0)), at(12, 0)).channel, "paused");
  assert.equal(orderingState({ ...cfg, mode: "whatsapp" }, null, at(23, 0)).channel, "closed");  // WhatsApp also closes
  const stale = orderingState(cfg, { at: new Date(at(12, 0) - 11 * 60000).toISOString() }, at(12, 0));
  assert.equal(stale.channel, "whatsapp"); assert.equal(stale.fallback, true);
});

test("default is WhatsApp until the POS has synced", async () => {
  const r = await call("ordering");
  assert.ok(["whatsapp", "closed"].includes(r.data.channel));
  assert.equal((await order()).status, 409);
});

test("POS sync needs the secret key", async () => {
  assert.equal((await call("pos-sync", { method: "POST", body: {} })).status, 403);
  assert.equal((await call("pos-sync", { method: "POST", headers: { "x-pos-key": "nope" }, body: {} })).status, 403);
});

test("full flow: place, sync to POS, pay by UPI, status updates", async () => {
  await sync({ config: { ...allDay, mode: "web_pos" } });
  assert.equal((await call("ordering")).data.channel, "web");

  const placed = await order({ payment: "upi" });
  assert.equal(placed.status, 201, JSON.stringify(placed.data));
  const o = placed.data.order;
  // server-side prices: 2 x 139 + (139 + 70) + 89 = 576
  assert.equal(o.total, 2 * 139 + 209 + 89);
  assert.match(o.code, /^W\d{3}$/);
  assert.equal(o.payment_status, "pending");
  assert.match(placed.data.upi.link, /^upi:\/\/pay\?pa=8816809822%40ptsbi&pn=re.juve%2F89&am=576.00&cu=INR&tn=Order%20W\d{3}$/);

  // POS pulls it (token never leaves the mailbox)
  let s = await sync({ config: { ...allDay, mode: "web_pos" } });
  const got = s.data.orders.find((x) => x.id === o.id);
  assert.ok(got && !("token" in got) && got.phone === "9810012345");
  // customer says "I've paid" before the POS acks -> change must not be lost
  await call("order-paid", { method: "POST", body: { id: o.id, t: placed.data.token, ref: "UTR 4455-66" } });
  s = await sync({ config: { ...allDay, mode: "web_pos" }, ack: [{ id: o.id, v: got.version }] });
  const again = s.data.orders.find((x) => x.id === o.id);
  assert.equal(again.payment_status, "claimed"); assert.equal(again.payment_ref, "UTR445566");
  s = await sync({ config: { ...allDay, mode: "web_pos" }, ack: [{ id: o.id, v: again.version }],
                   updates: [{ id: o.id, status: "preparing", payment_status: "verified", message: "Making it now" }] });
  assert.ok(!s.data.orders.some((x) => x.id === o.id));

  const st = await call("order-status", { query: `?id=${o.id}&t=${placed.data.token}` });
  assert.equal(st.data.order.status, "preparing"); assert.equal(st.data.order.payment_status, "verified");
  assert.equal(st.data.order.message, "Making it now");
  assert.equal((await call("order-status", { query: `?id=${o.id}&t=wrong` })).status, 404);
});

test("rejects bad orders", async () => {
  await sync({ config: { ...allDay, mode: "web_pos" } });
  const bad = async (extra, re) => { const r = await order(extra); assert.equal(r.status, 400); assert.match(r.data.error, re); };
  await bad({ name: "" }, /name/);
  await bad({ phone: "12345" }, /mobile/);
  await bad({ items: [] }, /empty/);
  await bad({ items: [{ name: "Free Beer", size: "300ml", qty: 1 }] }, /not on the menu/);
  await bad({ items: [{ name: "Mango Smoothie", size: "300ml", qty: 1, adds: ["Extra Whey Scoop"] }] }, /isn't available/);
  await bad({ items: [{ name: "Orange Fresh", size: "900ml", qty: 1 }] }, /size/);
  await bad({ items: [{ name: "Orange Fresh", size: "300ml", qty: 50 }] }, /Quantity/);
  assert.equal((await order({ website: "http://spam" })).status, 400);   // honeypot
});

test("rejects malformed or tricky input without crashing", async () => {
  await sync({ config: { ...allDay, mode: "web_pos" } });
  const bad = async (extra, re) => { const r = await order(extra); assert.equal(r.status, 400); if (re) assert.match(r.data.error, re); };
  await bad({ items: [null] });
  await bad({ items: "Orange Fresh" }, /empty/);
  await bad({ items: [{ name: "constructor", size: "300ml", qty: 1 }] }, /not on the menu/);
  await bad({ items: [{ name: "Orange Fresh", size: "toString", qty: 1 }] }, /size/);
  await bad({ items: [{ name: "Banana Protein", size: "300ml", qty: 1, adds: ["toString"] }] }, /isn't available/);
  await bad({ items: [{ name: "Banana Protein", size: "300ml", qty: 1, adds: "Extra Whey Scoop" }] }, /add-ons/);
  await bad({ items: [{ name: "Orange Fresh", size: "300ml", qty: 1.5 }] }, /Quantity/);
  await bad({ pickup_in: "soon" }, /pickup/);
  for (const raw of ["not json", "null", "[1,2]", JSON.stringify({ x: "y".repeat(40000) })]) {
    const res = await fn.order(new Request("http://site/api/order", { method: "POST", headers: { "content-type": "application/json" }, body: raw }), { ip: "7.7.7.7" });
    assert.equal(res.status, 400, raw.slice(0, 20));
  }
});

test("POS settings are checked before they reach customers", async () => {
  const r = await sync({ config: { ...allDay, mode: "web_pos", upi_id: "pay me here", open: "8am", cutoff_min: -5, whatsapp: "abc" } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.warnings.map((w) => w.split(" ")[0]).sort(), ["cutoff_min", "open", "upi_id", "whatsapp"]);
  assert.equal(r.data.state.upi, false);                        // a bad UPI ID turns UPI off, never shows a wrong QR
  assert.equal((await sync({ ack: "x" })).status, 400);
  assert.equal((await sync({ ack: [null, { id: "../state/config", v: 9 }], updates: [7, { id: "nope" }] })).status, 200);
  await sync({ config: allDay });                              // leave a good config for the next tests
});

test("paused mode and rate limit", async () => {
  await sync({ config: { ...allDay, mode: "paused" } });
  const r = await order();
  assert.equal(r.status, 409); assert.equal(r.data.state.channel, "paused");
  await sync({ config: { ...allDay, mode: "web_pos" } });
  let last;
  for (let i = 0; i < 7; i++) last = await call("order", { method: "POST", ip: "5.5.5.5",
    body: { name: "Bot", phone: "9810012345", pickup_in: 0, payment: "counter", items: [ITEMS[2]] } });
  assert.equal(last.status, 429);
});

test("bill upload gives a private PDF link", async () => {
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(300, 65)]).toString("base64");
  assert.equal((await call("bill-upload", { method: "POST", body: { pdf } })).status, 403);   // POS key needed
  const bad = await call("bill-upload", { method: "POST", headers: { "x-pos-key": KEY }, body: { pdf: Buffer.from("hello").toString("base64") } });
  assert.equal(bad.status, 400);
  const up = await call("bill-upload", { method: "POST", headers: { "x-pos-key": KEY }, body: { pdf, name: "re.juve89-Bill-7.pdf" } });
  assert.equal(up.status, 201);
  assert.match(up.data.url, /^http:\/\/site\/bill\/\d{6}-[0-9a-f]{24}$/);
  const res = await fn["bill"](new Request(up.data.url), { params: { id: up.data.id } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.match(res.headers.get("content-disposition"), /re\.juve89-Bill-7\.pdf/);
  assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  assert.equal((await fn["bill"](new Request("http://site/bill/202610-" + "0".repeat(24)), { params: { id: "202610-" + "0".repeat(24) } })).status, 404);
});

test("UPI QR for an order", async () => {
  await sync({ config: { ...allDay, mode: "web_pos" } });
  const placed = await order({ payment: "upi" });
  const { id } = placed.data.order;
  const ok = await fn["order-qr"](new Request(`http://site/api/order-qr?id=${id}&t=${placed.data.token}`));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/svg+xml");
  assert.match(await ok.text(), /^<svg/);
  assert.equal((await fn["order-qr"](new Request(`http://site/api/order-qr?id=${id}&t=nope`))).status, 404);
  const counter = await order({ payment: "counter" });
  assert.equal((await fn["order-qr"](new Request(`http://site/api/order-qr?id=${counter.data.order.id}&t=${counter.data.token}`))).status, 404);
});

test("storage outage gives a friendly error, not a crash", async () => {
  const real = process.env.BLOBS_TEST_URL, logErr = console.error;
  process.env.BLOBS_TEST_URL = "http://127.0.0.1:9";            // nothing listens here
  console.error = () => {};
  try {
    const r = await call("ordering");
    assert.equal(r.status, 500);
    assert.match(r.data.error, /try again/);
  } finally {
    process.env.BLOBS_TEST_URL = real;
    console.error = logErr;
  }
});
