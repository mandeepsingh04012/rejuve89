/* re.juve /89: live hours, install-the-app, Build-your-own juice, "Which juice are you?" quiz */
(() => {
  "use strict";

  const WA_NUMBER = "918816809822";
  const SITE_NAME = "re.juve /89";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const app = window.rejuve || { toast: () => {}, findItem: () => null, openItemByName: () => {} };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Share helper: native share sheet on phones, WhatsApp elsewhere
  const share = async (title, text) => {
    const url = location.href.split("#")[0];
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener");
  };

  /* ==================================================================
     1. Opening hours: live "Open now · closes 10 PM", always in India time
     ================================================================== */
  const OPEN_MIN = 8 * 60;   // 8:00 AM
  const CLOSE_MIN = 22 * 60; // 10:00 PM

  const istMinutes = () => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date());
    const h = +parts.find(p => p.type === "hour").value % 24;
    const m = +parts.find(p => p.type === "minute").value;
    return h * 60 + m;
  };

  const shopStatus = () => {
    const now = istMinutes();
    if (now >= OPEN_MIN && now < CLOSE_MIN) {
      const left = CLOSE_MIN - now;
      return left <= 60
        ? { state: "closing", text: `Closing soon · open till 10 PM`, short: `Closes in ${left} min` }
        : { state: "open", text: "Open now · closes 10 PM", short: "Open now · till 10 PM" };
    }
    if (now < OPEN_MIN) {
      const wait = OPEN_MIN - now;
      return wait <= 60
        ? { state: "closed", text: `Opening at 8 AM · in ${wait} min`, short: `Opens in ${wait} min` }
        : { state: "closed", text: "Closed now · opens 8 AM", short: "Closed · opens 8 AM" };
    }
    return { state: "closed", text: "Closed now · opens 8 AM tomorrow", short: "Closed · opens 8 AM" };
  };

  const renderStatus = () => {
    const st = shopStatus();
    $$("[data-status]").forEach(el => {
      el.classList.toggle("is-open", st.state === "open");
      el.classList.toggle("is-closing", st.state === "closing");
      el.classList.toggle("is-closed", st.state === "closed");
      const t = $("[data-status-text]", el);
      if (t) t.textContent = el.classList.contains("status-pill") ? st.short : st.text;
    });
  };
  renderStatus();
  setInterval(renderStatus, 30 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderStatus(); });

  /* ==================================================================
     2. Install the app (Add to Home Screen)
     ================================================================== */
  const isStandalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installEl = $("#install"), installBtn = $("#installBtn"), installHint = $("#installHint");
  const DISMISS_KEY = "rejuve89-install-dismissed";
  let deferredPrompt = null;

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener("appinstalled", () => { hideInstall(); app.toast("Installed! Find re.juve on your home screen 💚"); });

  const recentlyDismissed = () => {
    try { return Date.now() - (+localStorage.getItem(DISMISS_KEY) || 0) < 14 * 864e5; } catch { return false; }
  };
  const busy = () => $(".drawer.is-open, .modal.is-open, .view.is-open") || document.documentElement.classList.contains("menu-open");

  function showInstall(force) {
    if (isStandalone) { if (force) app.toast("You're already using the app 🙌"); return; }
    if (!force && (recentlyDismissed() || busy() || !(deferredPrompt || isIOS))) return;
    installHint.textContent = "Order faster, straight from your home screen";
    installBtn.textContent = "Install";
    installEl.classList.toggle("is-raised", $("#cartbar").classList.contains("is-visible"));
    installEl.hidden = false;
    requestAnimationFrame(() => installEl.classList.add("is-on"));
  }
  function hideInstall() {
    installEl.classList.remove("is-on");
    setTimeout(() => { installEl.hidden = true; }, 500);
  }

  installBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === "accepted") hideInstall();
      return;
    }
    if (installBtn.dataset.step === "hint") { hideInstall(); installBtn.dataset.step = ""; return; }
    installHint.innerHTML = isIOS
      ? 'Tap <b>Share</b> <svg viewBox="0 0 24 24" class="ic ic--inline"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg> then <b>Add to Home Screen</b>'
      : "Open your browser menu and choose <b>Install app</b> or <b>Add to Home Screen</b>";
    installBtn.textContent = "Got it";
    installBtn.dataset.step = "hint";
  });
  $("#installClose").addEventListener("click", () => {
    try { localStorage.setItem(DISMISS_KEY, Date.now()); } catch { /* ignore */ }
    hideInstall();
  });
  $("#footerInstall").addEventListener("click", e => { e.preventDefault(); showInstall(true); });
  setTimeout(() => showInstall(false), 18000);

  /* ==================================================================
     3. Build your own juice
     ================================================================== */
  // color = juice colour, w = how strongly it tints the blend, kcal = per 300ml, boost = small add-in
  const FRUITS = [
    { id: "orange", name: "Orange", emoji: "🍊", color: "#F7A01C", w: 1, kcal: 135 },
    { id: "mosambi", name: "Mosambi", emoji: "", color: "#E9CF55", w: 1, kcal: 120 },
    { id: "watermelon", name: "Watermelon", emoji: "🍉", color: "#F2546B", w: 1, kcal: 90 },
    { id: "pineapple", name: "Pineapple", emoji: "🍍", color: "#F6C944", w: 1, kcal: 150 },
    { id: "pomegranate", name: "Pomegranate", emoji: "", color: "#B3123A", w: 1.4, kcal: 165 },
    { id: "apple", name: "Apple", emoji: "🍏", color: "#D9D477", w: .9, kcal: 140 },
    { id: "beetroot", name: "Beetroot", emoji: "", color: "#8A0F38", w: 1.8, kcal: 110 },
    { id: "carrot", name: "Carrot", emoji: "🥕", color: "#F27A1A", w: 1.1, kcal: 115 },
    { id: "cucumber", name: "Cucumber", emoji: "🥒", color: "#B5D98F", w: .8, kcal: 45 },
    { id: "mint", name: "Mint", emoji: "🌿", color: "#4FAF55", w: .2, kcal: 5, boost: true },
    { id: "lemon", name: "Lemon", emoji: "🍋", color: "#F5E56B", w: .25, kcal: 20, boost: true },
    { id: "ginger", name: "Ginger", emoji: "", color: "#E0BC82", w: .2, kcal: 15, boost: true },
  ];
  // Hand-drawn icons for fruits that have no emoji (or one too new for older iPhones)
  const ICONS = {
    mosambi: `<svg viewBox="0 0 64 64" class="fruit__ic" aria-hidden="true">
      <path d="M32 16v-6" stroke="#6B4A2B" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 13c-2-6-8-9-15-8 1 6 7 10 15 8Z" fill="#4E9A3A"/>
      <circle cx="32" cy="37" r="22" fill="#CFD54A"/>
      <path d="M54 37a22 22 0 0 1-41 11 24 24 0 0 0 38-20 22 22 0 0 1 3 9Z" fill="#A9B93A"/>
      <ellipse cx="24" cy="28" rx="7" ry="4.5" fill="#fff" opacity=".45" transform="rotate(-35 24 28)"/>
      <g fill="#9DAE36" opacity=".55"><circle cx="38" cy="30" r="1.2"/><circle cx="44" cy="38" r="1.2"/><circle cx="30" cy="44" r="1.2"/><circle cx="40" cy="47" r="1.2"/><circle cx="22" cy="40" r="1.2"/></g>
    </svg>`,
    pomegranate: `<svg viewBox="0 0 64 64" class="fruit__ic" aria-hidden="true">
      <path d="M24 18l1-9 4 5 3-7 3 7 4-5 1 9Z" fill="#8E1530"/>
      <circle cx="32" cy="38" r="21" fill="#D4243F"/>
      <path d="M53 38a21 21 0 0 1-39 11 23 23 0 0 0 36-21 21 21 0 0 1 3 10Z" fill="#A8172F"/>
      <rect x="25" y="15" width="14" height="6" rx="3" fill="#B51C36"/>
      <ellipse cx="24" cy="30" rx="6.5" ry="4" fill="#fff" opacity=".4" transform="rotate(-35 24 30)"/>
    </svg>`,
    beetroot: `<svg viewBox="0 0 64 64" class="fruit__ic" aria-hidden="true">
      <path d="M30 21C27 15 22 10 20 6M34 21c3-6 8-11 12-13" stroke="#B0174A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M29 20C20 16 15 8 19 3c7 0 11 8 10 17Z" fill="#4E9A3A"/>
      <path d="M35 20c3-9 10-14 15-12 0 7-7 12-15 12Z" fill="#5DAE47"/>
      <path d="M32 19c14 0 20 12 14 24-4 8-10 11-14 15-4-4-10-7-14-15-6-12 0-24 14-24Z" fill="#8E1747"/>
      <path d="M46 43c-4 8-10 11-14 15 3-6 8-10 11-18 2-6 2-12 0-16 5 4 6 12 3 19Z" fill="#6E0F37"/>
      <path d="M32 57c1 2 2 4 4 5" stroke="#8E1747" stroke-width="2" stroke-linecap="round" fill="none"/>
      <ellipse cx="24" cy="31" rx="5" ry="3.5" fill="#fff" opacity=".35" transform="rotate(-40 24 31)"/>
    </svg>`,
    ginger: `<svg viewBox="0 0 64 64" class="fruit__ic" aria-hidden="true">
      <path d="M9 40c0-8 8-10 12-7 0-7 6-11 11-7 2-6 10-8 13-2 4-2 10 2 8 8 4 4 2 12-4 12-4 4-12 4-16 1-4 4-12 3-14-1-6 2-10 0-10-4Z" fill="#E4BC76"/>
      <path d="M53 44c-4 4-12 4-16 1-4 4-12 3-14-1-6 2-10 0-10-4 3 2 6 2 9 0 3 4 10 4 14 0 4 3 11 3 15-1 3 0 5-2 6-5 1 4-1 9-4 10Z" fill="#C9984E"/>
      <g stroke="#B48443" stroke-width="2" stroke-linecap="round" fill="none"><path d="M21 34c1 2 1 4 0 6"/><path d="M32 27c1 2 1 4 0 6"/><path d="M45 25c1 2 1 4 0 6"/></g>
      <ellipse cx="27" cy="33" rx="4" ry="2" fill="#fff" opacity=".4" transform="rotate(-20 27 33)"/>
    </svg>`,
  };
  const fruitIcon = f => f.emoji || ICONS[f.id] || `<i>${f.name[0]}</i>`;

  // exact POS name + price for every possible blend (assets/js/blends.js, from the POS database)
  const BLENDS = window.BLENDS || {};
  const ORDER_IDS = FRUITS.map(f => f.id);
  const blendEntry = () => BLENDS[picked.slice().sort((a, b) => ORDER_IDS.indexOf(a) - ORDER_IDS.indexOf(b)).join("+")];
  const blendPrice = e => e && (e.sizes.find(s => s.name === blendSize) || e.sizes[0]).price;

  const MAX = 3;
  const picked = [];
  let blendSize = "300ml";

  const fruitsEl = $("#fruits"), liquid = $("#liquid"), wave = $("#wave"), stream = $("#stream");
  const garnish = $("#garnish"), blendName = $("#blendName"), blendMeta = $("#blendMeta");
  const bubbles = $$(".bubble", liquid);

  fruitsEl.innerHTML = FRUITS.map(f => `
    <button class="fruit" aria-pressed="false" data-id="${f.id}" style="--c:${f.color}">
      <span class="fruit__sw">${fruitIcon(f)}</span>
      <span class="fruit__name">${f.name}</span>
      ${f.boost ? '<span class="fruit__tag">boost</span>' : ""}
    </button>`).join("");

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = list => {
    // weighted geometric mean per channel: mixes like pigments, so beetroot or pomegranate
    // tint the whole glass the way they do in real juice (instead of averaging to brown)
    const tw = list.reduce((s, f) => s + f.w, 0);
    const rgb = [0, 1, 2].map(i => Math.exp(list.reduce((s, f) => s + f.w * Math.log(Math.max(8, hex(f.color)[i])), 0) / tw));
    return rgb.map(v => Math.min(255, Math.round(v)));
  };
  const toHex = rgb => "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("");
  const hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  };

  const blendTitle = (list, rgb) => {
    const [h, , l] = hsl(rgb);
    const ids = list.map(f => f.id);
    let first;
    if (l < .33) first = "Velvet";
    else if (h < 15 || h >= 330) first = "Ruby";
    else if (h < 42) first = "Sunset";
    else if (h < 62) first = "Golden";
    else if (h < 170) first = "Garden";
    else first = "Berry";
    const second = ids.includes("ginger") ? "Kick" : ids.includes("mint") ? "Breeze" : ids.includes("lemon") ? "Zing"
      : ids.includes("beetroot") ? "Roots" : ids.includes("watermelon") ? "Splash" : list.length === 3 ? "Trio" : "Glow";
    return `${first} ${second}`;
  };

  const kcalFor = list => {
    const base = list.filter(f => !f.boost), boosts = list.filter(f => f.boost);
    const avg = base.length ? base.reduce((s, f) => s + f.kcal, 0) / base.length : 30;
    const ml = parseInt(blendSize, 10) / 300;
    return Math.round(((avg + boosts.reduce((s, f) => s + f.kcal, 0)) * ml) / 5) * 5;
  };

  function renderBlend(pourColor) {
    const list = picked.map(id => FRUITS.find(f => f.id === id));
    $("#blendCount").textContent = list.length;
    $$(".fruit", fruitsEl).forEach(b => {
      const on = picked.includes(b.dataset.id);
      b.setAttribute("aria-pressed", on);
      b.classList.toggle("is-dim", !on && picked.length >= MAX);
    });

    // liquid level: 0, 1, 2 or 3 fruits
    const levels = [0, .46, .68, .86];
    const fillH = 262 * levels[list.length];
    const topY = 304 - fillH;
    liquid.style.transform = `translateY(${list.length ? topY - 10 : 330}px)`;
    bubbles.forEach((b, i) => {
      b.setAttribute("cy", 304 - (topY - 10) - 8 - i * 3);
      b.style.setProperty("--rise", `${-Math.max(0, fillH - 24)}px`);
    });

    const ctas = [$("#blendSend"), $("#blendShare")];
    if (!list.length) {
      blendName.textContent = "An empty glass";
      blendMeta.textContent = "Tap a fruit to start pouring";
      garnish.innerHTML = "";
      ctas.forEach(b => (b.disabled = true));
      $("#blendSendLabel").textContent = "Add to my order";
      return;
    }
    const rgb = mix(list);
    wave.style.fill = toHex(rgb);
    blendName.textContent = blendTitle(list, rgb);
    const entry = blendEntry(), price = blendPrice(entry);
    blendMeta.innerHTML = `${list.map(f => esc(f.name)).join(" + ")} <span>· ~${kcalFor(list)} kcal · ${blendSize}${price ? ` · ₹${price}` : ""}</span>` +
      (entry && entry.existing ? `<br><span>That's our <b>${esc(entry.name)}</b> from the menu</span>` : "");
    $("#blendSendLabel").textContent = price ? `Add to my order · ₹${price}` : "Send my blend";
    garnish.innerHTML = list.map((f, i) =>
      `<span style="--i:${i};--c:${f.color}">${fruitIcon(f)}</span>`).join("");
    ctas.forEach(b => (b.disabled = false));

    if (pourColor && !reduceMotion) {
      stream.style.fill = pourColor;
      stream.classList.remove("is-pouring");
      void stream.getBoundingClientRect();
      stream.classList.add("is-pouring");
    }
  }

  fruitsEl.addEventListener("click", e => {
    const b = e.target.closest(".fruit");
    if (!b) return;
    const id = b.dataset.id, at = picked.indexOf(id);
    if (at >= 0) { picked.splice(at, 1); renderBlend(); return; }
    if (picked.length >= MAX) { app.toast("Three's the limit. Tap one to remove it"); return; }
    picked.push(id);
    renderBlend(FRUITS.find(f => f.id === id).color);
  });

  $("#blendSizes").addEventListener("click", e => {
    const b = e.target.closest("[data-size]");
    if (!b) return;
    blendSize = b.dataset.size;
    $$("[data-size]", $("#blendSizes")).forEach(x => x.setAttribute("aria-checked", x === b));
    renderBlend();
  });

  $("#blendReset").addEventListener("click", () => { picked.length = 0; renderBlend(); });
  $("#blendRandom").addEventListener("click", () => {
    picked.length = 0;
    const base = FRUITS.filter(f => !f.boost).sort(() => Math.random() - .5);
    const boost = FRUITS.filter(f => f.boost)[Math.floor(Math.random() * 3)];
    const pick = Math.random() < .6 ? [base[0], base[1], boost] : [base[0], base[1], base[2]];
    pick.forEach((f, i) => setTimeout(() => { picked.push(f.id); renderBlend(f.color); }, reduceMotion ? 0 : i * 450));
  });

  const blendText = () => {
    const list = picked.map(id => FRUITS.find(f => f.id === id));
    return { name: blendTitle(list, mix(list)), fruits: list.map(f => f.name).join(" + ") };
  };
  $("#blendSend").addEventListener("click", () => {
    const entry = blendEntry();
    if (entry && window.rejuve && window.rejuve.addLine) {
      // add under the exact POS name so the counter can find and bill it
      window.rejuve.addLine({ name: entry.name, img: entry.img, size: blendSize, unit: blendPrice(entry) });
      return;
    }
    const { name, fruits } = blendText();
    const msg = [
      `Hi ${SITE_NAME}! 🥤 I'd like a custom *RE:BLEND* for pickup:`,
      "",
      `*${name}*: ${fruits}`,
      `Size: ${blendSize}`,
      "",
      "Please confirm the price. I'll pay at the counter. Thanks!",
    ].join("\n");
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });
  $("#blendShare").addEventListener("click", () => {
    const { name, fruits } = blendText();
    share(`My RE:BLEND: ${name}`, `I just built "${name}" (${fruits}) at ${SITE_NAME} 🥤 Build yours:`);
  });

  renderBlend();

  /* ==================================================================
     4. "Which juice are you?" quiz
     ================================================================== */
  const QUESTIONS = [
    { q: "How are you feeling right now?", opts: [
      { e: "😴", t: "Sleepy", s: { "Orange Fresh": 2, "RE:GLOW": 2, "IMMUNITY": 1, "Chocolate Protein": 1 } },
      { e: "😤", t: "Stressed", s: { "RE:GREEN": 2, "RE:HYDRATE": 1, "Mixed Berry Smoothie": 2, "Chocolate Protein": 1 } },
      { e: "😎", t: "Chill", s: { "Watermelon Fresh": 2, "RE:HYDRATE": 2, "Mango Smoothie": 2 } },
      { e: "⚡", t: "Pumped", s: { "Peanut Butter Protein": 2, "Banana Protein": 2, "ABC": 1, "Pomegranate Fresh": 1 } },
    ] },
    { q: "What's your goal today?", opts: [
      { e: "💧", t: "Hydrate", s: { "Watermelon Fresh": 3, "RE:HYDRATE": 3, "RE:GREEN": 1 } },
      { e: "✨", t: "Glow & immunity", s: { "RE:GLOW": 3, "IMMUNITY": 3, "Orange Fresh": 2, "Pomegranate Fresh": 1 } },
      { e: "💪", t: "Build muscle", s: { "Peanut Butter Protein": 3, "Banana Protein": 3, "Chocolate Protein": 3 } },
      { e: "🍃", t: "Feel light", s: { "RE:GREEN": 3, "ABC": 3, "RE:HYDRATE": 1 } },
    ] },
    { q: "Pick a flavour mood", opts: [
      { e: "🍯", t: "Sweet", s: { "Mango Smoothie": 3, "Watermelon Fresh": 1, "Banana Protein": 2, "Chocolate Protein": 2 } },
      { e: "🍋", t: "Tangy", s: { "Orange Fresh": 3, "IMMUNITY": 2, "RE:GLOW": 2, "Pomegranate Fresh": 1 } },
      { e: "🌿", t: "Fresh & minty", s: { "RE:GREEN": 3, "RE:HYDRATE": 3, "RE:GLOW": 1 } },
      { e: "🥛", t: "Thick & creamy", s: { "Mixed Berry Smoothie": 3, "Mango Smoothie": 2, "Peanut Butter Protein": 2, "Chocolate Protein": 2, "Banana Protein": 1 } },
    ] },
    { q: "When are you sipping?", opts: [
      { e: "🌅", t: "Morning", s: { "Orange Fresh": 2, "ABC": 2, "IMMUNITY": 2, "RE:GREEN": 1 } },
      { e: "☀️", t: "Afternoon", s: { "RE:HYDRATE": 2, "Watermelon Fresh": 2, "RE:GLOW": 2 } },
      { e: "🏋️", t: "After a workout", s: { "Peanut Butter Protein": 3, "Banana Protein": 2, "Chocolate Protein": 2 } },
      { e: "🌙", t: "Evening", s: { "Mixed Berry Smoothie": 2, "Mango Smoothie": 2, "Pomegranate Fresh": 2 } },
    ] },
  ];
  const PERSONAS = {
    "Orange Fresh": ["The Morning Person", "Bright, reliable and up before the alarm. A classic that never misses."],
    "Watermelon Fresh": ["The Chill One", "Easy-going, sweet and the coolest person in any room."],
    "Pomegranate Fresh": ["The Deep Thinker", "Rich, bold and full of hidden depth. People take time to figure you out."],
    "ABC": ["The Fresh Start", "New week, new you. Grounded, consistent and doing it right."],
    "RE:GREEN": ["The Zen Master", "Calm, clear and unbothered. You keep it clean and cool."],
    "RE:GLOW": ["The Main Character", "You walk in and the room gets brighter. Radiant, social, iconic."],
    "RE:HYDRATE": ["The Cool Breeze", "Light, easy and always refreshing to be around."],
    "IMMUNITY": ["The Protector", "You look after everyone. This one looks after you."],
    "Mango Smoothie": ["The Sunshine", "Sweet, warm and everybody's favourite. Summer, all year round."],
    "Mixed Berry Smoothie": ["The Romantic", "A little dreamy, a lot of fun, and full of good surprises."],
    "Banana Protein": ["The Steady Climber", "Big goals, steady energy, and you never skip a day."],
    "Peanut Butter Protein": ["Beast Mode", "No excuses, extra gains. The gym knows your name."],
    "Chocolate Protein": ["The Treat-Yourself Athlete", "Works hard, rewards harder. Balance is your superpower."],
  };

  const quizCard = $("#quizCard");
  let step = 0;
  const answers = [];

  const swap = render => {
    if (reduceMotion) { render(); return; }
    quizCard.classList.add("is-leaving");
    setTimeout(() => { render(); quizCard.classList.remove("is-leaving"); }, 260);
  };

  function renderQuestion() {
    const Q = QUESTIONS[step];
    quizCard.innerHTML = `
      <div class="quiz__top">
        <button class="link-btn link-btn--light" data-back ${step ? "" : "hidden"}>← Back</button>
        <div class="quiz__dots">${QUESTIONS.map((_, i) => `<span class="${i < step ? "done" : i === step ? "now" : ""}"></span>`).join("")}</div>
        <span class="quiz__step">${step + 1} / ${QUESTIONS.length}</span>
      </div>
      <h3 class="quiz__q">${esc(Q.q)}</h3>
      <div class="quiz__opts">
        ${Q.opts.map((o, i) => `<button class="opt" data-opt="${i}" aria-pressed="${answers[step] === i}" style="--i:${i}">
          <span class="opt__e">${o.e}</span><span class="opt__t">${esc(o.t)}</span></button>`).join("")}
      </div>`;
  }

  function renderResult() {
    const scores = {};
    answers.forEach((a, i) => Object.entries(QUESTIONS[i].opts[a].s).forEach(([k, v]) => { scores[k] = (scores[k] || 0) + v; }));
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter(k => app.findItem(k));
    const name = ranked[0], runner = ranked[1];
    const found = app.findItem(name);
    if (!found) { quizCard.innerHTML = "<p>Hmm, try again!</p>"; return; }
    const { item } = found;
    const [title, line] = PERSONAS[name] || ["Fresh Soul", "You just get it."];
    const from = Math.min(...item.sizes.map(s => s.price));
    quizCard.innerHTML = `
      <div class="result">
        <div class="result__media"><img src="${item.img}" alt="${esc(item.name)}"><span class="result__burst">✨</span></div>
        <div class="result__body">
          <p class="result__kicker">You are…</p>
          <h3 class="result__title">${esc(title)}</h3>
          <p class="result__drink">Your drink: <b>${esc(item.name)}</b>${item.desc ? ` <span>· ${esc(item.desc)}</span>` : ""}</p>
          <p class="result__line">${esc(line)}</p>
          ${item.kcal ? `<p class="nutri nutri--lg"><span class="nutri__k">~${item.kcal} kcal</span>${item.protein >= 8 ? `<span class="nutri__p">${item.protein}g protein</span>` : ""}${(item.tags || []).map(t => `<span>${esc(t)}</span>`).join("")}</p>` : ""}
          <div class="result__actions">
            <button class="btn btn--cream" data-order>Order this · from ₹${from}</button>
            <button class="btn btn--outline-light" data-share>
              <svg viewBox="0 0 24 24" class="ic"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
              Share result
            </button>
          </div>
          <div class="result__foot">
            ${runner ? `<span>Runner-up: <button class="link-btn link-btn--light" data-runner>${esc(runner)}</button></span>` : ""}
            <button class="link-btn link-btn--light" data-retake>↺ Retake quiz</button>
          </div>
        </div>
      </div>`;
    quizCard.dataset.result = name;
    quizCard.dataset.title = title;
  }

  quizCard.addEventListener("click", e => {
    const opt = e.target.closest("[data-opt]");
    if (opt) {
      answers[step] = +opt.dataset.opt;
      $$(".opt", quizCard).forEach(o => o.setAttribute("aria-pressed", o === opt));
      setTimeout(() => {
        step++;
        swap(step < QUESTIONS.length ? renderQuestion : renderResult);
      }, reduceMotion ? 0 : 220);
      return;
    }
    if (e.target.closest("[data-back]")) { step = Math.max(0, step - 1); swap(renderQuestion); return; }
    if (e.target.closest("[data-retake]")) { step = 0; answers.length = 0; swap(renderQuestion); return; }
    if (e.target.closest("[data-order]")) { app.openItemByName(quizCard.dataset.result, e.target.closest("button")); return; }
    if (e.target.closest("[data-runner]")) { app.openItemByName(e.target.closest("[data-runner]").textContent, e.target.closest("button")); return; }
    if (e.target.closest("[data-share]")) {
      share(`I'm ${quizCard.dataset.title}!`,
        `I took the "Which juice are you?" quiz at ${SITE_NAME}. I'm ${quizCard.dataset.title}, and my drink is ${quizCard.dataset.result} 🥤 What are you?`);
    }
  });

  renderQuestion();
})();
