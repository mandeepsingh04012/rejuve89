/* re.juve /89 website */
(() => {
  "use strict";

  const WA_NUMBER = "918816809822";
  const WA_CHANNEL = "https://whatsapp.com/channel/0029VbEFlvgHgZWYlYueCk3f";   // paste the WhatsApp Channel link here (https://whatsapp.com/channel/...) to show its buttons
  const IG_URL = "https://www.instagram.com/rejuve89";
  const FB_URL = "https://www.facebook.com/profile.php?id=61595347947057";
  const REVIEW_URL = "https://g.page/r/CcPdn0szTbUwECE/review";
  const MENU = window.MENU || { categories: [], options: [], addons: [] };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rupee = n => "₹" + n.toLocaleString("en-IN");
  // online-ordering channel from /api/ordering: web | whatsapp | paused | closed (see "Online ordering" below)
  let ordering = { channel: "whatsapp", accepting: true };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VIEWS = ["build", "quiz", "sugar", "about"];   // sections that open as full-screen pages

  // Opening day comes from <html data-opening-at data-opening-label> in index.html (the one place to change it).
  // No date yet = orders stay closed. Until opening the cart still works but orders can't be sent.
  // Staff can test orders during trial runs by opening the site once with ?trial (lasts for that tab).
  const root = document.documentElement;
  const LAUNCH = Date.parse(root.dataset.openingAt || "") || Infinity;
  const OPENING_LABEL = root.dataset.openingLabel || "soon";
  const OPENING_WHEN = OPENING_LABEL + (LAUNCH < Infinity ? " · 8 AM" : "");   // "Wed, 11 Nov · 8 AM" or "mid-November"
  $$("[data-opening]").forEach(el => { el.textContent = el.dataset.opening === "date" ? OPENING_LABEL : OPENING_WHEN; });
  try { if (/[?&]trial\b/.test(location.search)) sessionStorage.setItem("rejuve89-trial", "1"); } catch { /* ignore */ }
  const prelaunch = () => {
    try { if (sessionStorage.getItem("rejuve89-trial")) return false; } catch { /* ignore */ }
    return Date.now() < LAUNCH;
  };
  const canOrder = () => !prelaunch() && ordering.accepting !== false;
  const PRELAUNCH_MSG = `We open ${OPENING_WHEN}. Your order stays saved here, so you can send it then.`;

  const ICON_PLUS = '<svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" class="ic"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ------------------------------------------------------------------
     Loader → page ready
     ------------------------------------------------------------------ */
  const ready = () => {
    document.body.classList.remove("is-loading");
    setTimeout(() => document.body.classList.add("is-ready"), 250);
  };
  const minShow = reduceMotion ? 0 : 1300;
  const t0 = performance.now();
  const finish = () => setTimeout(ready, Math.max(0, minShow - (performance.now() - t0)));
  if (document.readyState === "complete") finish(); else window.addEventListener("load", finish, { once: true });
  setTimeout(ready, 4000); // never block the page on slow networks

  $("#year").textContent = new Date().getFullYear();
  if (WA_CHANNEL) $$("[data-wa-channel]").forEach(a => { a.href = WA_CHANNEL; a.hidden = false; });

  /* ------------------------------------------------------------------
     Body scroll lock that works on iOS Safari
     ------------------------------------------------------------------ */
  let lockY = 0, locks = 0;
  const lock = () => {
    if (locks++) return;
    lockY = window.scrollY;
    document.body.style.top = `-${lockY}px`;
    document.body.classList.add("is-locked");
  };
  const unlock = () => {
    if (--locks > 0) return;
    locks = 0;
    document.body.classList.remove("is-locked");
    document.body.style.top = "";
    const html = document.documentElement;
    html.style.scrollBehavior = "auto"; // jump back without the smooth-scroll animation
    window.scrollTo(0, lockY);
    html.style.scrollBehavior = "";
  };

  /* ------------------------------------------------------------------
     Header: solid on scroll, hide on scroll down, show on scroll up
     ------------------------------------------------------------------ */
  const nav = $("#nav");
  const menuBar = $("#menuBar");
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 20);
    if (!document.documentElement.classList.contains("menu-open")) {
      nav.classList.toggle("is-hidden", y > 500 && y > lastY + 4);
      if (y < lastY - 4) nav.classList.remove("is-hidden");
    }
    const barTop = menuBar.getBoundingClientRect().top;
    menuBar.classList.toggle("is-stuck", barTop <= (nav.classList.contains("is-hidden") ? 1 : nav.offsetHeight + 1));
    parallax();
    lastY = y;
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // Active link highlight
  const sections = ["menu", "visit"].map(id => document.getElementById(id));
  const linkFor = id => $$(`.nav__links a[href="#${id}"]`);
  const activeIO = new IntersectionObserver(entries => {
    entries.forEach(e => linkFor(e.target.id).forEach(a => a.classList.toggle("is-active", e.isIntersecting)));
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(s => s && activeIO.observe(s));

  /* ------------------------------------------------------------------
     Mobile sheet
     ------------------------------------------------------------------ */
  const burger = $("#burger"), sheet = $("#sheet");
  const setSheet = open => {
    const was = document.documentElement.classList.contains("menu-open");
    if (open === was) return;
    document.documentElement.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    sheet.setAttribute("aria-hidden", !open);
    nav.classList.remove("is-hidden");
    open ? lock() : unlock();
  };
  burger.addEventListener("click", () => setSheet(!document.documentElement.classList.contains("menu-open")));
  $$(".sheet a").forEach(a => a.addEventListener("click", e => {
    const href = a.getAttribute("href");
    if (!href.startsWith("#") || VIEWS.includes(href.slice(1))) return;   // pages are handled by the view router
    e.preventDefault();
    setSheet(false);
    requestAnimationFrame(() => document.querySelector(href)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }));
  }));

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  const observeReveals = root => $$(".reveal:not(.is-in)", root).forEach(el => io.observe(el));
  observeReveals(document);

  // Lazy map: only load Google Maps when the visitor gets close to it
  const mapFrame = $(".visit__map iframe");
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { mapFrame.src = mapFrame.dataset.src; obs.disconnect(); }
  }, { rootMargin: "400px" }).observe(mapFrame);

  /* ------------------------------------------------------------------
     Parallax (hero art + final CTA)
     ------------------------------------------------------------------ */
  const parallaxEls = $$("[data-parallax]");
  const finaleBg = $(".finale__bg");
  function parallax() {
    if (reduceMotion) return;
    const y = window.scrollY;
    if (y < window.innerHeight * 1.2) {
      parallaxEls.forEach(el => { el.style.translate = `0 ${(y * parseFloat(el.dataset.parallax)).toFixed(1)}px`; });
    }
    const r = finaleBg.parentElement.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) {
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      finaleBg.style.transform = `translate3d(0, ${(p * -60).toFixed(1)}px, 0)`;
    }
  }

  /* ------------------------------------------------------------------
     Pickup lines
     ------------------------------------------------------------------ */
  const LINES = [
    "You had me at “no added sugar.”",
    "Are you a smoothie? Because I've got a crush on you, and it's blended.",
    "Is your name Mosambi? Because you're sweet, local and totally my type.",
    "Watermelon you doing later? Let's grab a juice.",
    "I'm not saying you're the one… but you're definitely my 600ml.",
    "Are you a protein shake? Because you make every rep worth it.",
    "You must be orange juice, because you just made my morning.",
    "Lettuce be honest: you deserve something fresh.",
    "Are you RE:GLOW? Because you're absolutely radiant.",
    "I'd ask you out for coffee, but you look like a fresh-juice kind of person.",
    "Let's skip the small talk and go straight to a large ABC.",
    "You're the pineapple of my eye.",
  ];
  const lineText = $("#lineText"), shareLine = $("#shareLine");
  let lineIdx = 0;
  const setShare = () => {
    const msg = `${LINES[lineIdx]}\n\n🥤 Let's grab a juice at re.juve /89, Orris Market 89, Gurugram. Pure. Honest. Always fresh.`;
    shareLine.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };
  const nextLine = () => {
    lineText.classList.add("is-swapping");
    setTimeout(() => {
      let n; do { n = Math.floor(Math.random() * LINES.length); } while (n === lineIdx);
      lineIdx = n;
      lineText.textContent = LINES[lineIdx];
      setShare();
      lineText.classList.remove("is-swapping");
    }, reduceMotion ? 0 : 380);
  };
  $("#nextLine").addEventListener("click", () => { nextLine(); resetLineTimer(); });
  let lineTimer;
  const resetLineTimer = () => { clearInterval(lineTimer); lineTimer = setInterval(nextLine, 6500); };
  new IntersectionObserver(([e]) => { e.isIntersecting ? resetLineTimer() : clearInterval(lineTimer); }).observe($("#lines"));
  setShare();

  /* ------------------------------------------------------------------
     Menu
     ------------------------------------------------------------------ */
  const cats = MENU.categories;
  const isDrinkCat = c => c.items.some(i => i.sizes.length > 1);
  // the size switch works in ml, so "450ml" and "Medium (450ml)" are the same glass
  const mlOf = name => { const m = String(name).match(/(\d+)\s*ml/i); return m ? +m[1] : 0; };
  const allSizes = [...new Set(cats.filter(isDrinkCat).flatMap(c => c.items.flatMap(i => i.sizes.map(s => mlOf(s.name)))))]
    .filter(Boolean).sort((a, b) => a - b).map(ml => `${ml}ml`);
  let activeCat = cats[0]?.slug;
  let activeSize = allSizes[0];

  const fromPrice = c => Math.min(...c.items.flatMap(i => i.sizes.map(s => s.price)));
  const describe = (item, cat) => {
    if (item.desc) return item.desc;
    const fruit = item.name.replace(/\s*(Fresh|Smoothie|Protein)$/i, "").trim();
    if (cat.slug === "juices") return `100% fresh ${fruit.toLowerCase()}, nothing else`;
    if (cat.slug === "smoothies") return `Real ${fruit.toLowerCase()}, blended thick`;
    return "";
  };

  // Category tabs, each with a small round photo (they replace the big category tiles)
  const tabs = $("#tabs");
  tabs.innerHTML = cats.map(c =>
    `<button class="tab" role="tab" id="tab-${c.slug}" aria-selected="${c.slug === activeCat}" data-cat="${c.slug}">
      <img class="tab__img" src="${c.hero || c.items[0].img}" alt="" width="30" height="30" decoding="async">${esc(c.name)}</button>`
  ).join("");
  tabs.addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) selectCat(b.dataset.cat, true); });
  tabs.addEventListener("keydown", e => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const idx = cats.findIndex(c => c.slug === activeCat);
    const n = (idx + (e.key === "ArrowRight" ? 1 : -1) + cats.length) % cats.length;
    selectCat(cats[n].slug, true);
    $(`#tab-${cats[n].slug}`).focus();
  });

  // Size switcher
  const sizesEl = $("#sizes"), thumb = $(".sizes__thumb", sizesEl);
  sizesEl.insertAdjacentHTML("beforeend", allSizes.map(s =>
    `<button role="radio" aria-checked="${s === activeSize}" data-size="${s}">${s}</button>`).join(""));
  const moveThumb = () => {
    const b = $(`button[data-size="${activeSize}"]`, sizesEl);
    if (!b) return;
    thumb.style.width = b.offsetWidth + "px";
    thumb.style.transform = `translateX(${b.offsetLeft - 4}px)`;
  };
  sizesEl.addEventListener("click", e => {
    const b = e.target.closest("button[data-size]");
    if (!b || b.dataset.size === activeSize) return;
    activeSize = b.dataset.size;
    $$("button[data-size]", sizesEl).forEach(x => x.setAttribute("aria-checked", x === b));
    moveThumb();
    updatePrices();
  });
  window.addEventListener("resize", moveThumb);
  if (document.fonts) document.fonts.ready.then(moveThumb);

  const grid = $("#menuGrid"), blurb = $("#menuBlurb");

  // "Pick by goal": filters across categories, built only from menu facts (protein, kcal, tags, price)
  const KIDS = ["Banana Chocolate Smoothie", "Strawberry Smoothie", "Banana Shake", "Chocolate Shake", "Watermelon Fresh", "Orange Fresh"];
  const isDrink = it => it.sizes.length > 1;
  const GOALS = [
    { id: "workout", icon: "💪", label: "Post-workout", note: "15 g+ protein in a 300ml glass or a sandwich.", test: it => it.protein >= 15 },
    { id: "light", icon: "🍃", label: "Light", note: "120 kcal or less in a 300ml glass, without added sugar.", test: it => isDrink(it) && it.kcal && it.kcal <= 120 },
    { id: "hydrating", icon: "💧", label: "Hydrating", note: "Watery fruits: watermelon, mosambi, cucumber and mint.", test: it => (it.tags || []).includes("Hydrating") },
    { id: "kids", icon: "🧒", label: "Kids, no sugar", note: "Kid favourites. Tap one and No sugar is already picked.", test: it => KIDS.includes(it.name), preset: { opts: ["No Sugar"] } },
    { id: "under100", icon: "💸", label: "Under ₹100", note: "Every pick here starts below ₹100.", test: it => Math.min(...it.sizes.map(s => s.price)) < 100 },
  ];
  let activeGoal = null;
  const goalItems = g => cats.flatMap(c => c.items.map((it, idx) => ({ cat: c, it, idx }))).filter(x => g.test(x.it));
  const goalsEl = $("#goals");
  goalsEl.innerHTML = GOALS.map(g => {
    const n = goalItems(g).length;
    return n ? `<button type="button" class="goal" aria-pressed="false" data-goal="${g.id}"><span aria-hidden="true">${g.icon}</span>${esc(g.label)}<small>${n}</small></button>` : "";
  }).join("");
  goalsEl.addEventListener("click", e => {
    const b = e.target.closest("[data-goal]");
    if (!b) return;
    activeGoal = activeGoal === b.dataset.goal ? null : b.dataset.goal;
    $$("[data-goal]", goalsEl).forEach(x => x.setAttribute("aria-pressed", x.dataset.goal === activeGoal));
    $$(".tab", tabs).forEach(t => t.setAttribute("aria-selected", !activeGoal && t.dataset.cat === activeCat));
    renderGrid();
    if (grid.getBoundingClientRect().top < 0 || grid.getBoundingClientRect().top > innerHeight * .7) $("#menuBar").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
  const sizeFor = item => item.sizes.find(s => mlOf(s.name) === mlOf(activeSize)) || item.sizes[0];

  // Nutrition is stored per 300ml; scale it to the chosen glass size.
  const sizeScale = sizeName => { const ml = mlOf(sizeName); return ml ? ml / 300 : 1; };
  const nutriHTML = (item, sizeName, extraWhey = 0) => {
    if (!item.kcal) return "";
    const f = item.sizes.length > 1 ? sizeScale(sizeName) : 1;
    const kcal = Math.round((item.kcal * f + extraWhey * 120) / 5) * 5;
    const protein = Math.round(item.protein * (item.protein > 20 ? 1 + (f - 1) * 0.25 : f) + extraWhey * 24);
    const bits = [`<span class="nutri__k">~${kcal} kcal</span>`];
    if (protein >= 8) bits.push(`<span class="nutri__p">${protein}g protein</span>`);
    (item.tags || []).slice(0, protein >= 8 ? 1 : 2).forEach(t => bits.push(`<span>${esc(t)}</span>`));
    return bits.join("");
  };

  // the cards on screen: a category, or every item matching the active goal
  const shownItems = () => {
    const g = GOALS.find(x => x.id === activeGoal);
    if (g) return goalItems(g);
    const cat = cats.find(c => c.slug === activeCat);
    return cat.items.map((it, idx) => ({ cat, it, idx }));
  };

  function renderGrid() {
    const g = GOALS.find(x => x.id === activeGoal), list = shownItems();
    const cat = cats.find(c => c.slug === activeCat);
    sizesEl.classList.toggle("is-hidden", !list.some(x => isDrink(x.it)));
    blurb.textContent = g ? `${g.icon} ${g.label}: ${g.note}` : `${cat.blurb} From ${rupee(fromPrice(cat))}.`;
    const why = !g && cat.why ? cat.why : [];          // a few "why" lines for some categories (from export_menu.py)
    $("#menuWhy").hidden = !why.length;
    $("#menuWhy").innerHTML = why.map(w => `<li>${esc(w)}</li>`).join("");
    if (g) grid.removeAttribute("aria-labelledby"); else grid.setAttribute("aria-labelledby", `tab-${cat.slug}`);
    grid.innerHTML = list.map(({ cat, it, idx }, i) => {
      const s = sizeFor(it);
      return `<article class="card" style="--i:${i}" data-cat="${cat.slug}" data-idx="${idx}">
        <div class="card__media${it.art ? " card__media--art" : ""}" data-open${it.art ? ` style="--accent:${cat.accent || "#E9A23B"}"` : ""}>
          ${it.art ? `<span class="card__art" role="img" aria-label="${esc(it.name)}">${it.art}</span>`
            : `<img src="${it.img}" alt="${esc(it.name)}" loading="lazy" decoding="async" width="720" height="720">`}
          ${it.badge ? `<span class="card__badge">${esc(it.badge)}</span>` : ""}
        </div>
        <div class="card__body">
          <h3 class="card__name">${esc(it.name)}</h3>
          <p class="card__desc">${esc(describe(it, cat))}</p>
          ${it.kcal ? `<p class="nutri">${nutriHTML(it, s.name)}</p>` : ""}
          <div class="card__foot">
            <span class="card__price"><span class="num">${rupee(s.price)}</span><small>${it.sizes.length > 1 ? s.name : ""}</small></span>
            <button class="add" aria-label="Add ${esc(it.name)}" data-open>${ICON_PLUS}</button>
          </div>
        </div>
      </article>`;
    }).join("");
    $$("img", grid).forEach(img => {
      if (img.complete) img.classList.add("is-loaded");
      else img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      img.addEventListener("error", () => img.classList.add("is-loaded"), { once: true });
    });
    requestAnimationFrame(moveThumb);
  }

  function updatePrices() {
    $$(".card", grid).forEach(card => {
      const it = cats.find(c => c.slug === card.dataset.cat).items[+card.dataset.idx];
      if (it.sizes.length < 2) return;
      const s = sizeFor(it);
      const num = $(".num", card), small = $(".card__price small", card);
      num.classList.add("is-bump");
      const nutri = $(".nutri", card);
      setTimeout(() => {
        num.textContent = rupee(s.price); small.textContent = s.name; num.classList.remove("is-bump");
        if (nutri) nutri.innerHTML = nutriHTML(it, s.name);
      }, reduceMotion ? 0 : 180);
    });
  }

  function selectCat(slug, keepScroll) {
    activeCat = slug;
    activeGoal = null;
    $$("[data-goal]", goalsEl).forEach(x => x.setAttribute("aria-pressed", "false"));
    $$(".tab", tabs).forEach(t => t.setAttribute("aria-selected", t.dataset.cat === slug));
    const tab = $(`#tab-${slug}`);
    tab.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
    if (keepScroll && grid.getBoundingClientRect().top < 0) {
      $("#menu").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
    renderGrid();
  }

  grid.addEventListener("click", e => {
    const t = e.target.closest("[data-open]");
    if (!t) return;
    const card = t.closest(".card");
    const g = GOALS.find(x => x.id === activeGoal);
    openItem(cats.find(c => c.slug === card.dataset.cat), +card.dataset.idx, t.classList.contains("add") ? t : null, g && g.preset);
  });

  // Free customisations strip
  $("#customList").innerHTML =
    MENU.options.map(o => `<li>${esc(o.name)}</li>`).join("") +
    MENU.addons.map(a => `<li>${esc(a.name)} <b>+${rupee(a.price)}</b></li>`).join("");

  renderGrid();

  /* ------------------------------------------------------------------
     Item modal (size, options, add-ons, qty)
     ------------------------------------------------------------------ */
  const modal = $("#itemModal");
  let mState = null, lastFocus = null;

  // Options and add-ons come from the POS (item.extras), so the website never offers something the counter can't bill
  const optionsFor = (cat, item) => MENU.options.filter(o => (item.extras || []).includes(o.name));
  const addonsFor = (cat, item) => MENU.addons.filter(a => (item.extras || []).includes(a.name));

  function openItem(cat, idx, fromBtn, preset = {}) {
    const item = cat.items[idx];
    const size = item.sizes.some(s => s.name === preset.size) ? preset.size : sizeFor(item).name;
    mState = { cat, item, size, opts: new Set(), adds: new Set(), qty: 1 };
    lastFocus = fromBtn || document.activeElement;
    $("#mImg").src = item.img;
    $("#mImg").alt = item.name;
    // items without a photo yet show their colour tile here too
    const media = $(".modal__media", modal);
    media.classList.toggle("card__media--art", !!item.art);
    media.style.setProperty("--accent", cat.accent || "#E9A23B");
    $("#mImg").hidden = !!item.art;
    $(".card__art", media)?.remove();
    if (item.art) media.insertAdjacentHTML("beforeend", `<span class="card__art" aria-hidden="true">${item.art}</span>`);
    $("#mTitle").textContent = item.name;
    $("#mDesc").textContent = describe(item, cat);

    $("#mSizesWrap").hidden = item.sizes.length < 2;
    $("#mSizes").innerHTML = item.sizes.map(s =>
      `<button class="pill" role="radio" aria-checked="${s.name === mState.size}" data-size="${esc(s.name)}">${esc(s.name)} <small>${rupee(s.price)}</small></button>`).join("");

    const opts = optionsFor(cat, item);
    $("#mOptsWrap").hidden = !opts.length;
    (preset.opts || []).forEach(o => { if (opts.some(x => x.name === o)) mState.opts.add(o); });
    $("#mOpts").innerHTML = opts.map(o => `<button class="pill" aria-pressed="${mState.opts.has(o.name)}" data-opt="${esc(o.name)}">${esc(o.name)}</button>`).join("");

    const adds = addonsFor(cat, item);
    $("#mAddWrap").hidden = !adds.length;
    $("#mAdds").innerHTML = adds.map(a => `<button class="pill" aria-pressed="false" data-add="${esc(a.name)}">${esc(a.name)} <small>+${rupee(a.price)}</small></button>`).join("");

    $("#mQty").textContent = 1;
    updateModalPrice();
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    $(".modal__body", modal).scrollTop = 0;
    lock();
    setTimeout(() => $("#mAdd").focus({ preventScroll: true }), 300);
  }
  const closeModal = () => {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlock();
    lastFocus?.focus?.({ preventScroll: true });
  };
  const itemUnitPrice = st => {
    const base = st.item.sizes.find(s => s.name === st.size).price;
    return base + [...st.adds].reduce((sum, n) => sum + (MENU.addons.find(a => a.name === n)?.price || 0), 0);
  };
  const updateModalPrice = () => {
    $("#mPrice").textContent = rupee(itemUnitPrice(mState) * mState.qty);
    const n = nutriHTML(mState.item, mState.size, mState.adds.size);
    $("#mNutri").innerHTML = n;
    $("#mNutri").hidden = !n;
  };

  $("#mSizes").addEventListener("click", e => {
    const b = e.target.closest("[data-size]"); if (!b) return;
    mState.size = b.dataset.size;
    $$("[data-size]", $("#mSizes")).forEach(x => x.setAttribute("aria-checked", x === b));
    updateModalPrice();
  });
  $("#mOpts").addEventListener("click", e => {
    const b = e.target.closest("[data-opt]"); if (!b) return;
    const name = b.dataset.opt, on = !mState.opts.has(name);
    // "No Sugar" and "Less Sugar" can't both be picked
    if (on && /sugar/i.test(name)) {
      $$("[data-opt]", $("#mOpts")).forEach(x => {
        if (x !== b && /sugar/i.test(x.dataset.opt)) { mState.opts.delete(x.dataset.opt); x.setAttribute("aria-pressed", "false"); }
      });
    }
    on ? mState.opts.add(name) : mState.opts.delete(name);
    b.setAttribute("aria-pressed", on);
  });
  $("#mAdds").addEventListener("click", e => {
    const b = e.target.closest("[data-add]"); if (!b) return;
    const name = b.dataset.add, on = !mState.adds.has(name);
    on ? mState.adds.add(name) : mState.adds.delete(name);
    b.setAttribute("aria-pressed", on);
    updateModalPrice();
  });
  $("#mPlus").addEventListener("click", () => { mState.qty = Math.min(MAX_QTY, mState.qty + 1); $("#mQty").textContent = mState.qty; updateModalPrice(); });
  $("#mMinus").addEventListener("click", () => { mState.qty = Math.max(1, mState.qty - 1); $("#mQty").textContent = mState.qty; updateModalPrice(); });
  $("#mAdd").addEventListener("click", () => {
    addToCart(mState);
    const btn = lastFocus?.classList?.contains("add") ? lastFocus : null;
    closeModal();
    if (btn) { btn.innerHTML = ICON_CHECK; btn.classList.add("is-done"); setTimeout(() => { btn.innerHTML = ICON_PLUS; btn.classList.remove("is-done"); }, 1400); }
  });
  modal.addEventListener("click", e => { if (e.target === modal || e.target.closest("[data-close]")) closeModal(); });

  /* ------------------------------------------------------------------
     Cart (kept in localStorage so a refresh doesn't lose the order)
     ------------------------------------------------------------------ */
  const CART_KEY = "rejuve89-cart-v1";
  let cart = [];
  const MAX_QTY = 10, MAX_LINES = 20;          // same limits the order server enforces
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
  // a stale or hand-edited cart must not break the page
  cart = (Array.isArray(cart) ? cart : [])
    .filter(l => l && typeof l.name === "string" && Number.isFinite(l.unit) && Number.isInteger(l.qty) && l.qty > 0)
    .map(l => ({ ...l, size: String(l.size || ""), opts: Array.isArray(l.opts) ? l.opts : [], adds: Array.isArray(l.adds) ? l.adds : [], qty: Math.min(l.qty, MAX_QTY) }))
    .slice(0, MAX_LINES);
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private mode */ } };

  function addToCart(st) {
    const line = {
      name: st.item.name,
      img: st.item.img,
      size: st.item.sizes.length > 1 ? st.size : "",
      opts: [...st.opts],
      adds: [...st.adds],
      unit: itemUnitPrice(st),
      qty: st.qty,
    };
    line.key = [line.name, line.size, ...line.opts, ...line.adds].join("|");
    pushLine(line);
  }

  // add a line (or top up a matching one) within the per-item and per-order limits
  function pushLine(line) {
    const existing = cart.find(l => l.key === line.key);
    if (!existing && cart.length >= MAX_LINES) { toast(`An order can have up to ${MAX_LINES} different items`, 3500); return; }
    const have = existing ? existing.qty : 0, add = Math.min(line.qty, MAX_QTY - have);
    if (add <= 0) { toast(`Up to ${MAX_QTY} of each item per order`, 3500); return; }
    existing ? (existing.qty += add) : cart.push({ ...line, qty: add });
    saveCart();
    renderCart(true);
    toast(add < line.qty ? `Added ${add} (up to ${MAX_QTY} of each item)` : `${add} × ${line.name} added`);
  }

  const cartbar = $("#cartbar"), drawer = $("#drawer"), scrim = $("#scrim"), tabCount = $("#tabCount");
  const drawerBody = $(".drawer__body", drawer);
  const total = () => cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const count = () => cart.reduce((s, l) => s + l.qty, 0);

  function renderCart(bump) {
    const n = count(), t = total();
    $("#cartCount").textContent = n;
    tabCount.textContent = n;
    tabCount.hidden = n === 0;
    if (bump && !reduceMotion) { tabCount.classList.remove("is-bump"); void tabCount.offsetWidth; tabCount.classList.add("is-bump"); }
    $("#cartTotal").textContent = rupee(t);
    $("#drawerTotal").textContent = rupee(t);
    cartbar.classList.toggle("is-visible", n > 0 && !drawer.classList.contains("is-open"));
    if (bump && !reduceMotion) { cartbar.classList.remove("is-bump"); void cartbar.offsetWidth; cartbar.classList.add("is-bump"); }
    drawerBody.classList.toggle("has-items", n > 0);
    $("#sendOrder").disabled = n === 0 || !canOrder();
    updateSendLabel();
    $("#cartList").innerHTML = cart.map((l, i) => `<li>
      <img src="${esc(l.img || "")}" alt="" loading="lazy">
      <div>
        <div class="cart__name">${esc(l.name)}</div>
        <div class="cart__meta">${esc([l.size, ...l.opts, ...l.adds.map(a => "+ " + a)].filter(Boolean).join(" · ") || "Regular")}</div>
      </div>
      <div class="cart__right">
        <span class="cart__price">${rupee(l.unit * l.qty)}</span>
        <div class="qty">
          <button type="button" data-dec="${i}" aria-label="Remove one ${esc(l.name)}">−</button>
          <span>${l.qty}</span>
          <button type="button" data-inc="${i}" aria-label="Add one ${esc(l.name)}">+</button>
        </div>
      </div>
    </li>`).join("");
  }
  $("#cartList").addEventListener("click", e => {
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]");
    if (inc) {
      const l = cart[+inc.dataset.inc];
      if (l.qty >= MAX_QTY) { toast(`Up to ${MAX_QTY} of each item per order`, 3500); return; }
      l.qty++;
    }
    else if (dec) { const l = cart[+dec.dataset.dec]; if (--l.qty <= 0) cart.splice(+dec.dataset.dec, 1); }
    else return;
    saveCart();
    renderCart(false);
  });

  const openDrawer = () => {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    cartbar.setAttribute("aria-expanded", "true");
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("is-on"));
    cartbar.classList.remove("is-visible");
    lock();
    setTimeout(() => $("#drawerClose").focus({ preventScroll: true }), 350);
  };
  const closeDrawer = () => {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    cartbar.setAttribute("aria-expanded", "false");
    scrim.classList.remove("is-on");
    setTimeout(() => { scrim.hidden = true; }, 450);
    unlock();
    renderCart(false);
  };
  cartbar.addEventListener("click", openDrawer);
  $("#drawerClose").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);

  // Swipe the bottom sheet down to close it (phones)
  let dragY = null;
  $(".drawer__head", drawer).addEventListener("touchstart", e => { dragY = e.touches[0].clientY; }, { passive: true });
  $(".drawer__head", drawer).addEventListener("touchmove", e => {
    if (dragY === null) return;
    const dy = Math.max(0, e.touches[0].clientY - dragY);
    drawer.style.transition = "none";
    drawer.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  $(".drawer__head", drawer).addEventListener("touchend", e => {
    if (dragY === null) return;
    const dy = e.changedTouches[0].clientY - dragY;
    drawer.style.transition = drawer.style.transform = "";
    dragY = null;
    if (dy > 90) closeDrawer();
  });

  // Header "Order pickup" button: open the cart if there's something in it
  $("[data-open-cart-hint]").addEventListener("click", e => {
    if (count() > 0) { e.preventDefault(); openDrawer(); }
  });

  // Remember the customer's name for next time
  const nameInput = $("#custName");
  try { nameInput.value = localStorage.getItem("rejuve89-name") || ""; } catch { /* ignore */ }

  /* ------------------------------------------------------------------
     Online ordering: the POS decides (via /api/ordering) whether orders go
     straight into the POS ("web"), to WhatsApp, or are paused / closed.
     ------------------------------------------------------------------ */
  const pickText = () => $("#pickWhen").selectedOptions[0]?.textContent || "";
  const phoneInput = $("#custPhone");
  try { phoneInput.value = localStorage.getItem("rejuve89-phone") || ""; } catch { /* ignore */ }
  const cleanPhone = raw => {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2); else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
  };
  function payChoice() { return ($("input[name=pay]:checked") || {}).value || "counter"; }

  // Call our API with a timeout. Throws an Error whose message is fit for a toast;
  // err.status / err.data carry the server's reply when there was one.
  async function api(url, { body, timeout = 15000 } = {}) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeout);
    let r;
    try {
      r = await fetch(url, { cache: "no-store", signal: ctl.signal,
        ...(body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    } catch (e) {
      throw new Error(navigator.onLine === false ? "You're offline. Check your internet and try again."
        : e.name === "AbortError" ? "This is taking too long. Check your internet and try again."
        : "Couldn't reach us. Check your internet and try again.");
    } finally { clearTimeout(timer); }
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const err = new Error(data?.error || (r.status === 429 ? "Too many tries. Please wait a minute."
        : r.status >= 500 ? "Something went wrong on our side. Please try again." : "That didn't work. Please try again."));
      err.status = r.status; err.data = data;
      throw err;
    }
    if (!data) throw new Error("Something went wrong on our side. Please try again.");
    return data;
  }

  async function refreshOrdering() {
    try {
      const d = await api("/api/ordering", { timeout: 5000 });
      if (d && typeof d.channel === "string") ordering = d;
    } catch { /* offline, or opened from disk: keep WhatsApp ordering */ }
    applyOrdering();
  }

  function applyOrdering() {
    const web = ordering.channel === "web", open = canOrder();
    $$(".web-only").forEach(el => (el.hidden = !web));
    $("#payUpiOpt").hidden = !(web && ordering.upi);
    if (!(web && ordering.upi)) { const c = $("input[name=pay][value=counter]"); if (c) c.checked = true; }
    const btn = $("#sendOrder"), notice = $("#orderNotice");
    btn.classList.toggle("btn--wa", !web && open);
    btn.classList.toggle("btn--primary", web || !open);
    $("#sendIcon").innerHTML = web ? '<path d="M5 12l5 5L20 7"/>' : '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/>';
    notice.hidden = open && !ordering.fallback;
    notice.textContent = prelaunch() ? PRELAUNCH_MSG : !open ? ordering.message : ordering.fallback ? "Online orders are going through WhatsApp right now." : "";
    updateSendLabel();
    $("#drawerFine").textContent = web
      ? "Your order goes straight to our counter. You'll get a live status page."
      : "We'll confirm on WhatsApp. Pay with UPI, card or cash when you collect.";
    $("#sendOrder").disabled = count() === 0 || !open;
  }

  function updateSendLabel() {
    const web = ordering.channel === "web", open = canOrder();
    const upi = web && payChoice() === "upi";
    $("#sendLabel").textContent = !open ? (prelaunch() ? `Orders open ${OPENING_LABEL}` : ordering.channel === "paused" ? "Ordering paused" : "Closed for online orders")
      : web ? (upi ? `Place order & pay ${rupee(total())}` : `Place order · ${rupee(total())}`) : "Send order on WhatsApp";
    $("#totalLabel").textContent = upi ? "Total, pay now with UPI" : "Total, pay at the counter";
  }
  $$("input[name=pay]").forEach(r => r.addEventListener("change", updateSendLabel));

  function sendWhatsApp(name) {
    const lines = cart.map(l => {
      const extra = [l.size, ...l.opts, ...l.adds.map(a => "+" + a)].filter(Boolean).join(", ");
      return `• ${l.qty} × ${l.name}${extra ? ` (${extra})` : ""} = ${rupee(l.unit * l.qty)}`;
    });
    const note = $("#pickNote").value.trim();
    const msg = [
      "Hi re.juve /89! 🥤 I'd like to place a *pickup order*:",
      "",
      ...lines,
      "",
      `*Total: ${rupee(total())}*`,
      `Name: ${name}`,
      `Pickup: ${pickText()}`,
      note ? `Note: ${note}` : "",
      "",
      "I'll pay at the counter. Thanks!",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    toast("Opening WhatsApp…");
    setTimeout(() => {
      cart = []; saveCart(); $("#pickNote").value = ""; closeDrawer(); renderCart(false);
      toast("Order sent! See you soon 💚");
    }, 1200);
  }

  let placing = false;
  async function placeWebOrder(name) {
    const phone = cleanPhone(phoneInput.value);
    if (!phone) {
      phoneInput.classList.add("is-invalid"); phoneInput.focus();
      toast("Add your 10-digit mobile number for order updates");
      return;
    }
    phoneInput.classList.remove("is-invalid");
    try { localStorage.setItem("rejuve89-phone", phone); } catch { /* ignore */ }
    if (placing) return;
    placing = true;
    const btn = $("#sendOrder");
    btn.disabled = true;
    $("#sendLabel").textContent = "Placing order…";
    try {
      const data = await api("/api/order", { timeout: 20000, body: {
        name, phone, pickup_in: Number($("#pickWhen").value) || 0, note: $("#pickNote").value.trim(),
        payment: payChoice(), website: $("#hpField").value,
        items: cart.map(l => ({ name: l.name, size: l.size, opts: l.opts, adds: l.adds, qty: l.qty })),
      } });
      if (!data.order || !data.token) throw new Error("Something went wrong on our side. Please try again.");
      saveMyOrder(data.order, data.token);
      cart = []; saveCart(); $("#pickNote").value = ""; closeDrawer(); renderCart(false);
      openOrderSheet(data.order.id, data.token, data);
      if (data.upi) setTimeout(() => tryUpi(data.upi.link), 400);
    } catch (e) {
      if (e.status === 409 && e.data?.state) { ordering = e.data.state; applyOrdering(); }
      toast(e.message || ordering.message || "Couldn't place the order. Please try again.", 5000);
    } finally {
      placing = false;
      applyOrdering();
    }
  }

  $("#sendOrder").addEventListener("click", () => {
    const name = nameInput.value.trim().slice(0, 40);
    if (!name) {
      nameInput.classList.add("is-invalid");
      nameInput.focus();
      toast("Add your name so we can call it out");
      return;
    }
    nameInput.classList.remove("is-invalid");
    try { localStorage.setItem("rejuve89-name", name); } catch { /* ignore */ }
    if (prelaunch()) { toast(`We open ${OPENING_WHEN} 🎉`, 3500); return; }
    if (ordering.accepting === false) { toast(ordering.message || "Online ordering is closed right now"); return; }
    if (ordering.channel === "web") placeWebOrder(name); else sendWhatsApp(name);
  });
  phoneInput.addEventListener("input", () => phoneInput.classList.remove("is-invalid"));

  /* ---------------- order status page (live) ---------------- */
  const MY_KEY = "rejuve89-myorders";
  const myOrders = () => { try { return JSON.parse(localStorage.getItem(MY_KEY)) || []; } catch { return []; } };
  function saveMyOrder(o, token) {
    const list = myOrders().filter(x => x.id !== o.id && Date.now() - x.at < 12 * 3600e3);
    list.unshift({ id: o.id, code: o.code, token, at: Date.now(), done: false });
    try { localStorage.setItem(MY_KEY, JSON.stringify(list.slice(0, 5))); } catch { /* ignore */ }
    renderMyPill();
  }
  function markMyOrder(id, done) {
    const list = myOrders().map(x => (x.id === id ? { ...x, done } : x));
    try { localStorage.setItem(MY_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    renderMyPill();
  }
  function renderMyPill() {
    const live = myOrders().find(x => !x.done && Date.now() - x.at < 12 * 3600e3);
    const pill = $("#myOrderPill");
    pill.hidden = !live;
    if (live) { pill.innerHTML = `<span class="mytrack__dot"></span>Track order <b>${esc(live.code)}</b>`; pill.onclick = () => openOrderSheet(live.id, live.token); }
  }

  const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /mac/i.test(navigator.platform));
  function tryUpi(link) { if (isMobile) window.location.href = link; }

  // follow-for-cashback (staff check the follow on the customer's phone at pickup; see PLAYBOOK.md)
  const FOLLOW_KEY = "rejuve89-followed";
  const followed = () => { try { return !!localStorage.getItem(FOLLOW_KEY); } catch { return false; } };
  const ICON_IG = '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>';
  const ICON_FB = '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2Z"/></svg>';
  const FOLLOW_OK = '<p class="os-perk__ok">✓ Thanks for following! Show it on your phone at the counter to get 5% back.</p>';

  function perkHTML(o) {
    const parts = [];
    if (o.status !== "rejected" && o.status !== "collected") parts.push(`<div class="os-perk">
        <p><b>🎁 Get 5% cashback while you wait</b><br>Follow us on Instagram or Facebook, then show it at the counter when you collect.</p>
        <div class="os-perk__links">
          <a class="btn btn--ghost" href="${IG_URL}" target="_blank" rel="noopener" data-follow>${ICON_IG} Instagram</a>
          <a class="btn btn--ghost" href="${FB_URL}" target="_blank" rel="noopener" data-follow>${ICON_FB} Facebook</a>
        </div>
        ${followed() ? FOLLOW_OK : ""}
        <small>One time per customer.</small>
      </div>`);
    if (o.status === "ready" || o.status === "collected") parts.push(`<div class="os-review">
        <p><b>Enjoying it?</b> A quick Google review helps our small shop a lot.</p>
        <a class="btn btn--primary btn--block" href="${REVIEW_URL}" target="_blank" rel="noopener">★ Leave a Google review</a>
      </div>`);
    return parts.join("");
  }

  const STEPS = [["received", "Received"], ["accepted", "Accepted"], ["preparing", "Being made"], ["ready", "Ready"], ["collected", "Picked up"]];
  let osTimer = null, osCurrent = null;

  function osHTML(data) {
    const o = data.order, upi = data.upi;
    const rejected = o.status === "rejected";
    const at = o.status === "collected" ? STEPS.length : Math.max(0, STEPS.findIndex(([k]) => k === o.status));
    const pickup = o.pickup === "ASAP" ? "As soon as you arrive" : `Around ${o.pickup.replace(/^(\d+):(\d+)$/, (m, h, mm) => `${((+h + 11) % 12) + 1}:${mm} ${+h < 12 ? "AM" : "PM"}`)}`;
    let pay = "";
    if (o.payment === "upi") {
      if (o.payment_status === "pending") {
        pay = `<div class="os-pay">
          <p><b>Pay ${rupee(o.total)} by UPI</b> to start your order.</p>
          ${upi ? `<div class="os-qr"><img src="/api/order-qr?id=${encodeURIComponent(o.id)}&t=${encodeURIComponent(osCurrent ? osCurrent.token : "")}" alt="UPI QR code for ${rupee(o.total)}" width="200" height="200">
            <span>Scan with any UPI app<br><small>GPay · PhonePe · Paytm · BHIM</small><b>${rupee(o.total)}</b></span></div>` : ""}
          ${isMobile && upi ? `<a class="btn btn--primary btn--block" href="${esc(upi.link)}">Open UPI app on this phone · ${rupee(o.total)}</a>` : ""}
          ${upi ? `<p class="os-upi">UPI ID <b>${esc(upi.pa)}</b> · note <b>Order ${esc(o.code)}</b></p>` : ""}
          <label class="os-ref"><span>UPI reference / UTR (optional)</span><input type="text" id="osRef" inputmode="numeric" maxlength="30" placeholder="12-digit number from your UPI app"></label>
          <button class="btn btn--ghost btn--block" id="osPaid">I've paid</button>
        </div>`;
      } else if (o.payment_status === "claimed") {
        pay = `<div class="os-pay is-wait">⏳ Payment sent. We're confirming it. This usually takes a minute.</div>`;
      } else if (o.payment_status === "verified" || o.payment_status === "paid") {
        pay = `<div class="os-pay is-ok">✓ Paid ${rupee(o.total)} by UPI</div>`;
      }
    } else if (o.payment_status === "paid") {
      pay = `<div class="os-pay is-ok">✓ Paid ${rupee(o.total)} at the counter</div>`;
    } else if (!rejected) {
      pay = `<div class="os-pay"><p>Pay <b>${rupee(o.total)}</b> at the counter by UPI, card or cash.</p></div>`;
    }
    return `
      <p class="os-kicker">Order for ${esc(o.name)}</p>
      <h3 class="os-code" id="osTitle">${esc(o.code)}</h3>
      <p class="os-sub">Show this code at the counter · ${esc(pickup)}</p>
      ${rejected ? `<div class="os-pay is-bad">Sorry, we couldn't take this order${o.message ? `: ${esc(o.message)}` : "."} Please call us or order at the counter.</div>` : `
      <ol class="os-steps">${STEPS.map(([k, label], i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}"><span></span>${label}</li>`).join("")}</ol>
      ${o.message ? `<p class="os-msg${o.status === "collected" ? " is-done" : ""}">${esc(o.message)}</p>` : ""}`}
      ${pay}
      ${perkHTML(o)}
      <ul class="os-lines">${o.lines.map(l => `<li><span>${l.qty} × ${esc(l.name)}${l.size ? ` <small>${esc(l.size)}</small>` : ""}${[...l.opts, ...l.adds.map(a => "+ " + a)].length ? `<small>${esc([...l.opts, ...l.adds.map(a => "+ " + a)].join(" · "))}</small>` : ""}</span><b>${rupee(l.unit * l.qty)}</b></li>`).join("")}
        <li class="os-total"><span>Total</span><b>${rupee(o.total)}</b></li></ul>`;
  }

  async function loadOrder(id, token) {
    try {
      const d = await api(`/api/order-status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`, { timeout: 8000 });
      if (!d.order) throw new Error("Something went wrong on our side. Please try again.");
      return d;
    } catch (e) {
      if (e.status === 404) e.message = "We couldn't find that order. It may be from an earlier day.";
      throw e;
    }
  }

  async function openOrderSheet(id, token, first) {
    osCurrent = { id, token };
    const sheet = $("#orderSheet"), body = $("#osBody");
    sheet.hidden = false;
    lock();
    const draw = (data) => {
      body.innerHTML = osHTML(data);
      const paid = $("#osPaid", body);
      if (paid) paid.onclick = async () => {
        paid.disabled = true;
        try {
          const d = await api("/api/order-paid", { body: { id, t: token, ref: (($("#osRef", body) || {}).value || "").trim() } });
          draw({ ...d, upi: data.upi });
        } catch (e) { toast(e.message, 5000); paid.disabled = false; }
      };
      const o = data.order;
      if (["ready", "collected", "rejected"].includes(o.status)) markMyOrder(id, o.status !== "ready");
      if (["collected", "rejected"].includes(o.status)) clearInterval(osTimer);
    };
    if (first) draw(first); else body.innerHTML = `<p class="os-loading">Loading your order…</p>`;
    let shown = !!first;
    const tick = async () => {
      try { const d = await loadOrder(id, token); if (osCurrent && osCurrent.id === id) { draw(d); shown = true; } }
      catch (e) {
        if (!osCurrent || osCurrent.id !== id) return;
        if (!shown) body.innerHTML = `<p class="os-loading">${esc(e.message)}</p>`;   // otherwise keep the last good view; next poll retries
        if (e.status === 404) clearInterval(osTimer);
      }
    };
    if (!first) await tick();
    clearInterval(osTimer);
    osTimer = setInterval(tick, 8000);
    history.replaceState(null, "", `#order=${id}.${token}`);
  }
  function closeOrderSheet() {
    $("#orderSheet").hidden = true;
    clearInterval(osTimer);
    osCurrent = null;
    unlock();
    if (location.hash.startsWith("#order=")) history.replaceState(null, "", location.pathname);
  }
  $("#osClose").addEventListener("click", closeOrderSheet);
  $("#osBody").addEventListener("click", e => {
    if (!e.target.closest("[data-follow]")) return;
    try { localStorage.setItem(FOLLOW_KEY, Date.now()); } catch { /* ignore */ }
    const perk = $(".os-perk", e.currentTarget);
    if (perk && !$(".os-perk__ok", perk)) $(".os-perk__links", perk).insertAdjacentHTML("afterend", FOLLOW_OK);
  });
  $("#orderSheet").addEventListener("click", e => { if (e.target.id === "orderSheet") closeOrderSheet(); });

  // open from a shared/bookmarked link: #order=<id>.<token>
  const hashOrder = location.hash.match(/^#order=(\d{8}-W\d{3})\.([0-9a-f]{32})$/);
  if (hashOrder) { saveMyOrder({ id: hashOrder[1], code: hashOrder[1].split("-")[1] }, hashOrder[2]); openOrderSheet(hashOrder[1], hashOrder[2]); }
  renderMyPill();
  refreshOrdering();
  setInterval(refreshOrdering, 60000);
  cartbar.addEventListener("click", refreshOrdering);
  nameInput.addEventListener("input", () => nameInput.classList.remove("is-invalid"));

  renderCart(false);

  /* ------------------------------------------------------------------
     Full-screen pages: Build your own (#build) and the quiz (#quiz).
     They open like a separate page (own address, phone Back closes them)
     but share the cart with the home page.
     ------------------------------------------------------------------ */
  let openView = null;
  function showView(id) {
    if (openView === id) return;
    if (openView) hideView();
    const v = document.getElementById(id);
    v.hidden = false;
    $$(".reveal", v).forEach(el => el.classList.add("is-in"));
    v.scrollTop = 0;
    requestAnimationFrame(() => v.classList.add("is-open"));
    openView = id;
    lock();
    setTab(id);
    setTimeout(() => $(".view__back", v).focus({ preventScroll: true }), 50);
  }
  function hideView() {
    if (!openView) return;
    const v = document.getElementById(openView);
    v.classList.remove("is-open");
    setTimeout(() => { if (!v.classList.contains("is-open")) v.hidden = true; }, 320);
    openView = null;
    unlock();
    setTab(lastTab);
  }
  // close without leaving a #build entry behind (used when jumping to another part of the page)
  function leaveView() {
    if (!openView) return;
    history.replaceState(null, "", location.pathname + location.search);
    hideView();
  }
  const routeView = () => { const id = location.hash.slice(1); VIEWS.includes(id) ? showView(id) : hideView(); };
  window.addEventListener("popstate", routeView);
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    const id = a && a.getAttribute("href").slice(1);
    if (a && openView && a.closest(".view") && a.getAttribute("href")[0] === "#" && id && !VIEWS.includes(id)) {
      e.preventDefault();
      leaveView();
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }));
      return;
    }
    if (!a || !VIEWS.includes(id) || a.getAttribute("href")[0] !== "#") return;
    e.preventDefault();
    setSheet(false);
    if (openView !== id) history.pushState({ view: id }, "", "#" + id);
    showView(id);
  });
  $$(".view__back").forEach(b => b.addEventListener("click", () => {
    if (history.state && history.state.view) history.back();   // came from the home page: real Back
    else leaveView();                                           // opened from a shared link
  }));

  /* "What's on" picks: prices come from the menu, a tap opens the drink (or adds a combo) */
  const findItem = name => { for (const c of cats) { const i = c.items.findIndex(it => it.name === name); if (i >= 0) return { cat: c, idx: i, item: c.items[i] }; } return null; };
  const priceOf = (name, size) => { const f = findItem(name); if (!f) return null; return (f.item.sizes.find(s => s.name === size) || f.item.sizes[0]).price; };
  $$(".wo__pick[data-item]").forEach(b => {
    const main = priceOf(b.dataset.item, b.dataset.size), extra = b.dataset.combo ? priceOf(b.dataset.combo) : 0;
    if (main == null || extra == null) { b.closest("li").hidden = true; return; }   // not on the menu any more
    $("[data-price]", b).textContent = rupee(main + extra);
  });
  document.addEventListener("click", e => {
    const b = e.target.closest(".wo__pick[data-item]");
    if (!b) return;
    const f = findItem(b.dataset.item);
    if (!f) return;
    if (b.dataset.combo) {
      const g = findItem(b.dataset.combo);
      for (const [x, size] of [[f, b.dataset.size], [g, ""]]) {
        const s = x.item.sizes.find(z => z.name === size) || x.item.sizes[0];
        const line = { name: x.item.name, img: x.item.img, size: x.item.sizes.length > 1 ? s.name : "", opts: [], adds: [], unit: s.price, qty: 1 };
        line.key = [line.name, line.size].join("|");
        pushLine(line);
      }
      toast(`${f.item.name} + ${g.item.name} added`);
      return;
    }
    const kid = b.closest(".wo--sugar, .sugar");
    openItem(f.cat, f.idx, b, { size: b.dataset.size, opts: kid ? ["No Sugar"] : [] });
  });

  /* "New, fresh & on offer" carousel: swipe, arrows, dots, gentle autoplay */
  const woRow = $("#woRow"), woDots = $("#woDots"), woNav = $("#woNav");
  if (woRow) {
    const visible = () => $$(".wo", woRow).filter(c => !c.hidden);
    const stepW = () => { const c = visible(); return c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : woRow.clientWidth || 1; };
    const lastIdx = () => Math.max(0, Math.round((woRow.scrollWidth - woRow.clientWidth) / stepW()));
    const current = () => Math.min(lastIdx(), Math.round(woRow.scrollLeft / stepW()));
    const go = i => {
      const last = lastIdx();
      i = i > last ? 0 : i < 0 ? last : i;                       // wrap around at the ends
      woRow.scrollTo({ left: i * stepW(), behavior: reduceMotion ? "auto" : "smooth" });
    };
    const syncDots = () => { const i = current(); $$("button", woDots).forEach((b, k) => b.setAttribute("aria-current", String(k === i))); };
    const buildDots = () => {
      const n = lastIdx() + 1;
      woNav.hidden = n < 2;
      woDots.innerHTML = Array.from({ length: n }, (_, k) => `<button type="button" aria-label="Show ${k + 1} of ${n}"></button>`).join("");
      syncDots();
    };
    // autoplay loops forever; a swipe, tap or hover only pauses it for a moment
    let pausedUntil = 0, hovering = false, inView = false;
    const stopAuto = () => { pausedUntil = Date.now() + 8000; };
    woNav.addEventListener("click", e => {
      const arrow = e.target.closest("[data-dir]"), dot = e.target.closest(".wo-dots button");
      if (arrow) { stopAuto(); go(current() + Number(arrow.dataset.dir)); }
      else if (dot) { stopAuto(); go($$("button", woDots).indexOf(dot)); }
    });
    ["pointerdown", "touchstart", "wheel", "keydown"].forEach(ev => woRow.addEventListener(ev, stopAuto, { passive: true }));
    woRow.addEventListener("pointerenter", () => { hovering = true; });
    woRow.addEventListener("pointerleave", () => { hovering = false; });
    let scrollT;
    woRow.addEventListener("scroll", () => { clearTimeout(scrollT); scrollT = setTimeout(syncDots, 80); }, { passive: true });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .5 }).observe(woRow);
    if (!reduceMotion) setInterval(() => { if (Date.now() > pausedUntil && !hovering && inView && !document.hidden) go(current() + 1); }, 5000);
    // dated cards hide themselves (features.js): rebuild the dots when that happens, and on resize
    new MutationObserver(buildDots).observe(woRow, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("resize", () => { clearTimeout(scrollT); scrollT = setTimeout(buildDots, 150); });
    requestAnimationFrame(buildDots);
  }

  /* "Why" numbers: protein comes from the menu; numbers count up once when they scroll into view */
  const protein = cats.find(c => c.slug === "protein")?.items.map(i => i.protein).filter(Boolean) || [];
  if (protein.length) $$("[data-protein-min]").forEach(el => { el.textContent = el.dataset.count = Math.min(...protein); });
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.textContent || 0;
    if (reduceMotion || to < 2) return;
    const t0 = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$(".why [data-count]").forEach(el => countIO.observe(el));

  /* Bottom tab bar (phones + tablets) */
  const tabbar = $("#tabbar");
  let lastTab = "top";
  function setTab(id) { $$("[data-tab]", tabbar).forEach(t => (t.dataset.tab === id ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current"))); }
  tabbar.addEventListener("click", e => {
    const t = e.target.closest("[data-tab]");
    if (!t || VIEWS.includes(t.dataset.tab)) return;            // Build is a normal #build link
    e.preventDefault();
    if (t.dataset.tab === "cart") { openDrawer(); return; }
    leaveView();
    const target = t.dataset.tab === "top" ? document.body : document.getElementById(t.dataset.tab);
    requestAnimationFrame(() => target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }));
  });
  // highlight Home / Menu / Visit for the part of the page in view
  const tabIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      lastTab = e.target.classList.contains("hero") ? "top" : e.target.id;
      if (!openView) setTab(lastTab);
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  [$(".hero"), $("#menu"), $("#visit")].forEach(el => tabIO.observe(el));
  setTab("top");

  /* ------------------------------------------------------------------
     Toast + keyboard
     ------------------------------------------------------------------ */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg, ms = 2200) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), ms);
  }

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (modal.classList.contains("is-open")) closeModal();
    else if (drawer.classList.contains("is-open")) closeDrawer();
    else if (openView) $(`#${openView} .view__back`).click();
    else setSheet(false);
  });

  // Small API for the extra features in features.js (quiz, build-your-own)
  window.rejuve = {
    menu: MENU,
    toast: (msg, ms) => toast(msg, ms),
    lock, unlock,
    launch: LAUNCH,
    openingWhen: OPENING_WHEN,
    prelaunch,
    findItem,
    // add a ready-priced line to the pickup order (used by the RE:BLEND builder)
    addLine({ name, img, size = "", unit, qty = 1, opts = [] }) {
      const line = { name, img, size, opts, adds: [], unit, qty };
      line.key = [name, size, ...opts].join("|");
      pushLine(line);
    },
    openItemByName(name, fromEl, preset) {
      const f = this.findItem(name);
      if (f) openItem(f.cat, f.idx, fromEl || null, preset);
    },
  };

  onScroll();
  routeView();
})();
