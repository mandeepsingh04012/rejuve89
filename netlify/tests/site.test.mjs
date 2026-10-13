// Checks on the static page itself: the plain-HTML price list matches the menu, share tags are absolute.
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL("assets/js/menu.js", root), "utf8"), sandbox);
const MENU = sandbox.window.MENU;

test("static price list matches menu.js (run tools/export_menu.py if this fails)", () => {
  const block = html.slice(html.indexOf("<!-- MENU-LIST:START"), html.indexOf("<!-- MENU-LIST:END -->"));
  assert.ok(block.length > 100, "price list block is missing or empty");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const c of MENU.categories) {
    for (const it of c.items) {
      const prices = it.sizes.map((s) => (it.sizes.length > 1 ? `${s.name} ₹${s.price.toLocaleString("en-IN")}` : `₹${s.price.toLocaleString("en-IN")}`)).join(" · ");
      assert.ok(block.includes(`<span>${esc(it.name)}`), `${it.name} missing from the price list`);
      assert.ok(block.includes(`<span>${prices}</span>`), `${it.name}: price list should say "${prices}"`);
    }
  }
});

test("share and SEO tags use absolute URLs", () => {
  for (const prop of ["og:image", "og:url", "twitter:image"]) {
    const m = html.match(new RegExp(`(?:property|name)="${prop}" content="([^"]+)"`));
    assert.ok(m, `${prop} missing`);
    assert.match(m[1], /^https:\/\//, `${prop} must be absolute`);
  }
  assert.match(html, /<link rel="canonical" href="https:\/\//);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld["@type"], "JuiceBar");
  for (const u of [ld.url, ld.logo, ...ld.image]) assert.match(u, /^https:\/\//);
});

test("prices on the What's on cards and sugar page match the menu", () => {
  const find = (n) => MENU.categories.flatMap((c) => c.items).find((i) => i.name === n);
  const price = (n, size) => { const it = find(n); assert.ok(it, `"${n}" is not on the menu`); return (it.sizes.find((s) => s.name === size) || it.sizes[0]).price; };
  const picks = [...html.matchAll(/<button type="button" class="wo__pick" data-item="([^"]+)"(?: data-size="([^"]*)")?(?: data-combo="([^"]+)")?>[\s\S]*?data-price>₹(\d+)</g)];
  assert.ok(picks.length >= 10, `expected the campaign picks, found ${picks.length}`);
  for (const [, name, size, combo, shown] of picks) {
    const want = price(name, size) + (combo ? price(combo) : 0);
    assert.equal(Number(shown), want, `${name}${combo ? " + " + combo : ""} shows ₹${shown}, menu says ₹${want}`);
  }
});
