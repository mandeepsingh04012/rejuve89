"""Export the live menu from the re.juve/89 POS database into assets/js/menu.js.

Run this whenever you change items or prices in the POS Admin page:

    python3 tools/export_menu.py
    python3 tools/export_menu.py --db /path/to/pos.db

The website reads window.MENU from menu.js (a plain script, so it also works
when index.html is opened straight from the disk without a server).
"""
import argparse
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT.parent / "PythonProject1" / "data" / "pos.db"
OUT = ROOT / "assets" / "js" / "menu.js"
BLENDS_OUT = ROOT / "assets" / "js" / "blends.js"
CATALOG_OUT = ROOT / "netlify" / "lib" / "catalog.json"   # used by the order functions to check and price orders
INDEX = ROOT / "index.html"   # gets a plain-HTML price list (search engines and link previews can't run the JS menu)
LIST_START, LIST_END = "<!-- MENU-LIST:START", "<!-- MENU-LIST:END -->"

# The POS "RE:BLEND" category holds every build-your-own combo (hundreds). They're not listed on the
# menu; the builder looks them up in blends.js to show the exact POS price and name.
BLEND_CATEGORY = "RE:BLEND"
# photo for a blend in the cart: by its first fruit
BLEND_IMAGES = {"orange": "orange", "mosambi": "mosambi", "watermelon": "watermelon", "pineapple": "pineapple",
                "pomegranate": "pomegranate", "apple": "re-green", "beetroot": "abc", "carrot": "abc",
                "cucumber": "re-green"}

# Website-only extras the POS doesn't store: photo, accent colour, short blurb.
CATEGORY_META = {
    "Fresh Juices": {"slug": "juices", "blurb": "One fruit. Squeezed when you order.", "accent": "#F2A23A", "hero": "orange"},
    "RE:Wellness": {"slug": "wellness", "blurb": "Our signature blends for a mid-day reset.", "accent": "#7DB46C", "hero": "re-green"},
    "Smoothies": {"slug": "smoothies", "blurb": "Thick, creamy, real fruit.", "accent": "#E46A7E", "hero": "berry-smoothie",
                  "why": ["🥤 Blended thick with real fruit the minute you order, never from a powder or a premix.",
                          "🍯 Sweetness is your call: no sugar, less sugar, or dates (+₹10)."]},
    "Shakes": {"slug": "shakes", "blurb": "Classic milkshakes, thick and cold. Medium or large.", "accent": "#B98A5E",
               "hero": "chocolate-shake"},
    "Cold Coffee": {"slug": "coffee", "blurb": "Chilled coffee, blended or poured over ice.", "accent": "#8B5E3C",
                    "hero": "iced-latte"},
    "RE:Protein": {"slug": "protein", "blurb": "A full scoop of whey in every glass.", "accent": "#B98A5E", "hero": "chocolate-protein"},
    "RE:Bowls": {"slug": "bowls", "blurb": "Fruit bowls, overnight oats and yogurt bowls, made fresh every morning.",
                 "accent": "#E9A23B", "hero": "fruit-bowl",
                 "why": ["🍉 Fruit bowls: cut every morning from what's in season, tropical one day, classic favourites the next. Just fruit, no preservatives, portioned to fill you up.",
                         "🥣 Overnight oats: soaked overnight so they're soft and creamy by morning. Sweetened only with fruit, figs or dates, with no added sugar and no preservatives.",
                         "🍓 Yogurt bowls: thick low-fat yogurt with fresh fruit and crunchy muesli. Made when you order, no artificial flavours."]},
    "RE:Bites": {"slug": "bites", "blurb": "Light, filling snacks to go with your sip.", "accent": "#D9B44A", "hero": "avocado-sandwich"},
}

ITEM_IMAGES = {
    "Orange Fresh": "orange", "Mosambi Fresh": "mosambi", "Watermelon Fresh": "watermelon",
    "Pineapple Fresh": "pineapple", "Pomegranate Fresh": "pomegranate", "ABC": "abc",
    "RE:GREEN": "re-green", "RE:GLOW": "re-glow", "RE:HYDRATE": "re-hydrate", "IMMUNITY": "immunity",
    "Banana Smoothie": "banana-smoothie", "Mango Smoothie": "mango-smoothie",
    "Strawberry Smoothie": "strawberry-smoothie", "Mixed Berry Smoothie": "berry-smoothie",
    "Banana Protein": "banana-protein", "Chocolate Protein": "chocolate-protein",
    "Peanut Butter Protein": "pb-protein", "Mango Protein": "mango-protein",
    "Peanut Chaat": "peanut-chaat", "Chickpea Chaat": "chickpea-chaat", "Boiled Corn": "boiled-corn",
    "Air-Fried Corn Chaat": "corn-chaat", "Grilled Veg Sandwich": "veg-sandwich",
    "Paneer Sandwich": "paneer-sandwich", "Avocado Sandwich": "avocado-sandwich",
    # shakes: CC0 stock photos for now (rawpixel / StockSnap / Flickr / WordPress Photo Directory)
    "Banana Shake": "banana-shake", "Chikoo Shake": "chikoo-shake", "Chocolate Shake": "chocolate-shake",
    "Vanilla Ice Cream Shake": "vanilla-shake", "Strawberry Shake": "strawberry-shake",
    "Peanut Butter Shake": "pb-shake", "Whey Protein Shake": "whey-shake",
    "Banana Chocolate Smoothie": "banana-choc-smoothie", "Protein Smoothie": "protein-smoothie",
    # cold coffee: CC0 stock photos for now (WordPress Photo Directory)
    "Classic Cold Coffee": "classic-cold-coffee", "Hand-Beaten Cold Coffee": "hand-beaten-coffee",
    "Hazelnut Cold Coffee": "hazelnut-cold-coffee", "Iced Latte": "iced-latte", "Protein Cold Coffee": "protein-cold-coffee",
    # bowls: CC0 stock photos for now (rawpixel / WordPress Photo Directory); replace with counter shots
    "Seasonal Fruit Bowl": "fruit-bowl", "Fig & Fruit Overnight Oats": "fig-oats",
    "Cocoa Peanut Overnight Oats": "cocoa-oats", "Berry Muesli Yogurt Bowl": "berry-yogurt-bowl",
    "Strawberry Banana Yogurt Bowl": "strawberry-yogurt-bowl",
}

# Items with no photo yet: the card shows these emoji on a soft colour tile instead, e.g. "New Bowl": "🥣🍓".
ITEM_ART = {}

# Items to highlight with a small badge on the website.
BADGES = {"RE:GREEN": "Bestseller", "RE:GLOW": "Signature", "ABC": "Detox", "IMMUNITY": "Vit C",
          "Peanut Butter Protein": "Gym fav", "Avocado Sandwich": "New",
          "Seasonal Fruit Bowl": "New", "Cocoa Peanut Overnight Oats": "New"}

# Approximate nutrition per 300ml (drinks, without added sugar) or per serving (bites).
# kcal = calories, protein = grams, tags = up to two short benefits shown on the card.
NUTRITION = {
    "Orange Fresh": (135, 2, ["Vit C", "Immunity"]),
    "Mosambi Fresh": (120, 1, ["Vit C", "Hydrating"]),
    "Watermelon Fresh": (90, 1, ["Hydrating", "Low cal"]),
    "Pineapple Fresh": (150, 1, ["Digestion", "Vit C"]),
    "Pomegranate Fresh": (165, 1, ["Antioxidants", "Heart-friendly"]),
    "ABC": (120, 2, ["Vit A", "Antioxidants"]),
    "RE:GREEN": (100, 1, ["Low cal", "Hydrating"]),
    "RE:GLOW": (140, 1, ["Vit C", "Skin glow"]),
    "RE:HYDRATE": (85, 1, ["Hydrating", "Low cal"]),
    "IMMUNITY": (125, 1, ["Vit C", "Ginger"]),
    "Banana Smoothie": (220, 7, ["Energy", "Potassium"]),
    "Mango Smoothie": (240, 6, ["Vit A", "Energy"]),
    "Strawberry Smoothie": (200, 6, ["Vit C", "Antioxidants"]),
    "Mixed Berry Smoothie": (210, 6, ["Antioxidants", "Fibre"]),
    "Banana Protein": (300, 28, ["Muscle", "Energy"]),
    "Chocolate Protein": (310, 27, ["Muscle", "Recovery"]),
    "Peanut Butter Protein": (380, 32, ["Muscle", "Healthy fats"]),
    "Mango Protein": (320, 27, ["Muscle", "Vit A"]),
    "Peanut Chaat": (250, 11, ["Protein", "Healthy fats"]),
    "Chickpea Chaat": (220, 10, ["Protein", "Fibre"]),
    "Boiled Corn": (150, 5, ["Fibre", "Light"]),
    "Air-Fried Corn Chaat": (180, 5, ["Fibre", "Low oil"]),
    "Grilled Veg Sandwich": (280, 9, ["Fibre", "Veggies"]),
    "Paneer Sandwich": (350, 18, ["Protein", "Calcium"]),
    "Avocado Sandwich": (320, 8, ["Healthy fats", "Fibre"]),
    # bowls: kitchen estimates per bowl/jar; check them when the recipes are locked in Recipe Lab
    "Seasonal Fruit Bowl": (170, 2, ["Seasonal fruit", "Light"]),
    "Fig & Fruit Overnight Oats": (360, 12, ["Oats", "Fibre"]),
    "Cocoa Peanut Overnight Oats": (430, 15, ["Oats", "Peanut"]),
    "Berry Muesli Yogurt Bowl": (260, 10, ["Yogurt", "Muesli"]),
    "Strawberry Banana Yogurt Bowl": (220, 8, ["Yogurt", "Fruit"]),
}

FALLBACK_IMAGE = "fruit-flatlay"


def open_db(db_path: Path) -> sqlite3.Connection:
    """Open the POS database for reading. Read-only mode can fail while the POS is running
    (SQLite's write-ahead log needs its side files), so fall back to a normal connection;
    this script only ever runs SELECTs."""
    if not Path(db_path).exists():
        raise SystemExit(f"POS database not found: {db_path}")
    try:
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        con.execute("SELECT 1 FROM categories LIMIT 1")
        return con
    except sqlite3.OperationalError:
        return sqlite3.connect(db_path)


def export(db_path: Path) -> dict:
    con = open_db(db_path)
    con.row_factory = sqlite3.Row
    cats = con.execute("SELECT id, name FROM categories WHERE active = 1 AND name != ? ORDER BY sort, id",
                       (BLEND_CATEGORY,)).fetchall()
    menu = {"categories": [], "options": [], "addons": []}
    allowed = {}   # category id -> add-on/option names the POS allows there
    for r in con.execute("SELECT ac.category_id, a.name FROM addons a JOIN addon_categories ac ON ac.addon_id = a.id "
                         "WHERE a.active = 1 ORDER BY a.sort, a.id"):   # same order as the POS shows them
        allowed.setdefault(r["category_id"], []).append(r["name"])
    for c in cats:
        meta = CATEGORY_META.get(c["name"], {"slug": c["name"].lower().replace(" ", "-").replace(":", ""),
                                             "blurb": "", "accent": "#7DB46C"})
        items = []
        for it in con.execute("SELECT id, name, description FROM items WHERE category_id = ? AND active = 1 "
                              "ORDER BY sort, id", (c["id"],)):
            sizes = [{"name": s["name"], "price": s["price"]} for s in con.execute(
                "SELECT name, price FROM item_sizes WHERE item_id = ? ORDER BY sort, id", (it["id"],))]
            if not sizes:
                continue
            img = ITEM_IMAGES.get(it["name"])
            items.append({
                "name": it["name"],
                "desc": it["description"],
                "sizes": sizes,
                "img": f"assets/img/menu/{img}.jpg" if img else f"assets/img/scene/{FALLBACK_IMAGE}.jpg",
                "badge": BADGES.get(it["name"], ""),
                **({"art": ITEM_ART[it["name"]]} if not img and it["name"] in ITEM_ART else {}),
                "extras": allowed.get(c["id"], []),   # options + add-ons the POS allows for this item
            })
            if it["name"] in NUTRITION:
                kcal, protein, tags = NUTRITION[it["name"]]
                items[-1].update({"kcal": kcal, "protein": protein, "tags": tags})
        if items:
            meta = dict(meta)
            hero = meta.pop("hero", None)
            meta["hero"] = f"assets/img/menu/{hero}.jpg" if hero else items[0]["img"]
            menu["categories"].append({"name": c["name"], **meta, "items": items})
    for a in con.execute("SELECT name, price, kind FROM addons WHERE active = 1 ORDER BY sort, id"):
        (menu["options"] if a["kind"] == "option" else menu["addons"]).append({"name": a["name"], "price": a["price"]})
    con.close()
    return menu


def export_blends(db_path: Path) -> dict:
    """blend key (e.g. "orange+carrot+ginger") -> POS item name, blend name and prices."""
    con = open_db(db_path)
    con.row_factory = sqlite3.Row
    row = con.execute("SELECT value FROM settings WHERE key = 'blend_map'").fetchone()
    out = {}
    for key, item_id in (json.loads(row["value"]) if row else {}).items():
        it = con.execute("""SELECT i.name, i.description, i.active, c.name AS cat FROM items i
                            JOIN categories c ON c.id = i.category_id WHERE i.id = ?""", (item_id,)).fetchone()
        if not it or not it["active"]:
            continue
        sizes = [{"name": s["name"], "price": s["price"]} for s in con.execute(
            "SELECT name, price FROM item_sizes WHERE item_id = ? ORDER BY sort, id", (item_id,))]
        existing = it["cat"] != BLEND_CATEGORY
        img = ITEM_IMAGES.get(it["name"]) if existing else BLEND_IMAGES.get(key.split("+")[0])
        out[key] = {"name": it["name"], "sizes": sizes, "existing": existing,
                    "img": f"assets/img/menu/{img}.jpg" if img else f"assets/img/scene/{FALLBACK_IMAGE}.jpg"}
    con.close()
    return out


def export_catalog(db_path: Path) -> dict:
    """Every orderable item (menu + blends): sizes with prices, allowed options and paid add-ons."""
    con = open_db(db_path)
    con.row_factory = sqlite3.Row
    by_cat = {}
    for r in con.execute("""SELECT ac.category_id, a.name, a.price, a.kind FROM addons a
                            JOIN addon_categories ac ON ac.addon_id = a.id WHERE a.active = 1 ORDER BY a.sort, a.id"""):
        by_cat.setdefault(r["category_id"], []).append(r)
    items = {}
    for it in con.execute("""SELECT i.id, i.name, i.category_id FROM items i JOIN categories c ON c.id = i.category_id
                             WHERE i.active = 1 AND c.active = 1"""):
        sizes = {s["name"]: s["price"] for s in con.execute(
            "SELECT name, price FROM item_sizes WHERE item_id = ? ORDER BY sort, id", (it["id"],))}
        if not sizes:
            continue
        extras = by_cat.get(it["category_id"], [])
        items[it["name"]] = {"sizes": sizes,
                             "options": [a["name"] for a in extras if a["kind"] == "option"],
                             "addons": {a["name"]: a["price"] for a in extras if a["kind"] == "addon"}}
    con.close()
    return {"items": items}


def static_menu_html(menu: dict) -> str:
    """The full menu as plain HTML, same items and POS prices as menu.js."""
    from html import escape
    rupee = lambda n: f"₹{n:,}"
    out = ['<div class="pricelist__cols">']
    for c in menu["categories"]:
        out.append(f'            <section class="pricelist__cat"><h3>{escape(c["name"])}</h3>')
        out.append(f'              <p>{escape(c["blurb"])}</p>')
        out.append('              <ul>')
        for it in c["items"]:
            prices = " · ".join((f'{escape(s["name"])} {rupee(s["price"])}' if len(it["sizes"]) > 1 else rupee(s["price"]))
                                for s in it["sizes"])
            desc = f' <small>{escape(it["desc"])}</small>' if it.get("desc") else ""
            out.append(f'                <li><span>{escape(it["name"])}{desc}</span><span>{prices}</span></li>')
        out.append('              </ul></section>')
    extras = [o["name"] for o in menu.get("options", [])]
    adds = [f'{a["name"]} +{rupee(a["price"])}' for a in menu.get("addons", [])]
    if extras or adds:
        out.append(f'            <p class="pricelist__extras">Free: {escape(", ".join(extras))}. Add-ons: {escape(", ".join(adds))}.</p>')
    out.append('          </div>')
    return "\n".join(out)


def write_static_menu(menu: dict) -> None:
    html = INDEX.read_text(encoding="utf-8")
    i, j = html.find(LIST_START), html.find(LIST_END)
    if i < 0 or j < 0:
        print(f"! {INDEX.name}: MENU-LIST markers not found, static price list not updated")
        return
    i = html.index("-->", i) + 3
    html = html[:i] + "\n          " + static_menu_html(menu) + "\n          " + html[j:]
    INDEX.write_text(html, encoding="utf-8")
    print(f"Wrote the static price list into {INDEX.name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--static-only", action="store_true",
                    help="only rebuild the price list in index.html from the current menu.js (no POS needed)")
    args = ap.parse_args()
    if args.static_only:
        text = OUT.read_text(encoding="utf-8")
        write_static_menu(json.loads(text[text.index("{"):text.rindex("}") + 1]))
        return
    menu = export(args.db)
    OUT.write_text("/* Generated by tools/export_menu.py from the POS database. Do not edit by hand. */\n"
                   "window.MENU = " + json.dumps(menu, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    n = sum(len(c["items"]) for c in menu["categories"])
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(menu['categories'])} categories, {n} items")
    write_static_menu(menu)
    blends = export_blends(args.db)
    BLENDS_OUT.write_text("/* Generated by tools/export_menu.py from the POS database. Do not edit by hand. */\n"
                          "window.BLENDS = " + json.dumps(blends, ensure_ascii=False, separators=(",", ":")) + ";\n",
                          encoding="utf-8")
    print(f"Wrote {BLENDS_OUT.relative_to(ROOT)}: {len(blends)} build-your-own blends priced from the POS")
    catalog = export_catalog(args.db)
    CATALOG_OUT.parent.mkdir(parents=True, exist_ok=True)
    CATALOG_OUT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {CATALOG_OUT.relative_to(ROOT)}: {len(catalog['items'])} orderable items for the order checks")


if __name__ == "__main__":
    main()
