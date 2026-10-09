# re.juve/89 Playbook

How to run, update and fix the POS, kitchen screen, Recipe Lab, SEEKU and website.
Every command assumes you are in the right folder. Copy them exactly.

| Folder | What it is |
|---|---|
| `~/PycharmProjects/PythonProject1` | POS + Kitchen + Recipe Lab + SEEKU (called **POS folder** below) |
| `~/PycharmProjects/rejuve-website` | Customer website (called **website folder** below) |

Open a terminal in a folder with:
```bash
cd ~/PycharmProjects/PythonProject1      # POS folder
cd ~/PycharmProjects/rejuve-website      # website folder
```

---

## 1. Quick reference

| What | On this Mac | iPad / iPhone (same Wi-Fi) | Anywhere (Tailscale) |
|---|---|---|---|
| Billing (POS) | http://localhost:8000 | http://192.168.1.8:8000 | http://100.66.95.87:8000 |
| Kitchen screen | http://localhost:8000/static/kitchen.html | http://192.168.1.8:8000/static/kitchen.html | http://100.66.95.87:8000/static/kitchen.html |
| Recipe Lab | http://localhost:8000/static/recipes.html | …:8000/static/recipes.html | …:8000/static/recipes.html |
| Admin | http://localhost:8000/static/admin.html | …:8000/static/admin.html | …:8000/static/admin.html |
| Reports | http://localhost:8000/static/report.html | …:8000/static/report.html | …:8000/static/report.html |
| Website (preview) | http://localhost:8080 | http://192.168.1.8:8080 | http://100.66.95.87:8080 |

- **Admin PIN** protects Admin and Recipe Lab. The default is `1234`; change it in Admin → Settings.
- `192.168.1.8` is the Mac's Wi-Fi address and can change when the router restarts.
  `./pos-service.sh status` always prints the current addresses.
- On the iPad, open a page in Safari, then **Share → Add to Home Screen** so it opens like an app.

---

## 2. Start, stop, restart

### POS (runs by itself)
The POS is installed as a background service: it starts when you log in to the Mac and restarts if it crashes.

```bash
cd ~/PycharmProjects/PythonProject1
./pos-service.sh status      # running? shows the addresses
./pos-service.sh restart     # after any code update, or if something looks stuck
./pos-service.sh logs        # last 40 log lines (for errors)
./pos-service.sh install     # turn auto-start on (only needed once, or after uninstall)
./pos-service.sh uninstall   # turn auto-start off
```
Don't also run `./start.sh` while the service is on. Both use port 8000.

### Website preview (started by hand)
The website preview isn't a service. It runs only while its terminal window is open.
```bash
cd ~/PycharmProjects/rejuve-website
python3 -m http.server 8080 --bind 0.0.0.0
```
Leave that window open. Press `Ctrl + C` to stop it.
The website only reads files, so menu updates show up without restarting it.
(Once the site is hosted on Netlify or Cloudflare, see section 5.)

### Kitchen screen on the iPad
Open the Kitchen URL. The start screen shows the time, today's orders, and a readiness checklist
(POS connected, fruits still to Brix-check, recipes locked, SEEKU ready).
Tap **Start service** (or **Start with the fruit check**). You'll hear one short beep, which confirms the
speaker works; the new-order chime is now on and the screen stays awake. Do this again after reloading the page.

---

## 3. Changing the menu (the most common job)

> Rule of thumb: **change the menu in POS Admin, then run the two sync commands.**
> The website reads its menu from the POS, so never edit `menu.js` or `blends.js` by hand.

### 3a. Change a price, rename, hide or add an item
1. Admin (PIN) → **Menu items** → tap the item (or **Add item**) → edit → **Save item**.
2. New item? Make sure it has a recipe (section 4): Recipe Lab → open it → **Write with Claude** or **Write by hand**.
3. Sync the website:
   ```bash
   cd ~/PycharmProjects/PythonProject1
   .venv/bin/python -m pos.blends

   cd ~/PycharmProjects/rejuve-website
   python3 tools/export_menu.py
   ```
   You should see something like:
   ```
   Added 0 blends (282 already there, 9 are existing menu items), 0 new recipes.
   Wrote assets/js/menu.js: 5 categories, 25 items
   Wrote assets/js/blends.js: 291 build-your-own blends priced from the POS
   ```
4. Refresh the website. Prices update straight away.
5. Save and publish the website: section **5c**, steps A3–A5.

No POS restart is needed for menu changes.

### 3b. New item: website photo, badge and calories (optional)
These are set in `tools/export_menu.py` in the website folder (the POS doesn't store them):
- **Photo:** put a square JPG in `assets/img/menu/` (e.g. `kokum.jpg`) and add `"Kokum Cooler": "kokum"` to `ITEM_IMAGES`.
- **Badge:** add it to `BADGES`, e.g. `"Kokum Cooler": "New"`.
- **Calories / protein / tags:** add it to `NUTRITION`, e.g. `"Kokum Cooler": (90, 0, ["Cooling", "Low cal"])`.
- Then run `python3 tools/export_menu.py` again.
- If you **replace** an existing photo with the same file name, also bump `VERSION` in `sw.js`
  (e.g. `rejuve89-v3` → `rejuve89-v4`), otherwise phones that installed the site keep the old photo.

### 3c. Add-ons and options (No Ice, Extra Whey…)
Admin → **Add-ons & options**. Pick which categories each one applies to, including **RE:BLEND** for juice options.
Then run the two sync commands (3a step 3) and publish (section 5c). Recipe cards show what changes for an option if the recipe has an
"Order options" note for it (Recipe Lab → Edit → Order options).

### 3d. Check the website and POS are in sync
```bash
cd ~/PycharmProjects/rejuve-website
python3 tools/export_menu.py
```
Every active POS item is either on the website menu (`menu.js`) or reachable from the builder (`blends.js`).
If the numbers look wrong, re-run `.venv/bin/python -m pos.blends` in the POS folder first.

---

## 4. Recipes, kitchen and SEEKU

### 4a. Taste and lock a recipe (do this for every item before opening)
1. Recipe Lab (PIN) → tap the item. It opens the newest **Draft**.
2. Make it exactly as written (use the size chips to see one size).
3. **Taste test** → rate sweetness, sourness, thickness and coldness, give stars, add notes → **Save**.
   Leave "Ask Claude what to change" ticked to get a suggested fix.
4. Claude's suggestion opens → **Make a new draft to taste** → make it again → taste again.
5. When it's right → **Lock as standard**. The kitchen and SEEKU use the locked version from then on.
6. To change a locked recipe later: **Copy to new draft** → edit/taste → lock. Old versions are kept.

Search box: type words in any order, e.g. `carrot ginger`.

### 4b. Morning routine (Brix check)
Kitchen screen → **Fruit check** → put a few drops of each fruit on the refractometer → enter the reading → **Save readings**.
Recipe cards then show "LOW / HIGH" with the exact fix for the size being made.

### 4c. Kitchen screen during service
- Paid orders appear with a chime and a timer. The timer turns amber at 3 minutes and red at 6.
- Tap a drink to see its recipe for that size and the customer's options. Tick ingredients and steps as you go.
- **Made, hand over** ticks that drink. **All made** finishes the order. **Undo** in "Recently made" brings it back.
- **Recipe book**: browse or search any recipe (for training).

### 4d. SEEKU (ask anything)
The green **Ask SEEKU** button on the Kitchen screen and Recipe Lab, plus **Ask SEEKU** inside every recipe card.
It answers from your recipes, menu and today's Brix readings, in English or Hindi.
- It remembers the conversation, so follow-ups like "and for 600?" or "customer wants no ice" work.
  Tap the quick-reply buttons under an answer for common follow-ups.
- The chat stays on that device for 12 hours (one shift), even if the app is closed. Tap **+** to start a new chat.
  Very long chats keep the latest ~20 questions.
- It needs the Claude API key (section 6).

---

## 5. RE:BLEND (website build-your-own juices)

- The builder allows 1–3 of 12 ingredients: **291 blends**. 9 of them are menu items
  (5 single-fruit juices, ABC, RE:GLOW, RE:HYDRATE, IMMUNITY). The other **282** live in the POS
  category **RE:BLEND**, each with a draft recipe.
- At the counter, the customer's WhatsApp order shows the POS name, e.g. `Orange + Carrot + Ginger (450ml) = ₹139`.
  Search `carrot ginger orange` (any order) or the blend name `sunset kick` → bill as normal.
- **Prices:** 300 ml = average of the fruits' prices + ₹10 per extra ingredient, rounded up to end in 9;
  450 ml / 600 ml add about 40% each step.
  To change one blend: Admin → Menu items → RE:BLEND → edit → then sync (3a step 3).
- `.venv/bin/python -m pos.blends` only **adds what's missing**. It never overwrites a price you edited or a recipe
  that exists, so it's always safe to run. `--dry-run` shows what it would do.
- Adding a **new fruit** to the builder needs code changes in two places: `FRUITS` in
  `rejuve-website/assets/js/features.js` and `FRUITS` in `PythonProject1/pos/blends.py`. Ask Claude Code to do it.

### Putting the website online
The website is on Netlify at **https://rejuve89.netlify.app** and is published from the Mac with one command.
See **section 5c** for the full push and publish steps.
> ⚠️ Don't use Netlify Drop (drag and drop) any more. It doesn't upload the order functions, so online orders
> would stop working and the website would fall back to WhatsApp.

---

## 5b. Online orders: website → POS

**Switch:** Admin → **Online orders** (or the mode chips at the top of **Web orders** on the billing screen, admin PIN).

| Mode | What the website does |
|---|---|
| **WhatsApp** | Sends the order to your WhatsApp, like before |
| **Web → POS** | Order lands in the POS **Web orders** inbox with a chime. Customer picks *pay at counter* or *pay now by UPI*, and gets a live status page with an order code like **W482** |
| **Paused** | Shows "Online ordering is paused". The menu still shows |

Automatic rules:
- **Hours:** outside 8:00 AM – 10:00 PM (and from **9:45 PM**, the 15-min cutoff) the website stops taking orders in every mode.
  Change the hours in Admin → Online orders.
- **POS offline:** in Web → POS mode, if the POS hasn't synced for 10 minutes (Mac off, no internet), the website switches
  itself to WhatsApp until the POS is back. Nothing gets lost silently.

**At the counter (Web orders button, top bar, badge shows how many need you):**
- **New order** → **Accept** (customer sees "Accepted") or **Reject** with a reason (customer sees it).
- **Pay at counter:** when the customer arrives → **Customer here · bill** → the cart fills with their items
  (prices from the POS) and their phone number → **Pay** as usual → it goes to the kitchen.
- **Pay by UPI:** the customer pays to `8816809822@ptsbi` and taps "I've paid" (optionally with the UTR).
  Check your UPI app shows the amount → **Payment received · send to kitchen**. It's billed as UPI and sent to the kitchen.
  No money arrived? **Bill at counter instead** or **Reject**.
- When the kitchen marks the drinks made, the customer's page shows **Ready for pickup**.
- Kitchen tickets for web orders say `Web W482 · Name` in the note.

**If something's wrong:** Admin → Online orders shows the connection status ("Synced 5s ago…" or the error) and has **Sync now**.

## 5c. Publish the website: save to GitHub, then publish to Netlify

| | |
|---|---|
| Website folder | `~/PycharmProjects/rejuve-website` |
| GitHub repo | `git@github.com:mandeepsingh04012/rejuve89.git`, branch `main` |
| Netlify project | **rejuve89** (team *mandeepsingh040121's team*), project ID `1d23f2fd-c959-4995-b9c8-732c164ff7e4` |
| Live address | https://rejuve89.netlify.app |
| How it publishes | From the Mac with `npx netlify-cli deploy --prod`. **Pushing to GitHub alone does NOT update the live site** (Netlify isn't linked to GitHub). |

### A. Everyday: menu changed → update the website
Run these one block at a time and read the output before going on.
```bash
# 1. sync the menu out of the POS
cd ~/PycharmProjects/PythonProject1
.venv/bin/python -m pos.blends
cd ~/PycharmProjects/rejuve-website
python3 tools/export_menu.py          # writes menu.js, blends.js and the order catalog

# 2. quick checks (all should pass)
npm test

# 3. save to GitHub (history + backup)
git status                            # see what changed
git add -A
git commit -m "Menu update: <what changed>"
git push

# 4. (optional) preview first: a private test address, the live site is untouched
npx netlify-cli deploy --dir . --message "Preview: <what changed>"
#    -> prints "Website draft URL: https://<id>--rejuve89.netlify.app"; open it on your phone and check

# 5. publish to the live site
npx netlify-cli deploy --prod --dir . --message "<what changed>"
#    -> prints "Deployed to production URL: https://rejuve89.netlify.app"
```

### B. Design or code change (CSS, JS, photos)
Same as A, but first bump the version in `sw.js` (e.g. `rejuve89-v4` → `rejuve89-v5`) so phones that installed the
site pick up the new files. Replaced a photo but kept its file name? Bump the version too.

### C. Check it worked (after every publish)
```bash
curl -s https://rejuve89.netlify.app/api/ordering
# {"...","channel":"whatsapp" | "web" | "paused" | "closed", ...}  -> the order functions are running
```
- POS: Admin → **Online orders** should say **"Connected · last sync …s ago"**.
- On your phone: open the website, add a drink, open the cart. You should see the right button for your mode.

### D. Undo a bad publish (go back to the previous version)
Easiest: Netlify website → **rejuve89 → Deploys** → click the last good deploy → **Publish deploy**.
From the Mac:
```bash
cd ~/PycharmProjects/rejuve-website
npx netlify-cli api listSiteDeploys --data '{"site_id":"1d23f2fd-c959-4995-b9c8-732c164ff7e4","per_page":5}' \
  | python3 -c "import sys,json;[print(d['id'],d['context'],d.get('title'),d['created_at']) for d in json.load(sys.stdin)]"
npx netlify-cli api restoreSiteDeploy --data '{"site_id":"1d23f2fd-c959-4995-b9c8-732c164ff7e4","deploy_id":"<ID from the list>"}'
```
To undo the code in GitHub as well: `git revert HEAD && git push` (makes a new commit that reverses the last one).

### E. One-time setup (new Mac, or if Netlify says "not linked" / "not logged in")
```bash
# get the code
cd ~/PycharmProjects
git clone git@github.com:mandeepsingh04012/rejuve89.git rejuve-website
cd rejuve-website
npm install                           # installs @netlify/blobs for the order functions

# GitHub access: this Mac's SSH key must be on GitHub (Settings → SSH and GPG keys)
ssh -T git@github.com                 # "Hi mandeepsingh04012! You've successfully authenticated" = OK
#   no key yet? ssh-keygen -t ed25519 -C "rejuve89 mac", then: pbcopy < ~/.ssh/id_ed25519.pub and add it on GitHub

# Netlify access
npx netlify-cli login                 # opens the browser, approve
npx netlify-cli link --id 1d23f2fd-c959-4995-b9c8-732c164ff7e4
npx netlify-cli status                # shows your account and "Current project: rejuve89"
```
`export_menu.py` expects the POS folder next to the website folder (`~/PycharmProjects/PythonProject1`).

### F. The POS key (`POS_SYNC_KEY`)
The POS and the website share a secret key so only your POS can read orders.
- The POS copy is in `PythonProject1/data/web_sync_key` (Admin → Online orders → POS key → Show).
- The Netlify copy is the environment variable **`POS_SYNC_KEY`**: Netlify → rejuve89 → **Project configuration →
  Environment variables**. The free plan doesn't allow "secret" variables, so it's a normal one. Don't share
  screenshots of that page.
- **To change the key:** paste the value from the POS into that Netlify variable (Edit → all contexts → Save), then publish
  again (step A5) because functions only read variables at deploy time. Admin → Online orders should then say "Connected".
  If it says *"The website refused the POS key"*, the two copies don't match.
- Note: `npx netlify-cli env:set` silently did nothing on this project. Use the Netlify website, or the API:
  `npx netlify-cli api getEnvVars --data '{"account_id":"mandeepsingh040121","site_id":"1d23f2fd-c959-4995-b9c8-732c164ff7e4"}'` to check it exists.

### G. Good to know
- **Netlify credits:** the free plan has 300 a month, shared by publishes, bandwidth and the order functions, and the site
  pauses if they run out. Batch menu changes into one publish, and check **Netlify → Usage** now and then.
- **Preview with online ordering on the Mac** (no publish, no credits):
  `cd ~/PycharmProjects/rejuve-website && node tools/dev-server.mjs` → http://localhost:8888.
  To connect the POS to it: set the POS website address to `http://localhost:8888` and start the server with
  `POS_SYNC_KEY=$(cat ~/PycharmProjects/PythonProject1/data/web_sync_key) node tools/dev-server.mjs`.
  **Set the address back to `https://rejuve89.netlify.app` afterwards.**
- **Tests:** `npm test` (website functions, in the website folder) and `.venv/bin/python -m pytest tests -q` (POS folder).
- **Useful git commands:** `git status` (what changed), `git log --oneline | head` (history),
  `git diff` (exact changes), `git restore <file>` (throw away uncommitted changes to a file).
- The **POS code** (`PythonProject1`) isn't in GitHub; it's backed up only on this Mac. Ask Claude Code if you want
  a separate private repo for it (the database, backups and API keys would be excluded).
- **Asking Claude Code for help:** say "follow PLAYBOOK.md section 5c to publish the website" and it has everything above.

## 6. Claude API key (Recipe Lab drafts, taste fixes, SEEKU)

- Set or replace it in **Recipe Lab → Claude settings → Replace key**. It's saved in `data/anthropic_key`,
  stays on the Mac, and takes effect immediately with no restart.
- Never paste the key into chats or messages. If you did, create a new key at console.anthropic.com → API keys,
  delete the old one, and paste the new one in Recipe Lab.
- **Shop profile** (same page): your blender/juicer models, cups and sweetener rules. Claude reads it for every recipe.
- Rough cost: a SEEKU question is about ₹1–3; a recipe written or fixed by Claude is about ₹5–15.
  The kitchen screen and recipe cards never use Claude (free).
- Check usage and add credit at console.anthropic.com.

---

## 7. Backups and restore

- **Automatic:** one copy per day in `data/backups/auto-YYYYMMDD.db` (last 30 kept).
- **Manual:** Admin → Settings → **Download backup** (keep a copy on Google Drive or a pen drive every week).
- Before big changes, make a named copy:
  ```bash
  cd ~/PycharmProjects/PythonProject1
  sqlite3 data/pos.db ".backup data/backups/before-change-$(date +%Y%m%d-%H%M).db"
  ```

### Restore a backup (only if something went badly wrong)
This replaces **all** data (orders, menu, recipes) with the backup's. Orders made after that backup are lost.
```bash
cd ~/PycharmProjects/PythonProject1
./pos-service.sh uninstall                                    # stop the POS
sqlite3 data/pos.db ".backup data/backups/broken-$(date +%Y%m%d-%H%M).db"   # keep the current state, just in case
cp data/backups/auto-20261009.db data/pos.db                  # ← pick the backup file you want
rm -f data/pos.db-wal data/pos.db-shm
./pos-service.sh install                                      # start again
```
Then run the website sync (3a step 3).

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| POS / kitchen won't open on the iPad | On the Mac: `./pos-service.sh status`. Not running → `./pos-service.sh restart`. Check the iPad is on the same Wi-Fi (or Tailscale is on) and use the address `status` prints. |
| Worked yesterday, address changed | The Wi-Fi IP changed. Use `./pos-service.sh status` for the new one, or the Tailscale address (doesn't change). |
| Kitchen screen has no chime | Tap **Start service** after every reload; you should hear one beep. If not, check the iPad's volume and silent switch. |
| New orders don't appear on the kitchen screen | The screen polls every 4 seconds. Pull to reload; check "Can't reach the POS server" message → restart the POS. |
| SEEKU / Claude says "API key" problem | Recipe Lab → Claude settings → replace the key. "Busy / credit balance" → add credit at console.anthropic.com. "Couldn't reach Claude" → the Mac is offline. |
| Website shows old prices | Run the sync (3a step 3), then publish (section 5c, step A5). Pushing to GitHub alone doesn't update the live site. |
| A website blend can't be found in the POS | Run `.venv/bin/python -m pos.blends`, then the website export. Search with fruit names in any order. |
| A recipe card says "No recipe yet" | Recipe Lab → open the item → **Write with Claude** or **Write by hand**. |
| Recipe card shows all sizes / "no 450ml column" | The item's sizes in Admin don't match the recipe. Recipe Lab → Edit → **Sizes** → use the same names as the menu. |
| "Today is already closed" when billing | Reports → reopen the day (admin PIN). |
| Website orders not arriving in the POS | Admin → Online orders: is the mode **Web → POS**? Does the status say "Synced…"? "refused the POS key" → `POS_SYNC_KEY` on Netlify doesn't match → set it and redeploy. "Can't reach the website" → Mac offline. |
| Website still shows WhatsApp in Web → POS mode | The POS hasn't synced for 10 min (offline fallback) or it's outside hours. Check the POS is running and online. |
| Something else is broken | `./pos-service.sh logs` and send the last lines to Claude Code. |

---

## 9. Daily checklists

**Opening**
1. Mac on and logged in (POS starts by itself). iPad: open the Kitchen screen → **Tap to start**.
2. Kitchen → **Fruit check**: enter today's Brix for each fruit.
3. Open billing on the counter device; do a ₹1 test print if the printer was off.

**Closing**
1. Reports → **Close day** (count the cash drawer).
2. Once a week: Admin → Settings → **Download backup** to Drive or a pen drive.

**After any menu or recipe change**
1. Admin / Recipe Lab change → 2. `.venv/bin/python -m pos.blends` (POS folder) →
3. `python3 tools/export_menu.py` (website folder) → 4. `git add -A && git commit -m "…" && git push` →
5. `npx netlify-cli deploy --prod --dir .` (section 5c).

---

## 10. Where things live (for Claude Code or a developer)

| Path | What |
|---|---|
| `data/pos.db` | Everything: menu, orders, recipes, taste tests, settings (SQLite) |
| `data/anthropic_key` | Claude API key (owner-only file) |
| `data/backups/` | Automatic and manual backups |
| `data/logs/pos.log` | Service log |
| `pos/main.py` | Billing, menu, orders, reports API |
| `pos/kitchen.py` | Kitchen queue, recipes, Recipe Lab API |
| `pos/chef.py` | Claude: writing and tuning recipes |
| `pos/seeku.py` | SEEKU chat |
| `pos/blends.py` | RE:BLEND combos, prices and formula recipes |
| `pos/weborders.py` | Website orders: sync with Netlify every 15 s, Web orders inbox, mode/hours settings |
| `data/web_sync_key` | POS key for the website mailbox (same value as `POS_SYNC_KEY` on Netlify) |
| `rejuve-website/netlify/functions/` | The order mailbox (place order, status, I've paid, POS sync) |
| `pos/recipe_seed.py` | Starter recipes for the original 25 items |
| `pos/static/` | Web pages: `index.html` (billing), `kitchen.html`, `recipes.html`, `admin.html`, `report.html` |
| `tests/` | Automated tests: `.venv/bin/python -m pytest tests -q` |
| `rejuve-website/tools/export_menu.py` | Writes the website's `menu.js` + `blends.js` from the POS database |
| `rejuve-website/assets/js/features.js` | Website builder, quiz, opening hours |
