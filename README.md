# re.juve /89 — website

**Sip. Reset. Repeat.** The website for re.juve /89, a juice bar at GF 02, Orris Market 89, Sector 89, Gurugram.

It's a plain static site (HTML, CSS and JS, no build step), so it runs on any free host.

## What's in it

- Hero with animated headline, arch photo collage and spinning "SIP • RESET • REPEAT" seal
- Pickup lines: rotating juice-themed lines, with a button to send one on WhatsApp
- Category tiles and the full menu, with a 300/450/600ml size switcher that updates prices live
- Item sheet: choose size, No/Less sugar, No ice, masala, Extra Whey (+₹70), and quantity
- **Pickup ordering**: the cart is saved on the phone, then sent as a formatted WhatsApp message to +91 88168 09822. Customers pay at the counter.
- Our story, gallery, store photo, Google Map, call / WhatsApp / directions buttons
- **Live opening hours**: "Open now · closes 10 PM" / "Closed · opens 8 AM", always in India time (hero, Visit card, mobile menu, footer). Hours are set at the top of `assets/js/features.js` (`OPEN_MIN` / `CLOSE_MIN`) and in the JSON-LD in `index.html`.
- **Calories & benefits** on every item (e.g. "~135 kcal · Vit C"), scaled to the chosen size. These are estimates, edited in `NUTRITION` in `tools/export_menu.py`.
- **Build your own juice (RE:BLEND)**: pick up to 3 of 12 fruits, watch the glass fill and change colour, get a blend name and its fixed price, and add it to the pickup order (or share it). Every blend exists in the POS with a recipe.
- **"Which juice are you?" quiz**: 4 questions lead to a personality and a drink, with "Order this" and "Share result" buttons.
- **Installable app**: `manifest.webmanifest` + `sw.js` (offline cache). An install banner appears after 18 seconds, with step-by-step instructions on iPhone. If you change CSS/JS, bump `VERSION` in `sw.js`.
- Built for iPhone, iPad, Chrome and Safari: safe areas (notch and home bar), no zoom on inputs, bottom-sheet cart on phones, swipe down to close, reduced-motion support

## Preview it

Double-click `index.html`, or serve the folder (better for testing on an iPad or iPhone):

```bash
cd rejuve-website
python3 -m http.server 8080
# Mac:            http://localhost:8080
# iPhone / iPad:  http://<your-mac-ip>:8080   (same Wi-Fi, or your Tailscale IP)
# Note: the offline cache and Android install prompt need https (or localhost),
# so they switch on once the site is hosted. iPhone "Add to Home Screen" works everywhere.
```

## Keep the menu in sync with the POS

Full step-by-step guide (POS + website + recipes + publishing): [PLAYBOOK.md](PLAYBOOK.md) (a copy of `../PythonProject1/PLAYBOOK.md`).

Menu items and prices come from the POS database. After changing the menu in POS Admin, run:

```bash
python3 tools/export_menu.py          # reads ../PythonProject1/data/pos.db
```

That rewrites `assets/js/menu.js` and `assets/js/blends.js` (the exact POS name and price of every
build-your-own blend; the builder shows that price and adds the blend to the pickup order under its POS
name, so the counter can bill it). Blends live in the POS "RE:BLEND" category and aren't listed on the menu. Photos, badges ("Bestseller", "New"…) and category blurbs live
at the top of `tools/export_menu.py`. For a new item, drop a square photo in `assets/img/menu/`
and add it to `ITEM_IMAGES`.

## Put it online (free)

Any static host works. Easiest options:

- **Netlify Drop**: drag the `rejuve-website` folder onto https://app.netlify.com/drop
- **Cloudflare Pages** or **GitHub Pages**: connect the folder or repo, no build command

Then point your domain at it if you buy one.

## Credits

Food and drink photos are from [Unsplash](https://unsplash.com) (free under the Unsplash License).
The storefront image is re.juve /89's own.
