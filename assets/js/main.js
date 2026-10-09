/* re.juve /89 website */
(() => {
  "use strict";

  const WA_NUMBER = "918816809822";
  const MENU = window.MENU || { categories: [], options: [], addons: [] };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rupee = n => "₹" + n.toLocaleString("en-IN");
  // online-ordering channel from /api/ordering: web | whatsapp | paused | closed (see "Online ordering" below)
  let ordering = { channel: "whatsapp", accepting: true };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ICON_PLUS = '<svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" class="ic"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_ARROW = '<svg viewBox="0 0 24 24" class="ic"><path d="M7 17L17 7M9 7h8v8"/></svg>';

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
  const sections = ["menu", "build", "quiz", "story", "visit"].map(id => document.getElementById(id));
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
    if (!href.startsWith("#")) return;
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
    const msg = `${LINES[lineIdx]}\n\n🥤 Let's grab a juice at re.juve /89, Orris Market 89, Gurugram. Sip. Reset. Repeat.`;
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
  const allSizes = [...new Set(cats.filter(isDrinkCat).flatMap(c => c.items.flatMap(i => i.sizes.map(s => s.name))))];
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

  // Category tiles
  $("#catTiles").innerHTML = cats.map((c, i) => {
    const hero = c.hero || c.items[0].img;
    return `<a class="cat reveal" style="--d:${i * 0.07}s" href="#menu" data-cat="${c.slug}">
      <img src="${hero}" alt="" loading="lazy" width="720" height="720">
      <span class="cat__arrow">${ICON_ARROW}</span>
      <div class="cat__body">
        <span class="cat__count"><span class="cat__n">${c.items.length} items · </span>from ${rupee(fromPrice(c))}</span>
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.blurb)}</p>
      </div>
    </a>`;
  }).join("");
  observeReveals($("#catTiles"));
  $$("#catTiles .cat").forEach(a => a.addEventListener("click", () => selectCat(a.dataset.cat, false)));

  // Tabs
  const tabs = $("#tabs");
  tabs.innerHTML = cats.map(c =>
    `<button class="tab" role="tab" id="tab-${c.slug}" aria-selected="${c.slug === activeCat}" data-cat="${c.slug}">${esc(c.name)}</button>`
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
  const sizeFor = item => item.sizes.find(s => s.name === activeSize) || item.sizes[0];

  // Nutrition is stored per 300ml; scale it to the chosen glass size.
  const sizeScale = sizeName => { const ml = parseInt(sizeName, 10); return ml ? ml / 300 : 1; };
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

  function renderGrid() {
    const cat = cats.find(c => c.slug === activeCat);
    const drinks = isDrinkCat(cat);
    sizesEl.classList.toggle("is-hidden", !drinks);
    blurb.textContent = cat.blurb;
    grid.setAttribute("aria-labelledby", `tab-${cat.slug}`);
    grid.innerHTML = cat.items.map((it, i) => {
      const s = sizeFor(it);
      return `<article class="card" style="--i:${i}" data-idx="${i}">
        <div class="card__media" data-open>
          <img src="${it.img}" alt="${esc(it.name)}" loading="lazy" decoding="async" width="720" height="720">
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
    const cat = cats.find(c => c.slug === activeCat);
    $$(".card", grid).forEach(card => {
      const it = cat.items[+card.dataset.idx];
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
    openItem(cats.find(c => c.slug === activeCat), +card.dataset.idx, t.classList.contains("add") ? t : null);
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

  function openItem(cat, idx, fromBtn) {
    const item = cat.items[idx];
    mState = { cat, item, size: sizeFor(item).name, opts: new Set(), adds: new Set(), qty: 1 };
    lastFocus = fromBtn || document.activeElement;
    $("#mImg").src = item.img;
    $("#mImg").alt = item.name;
    $("#mTitle").textContent = item.name;
    $("#mDesc").textContent = describe(item, cat);

    $("#mSizesWrap").hidden = item.sizes.length < 2;
    $("#mSizes").innerHTML = item.sizes.map(s =>
      `<button class="pill" role="radio" aria-checked="${s.name === mState.size}" data-size="${esc(s.name)}">${esc(s.name)} <small>${rupee(s.price)}</small></button>`).join("");

    const opts = optionsFor(cat, item);
    $("#mOptsWrap").hidden = !opts.length;
    $("#mOpts").innerHTML = opts.map(o => `<button class="pill" aria-pressed="false" data-opt="${esc(o.name)}">${esc(o.name)}</button>`).join("");

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
  $("#mPlus").addEventListener("click", () => { mState.qty = Math.min(20, mState.qty + 1); $("#mQty").textContent = mState.qty; updateModalPrice(); });
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
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
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
    const existing = cart.find(l => l.key === line.key);
    existing ? (existing.qty += line.qty) : cart.push(line);
    saveCart();
    renderCart(true);
    toast(`${st.qty} × ${st.item.name} added`);
  }

  const cartbar = $("#cartbar"), drawer = $("#drawer"), scrim = $("#scrim");
  const drawerBody = $(".drawer__body", drawer);
  const total = () => cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const count = () => cart.reduce((s, l) => s + l.qty, 0);

  function renderCart(bump) {
    const n = count(), t = total();
    $("#cartCount").textContent = n;
    $("#cartTotal").textContent = rupee(t);
    $("#drawerTotal").textContent = rupee(t);
    cartbar.classList.toggle("is-visible", n > 0 && !drawer.classList.contains("is-open"));
    if (bump && !reduceMotion) { cartbar.classList.remove("is-bump"); void cartbar.offsetWidth; cartbar.classList.add("is-bump"); }
    drawerBody.classList.toggle("has-items", n > 0);
    $("#sendOrder").disabled = n === 0 || ordering.accepting === false;
    updateSendLabel();
    $("#cartList").innerHTML = cart.map((l, i) => `<li>
      <img src="${l.img}" alt="" loading="lazy">
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
    if (inc) cart[+inc.dataset.inc].qty++;
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

  async function refreshOrdering() {
    try {
      const ctl = new AbortController();
      setTimeout(() => ctl.abort(), 5000);
      const r = await fetch("/api/ordering", { signal: ctl.signal, cache: "no-store" });
      if (r.ok) ordering = await r.json();
    } catch { /* offline, or opened from disk: keep WhatsApp ordering */ }
    applyOrdering();
  }

  function applyOrdering() {
    const web = ordering.channel === "web", open = ordering.accepting !== false;
    $$(".web-only").forEach(el => (el.hidden = !web));
    $("#payUpiOpt").hidden = !(web && ordering.upi);
    if (!(web && ordering.upi)) { const c = $("input[name=pay][value=counter]"); if (c) c.checked = true; }
    const btn = $("#sendOrder"), notice = $("#orderNotice");
    btn.classList.toggle("btn--wa", !web && open);
    btn.classList.toggle("btn--primary", web || !open);
    $("#sendIcon").innerHTML = web ? '<path d="M5 12l5 5L20 7"/>' : '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/>';
    notice.hidden = open && !ordering.fallback;
    notice.textContent = !open ? ordering.message : ordering.fallback ? "Online orders are going through WhatsApp right now." : "";
    updateSendLabel();
    $("#drawerFine").textContent = web
      ? "Your order goes straight to our counter. You'll get a live status page."
      : "We'll confirm on WhatsApp. Pay with UPI, card or cash when you collect.";
    $("#sendOrder").disabled = count() === 0 || !open;
  }

  function updateSendLabel() {
    const web = ordering.channel === "web", open = ordering.accepting !== false;
    const upi = web && payChoice() === "upi";
    $("#sendLabel").textContent = !open ? (ordering.channel === "paused" ? "Ordering paused" : "Closed for online orders")
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
      const r = await fetch("/api/order", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, phone, pickup_in: Number($("#pickWhen").value), note: $("#pickNote").value.trim(),
          payment: payChoice(), website: $("#hpField").value,
          items: cart.map(l => ({ name: l.name, size: l.size, opts: l.opts, adds: l.adds, qty: l.qty })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 409 && data.state) { ordering = data.state; applyOrdering(); throw new Error(data.error); }
      if (!r.ok) throw new Error(data.error || "Couldn't place the order. Please try again.");
      saveMyOrder(data.order, data.token);
      cart = []; saveCart(); $("#pickNote").value = ""; closeDrawer(); renderCart(false);
      openOrderSheet(data.order.id, data.token, data);
      if (data.upi) setTimeout(() => tryUpi(data.upi.link), 400);
    } catch (e) {
      toast(e.message);
    } finally {
      placing = false;
      applyOrdering();
    }
  }

  $("#sendOrder").addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.classList.add("is-invalid");
      nameInput.focus();
      toast("Add your name so we can call it out");
      return;
    }
    nameInput.classList.remove("is-invalid");
    try { localStorage.setItem("rejuve89-name", name); } catch { /* ignore */ }
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

  const STEPS = [["received", "Received"], ["accepted", "Accepted"], ["preparing", "Being made"], ["ready", "Ready for pickup"]];
  let osTimer = null, osCurrent = null;

  function osHTML(data) {
    const o = data.order, upi = data.upi;
    const rejected = o.status === "rejected";
    const finished = o.status === "ready" || o.status === "collected";
    const at = finished ? STEPS.length : Math.max(0, STEPS.findIndex(([k]) => k === o.status));
    const pickup = o.pickup === "ASAP" ? "As soon as you arrive" : `Around ${o.pickup.replace(/^(\d+):(\d+)$/, (m, h, mm) => `${((+h + 11) % 12) + 1}:${mm} ${+h < 12 ? "AM" : "PM"}`)}`;
    let pay = "";
    if (o.payment === "upi") {
      if (o.payment_status === "pending") {
        pay = `<div class="os-pay">
          <p><b>Pay ${rupee(o.total)} by UPI</b> to start your order.</p>
          ${isMobile && upi ? `<a class="btn btn--primary btn--block" href="${esc(upi.link)}">Open UPI app · ${rupee(o.total)}</a>` : ""}
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
      ${o.message ? `<p class="os-msg">${esc(o.message)}</p>` : ""}`}
      ${pay}
      <ul class="os-lines">${o.lines.map(l => `<li><span>${l.qty} × ${esc(l.name)}${l.size ? ` <small>${esc(l.size)}</small>` : ""}${[...l.opts, ...l.adds.map(a => "+ " + a)].length ? `<small>${esc([...l.opts, ...l.adds.map(a => "+ " + a)].join(" · "))}</small>` : ""}</span><b>${rupee(l.unit * l.qty)}</b></li>`).join("")}
        <li class="os-total"><span>Total</span><b>${rupee(o.total)}</b></li></ul>`;
  }

  async function loadOrder(id, token) {
    const r = await fetch(`/api/order-status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!r.ok) throw new Error("We couldn't find that order.");
    return r.json();
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
          const r = await fetch("/api/order-paid", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, t: token, ref: ($("#osRef", body) || {}).value || "" }) });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Try again");
          draw(await r.json().then(d => ({ ...d, upi: data.upi })));
        } catch (e) { toast(e.message); paid.disabled = false; }
      };
      const o = data.order;
      if (["ready", "collected", "rejected"].includes(o.status)) markMyOrder(id, o.status !== "ready");
    };
    if (first) draw(first); else body.innerHTML = `<p class="os-loading">Loading your order…</p>`;
    const tick = async () => {
      try { const d = await loadOrder(id, token); if (osCurrent && osCurrent.id === id) draw(d); }
      catch (e) { if (!first) body.innerHTML = `<p class="os-loading">${esc(e.message)}</p>`; }
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
     Toast + keyboard
     ------------------------------------------------------------------ */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (modal.classList.contains("is-open")) closeModal();
    else if (drawer.classList.contains("is-open")) closeDrawer();
    else setSheet(false);
  });

  // Small API for the extra features in features.js (quiz, build-your-own)
  window.rejuve = {
    menu: MENU,
    toast: msg => toast(msg),
    lock, unlock,
    findItem: name => {
      for (const c of cats) { const i = c.items.findIndex(it => it.name === name); if (i >= 0) return { cat: c, idx: i, item: c.items[i] }; }
      return null;
    },
    // add a ready-priced line to the pickup order (used by the RE:BLEND builder)
    addLine({ name, img, size = "", unit, qty = 1, opts = [] }) {
      const line = { name, img, size, opts, adds: [], unit, qty };
      line.key = [name, size, ...opts].join("|");
      const existing = cart.find(l => l.key === line.key);
      existing ? (existing.qty += qty) : cart.push(line);
      saveCart();
      renderCart(true);
      toast(`${qty} × ${name} added`);
    },
    openItemByName(name, fromEl) {
      const f = this.findItem(name);
      if (f) openItem(f.cat, f.idx, fromEl || null);
    },
  };

  onScroll();
})();
