/**
 * ARK Showcase — Tizen TV series companion.
 *
 * CONTENT RULES (hard):
 * - All characters are fictional. Never invent real-sounding family names,
 *   real towns, or real businesses.
 * - Sample names must be obviously generic ("The Driver", "The Navigator").
 * - Never use the word "WanderBox".
 * - Never describe the truck as a "cage".
 * - All copy here is synthetic SAMPLE for Neo's later canon pass.
 */
(function () {
  "use strict";

  var API_BASE = "http://127.0.0.1:8090";
  var FETCH_MS = 4000;

  var SAMPLE_MANIFEST = {
    title: "The ARK Road",
    tagline: "SAMPLE TAGLINE — replace",
    episodes: [
      {
        id: "s01e01",
        title: "The Staircase",
        runtime: "15:00",
        synopsis:
          "SAMPLE SYNOPSIS — a family trades the 9-to-5 for the open road.",
        craft: "SAMPLE — restrained C recipe, 150 shots.",
        stills: [
          {
            src: "http://127.0.0.1:8090/ark/s01e01-still-001.jpg",
            caption: "SAMPLE — cold open"
          },
          {
            src: "http://127.0.0.1:8090/ark/s01e01-still-002.jpg",
            caption: "SAMPLE — act one"
          }
        ]
      }
    ],
    world: [
      { title: "SAMPLE LORE", text: "SAMPLE — the truck is home." },
      {
        title: "SAMPLE — The Driver",
        text: "SAMPLE — the one who holds the wheel through the long night watches."
      },
      {
        title: "SAMPLE — The Navigator",
        text: "SAMPLE — charts the next grade, the next camp, the next quiet mile."
      },
      {
        title: "SAMPLE — The 6x6",
        text: "SAMPLE — a matte-black expedition truck. Home on six wheels."
      },
      {
        title: "SAMPLE — Night watches",
        text: "SAMPLE — engines tick down. Someone stays up. The road keeps its own hours."
      },
      {
        title: "SAMPLE — Lived faith",
        text: "SAMPLE — not a sermon. A quiet practice: the next right mile."
      }
    ]
  };

  var COMING_SOON = [
    { id: "s01e02", title: "Coming soon" },
    { id: "s01e03", title: "Coming soon" },
    { id: "s01e04", title: "Coming soon" }
  ];

  var KEY = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    BACK: 10009,
    BACKSPACE: 8,
    ESC: 27
  };

  var state = {
    manifest: SAMPLE_MANIFEST,
    live: false,
    screen: "title",
    stack: ["title"],
    focused: null,
    episode: null,
    stillIndex: 0,
    toastTimer: null
  };

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function initEls() {
    els.app = $("app");
    els.stage = $("stage");
    els.tagline = $("title-tagline");
    els.badge = $("data-badge");
    els.episodeRow = $("episode-row");
    els.worldGrid = $("world-grid");
    els.detailCode = $("detail-code");
    els.detailTitle = $("detail-title");
    els.detailRuntime = $("detail-runtime");
    els.detailSynopsis = $("detail-synopsis");
    els.detailCraft = $("detail-craft");
    els.stillsStrip = $("stills-strip");
    els.stillImage = $("still-image");
    els.stillPlaceholder = $("still-placeholder");
    els.stillCaption = $("still-caption");
    els.stillIndex = $("still-index");
    els.toast = $("toast");
  }

  function fitStage() {
    var w = window.innerWidth || 1920;
    var h = window.innerHeight || 1080;
    var scale = Math.min(w / 1920, h / 1080);
    els.app.style.transform = "scale(" + scale + ")";
    var left = Math.floor((w - 1920 * scale) / 2);
    var top = Math.floor((h - 1080 * scale) / 2);
    els.app.style.marginLeft = left + "px";
    els.app.style.marginTop = top + "px";
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      els.toast.hidden = true;
    }, 1600);
  }

  function formatCode(id) {
    if (!id) return "";
    return String(id).toUpperCase();
  }

  function episodeMeta(ep) {
    var parts = [];
    if (ep.runtime) parts.push(ep.runtime);
    var shots = "";
    if (ep.craft && /(\d+)\s+shots/i.test(ep.craft)) {
      shots = RegExp.$1 + " shots";
    } else if (ep.stills && ep.stills.length) {
      shots = ep.stills.length + " stills";
    }
    if (shots) parts.push(shots);
    return parts.join("  ·  ");
  }

  function screenEl(id) {
    return document.querySelector('[data-screen="' + id + '"]');
  }

  function focusables() {
    var root = screenEl(state.screen);
    if (!root) return [];
    return Array.prototype.slice.call(
      root.querySelectorAll("[data-focusable]")
    );
  }

  function setFocus(el) {
    if (!el) return;
    var prev = state.focused;
    if (prev && prev.classList) prev.classList.remove("is-focused");
    state.focused = el;
    el.classList.add("is-focused");
    if (typeof el.focus === "function") {
      try {
        el.focus({ preventScroll: true });
      } catch (e) {
        el.focus();
      }
    }
    if (typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (err) {
        /* ignore */
      }
    }
  }

  function focusFirst() {
    var items = focusables();
    if (items.length) setFocus(items[0]);
  }

  function focusMatching(selector) {
    var root = screenEl(state.screen);
    var el = root ? root.querySelector(selector) : null;
    setFocus(el || focusables()[0]);
  }

  function nearestInDirection(dir) {
    var items = focusables();
    var current = state.focused;
    if (!current || items.indexOf(current) === -1) return items[0] || null;
    var c = current.getBoundingClientRect();
    var cx = c.left + c.width / 2;
    var cy = c.top + c.height / 2;
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (el === current) continue;
      var r = el.getBoundingClientRect();
      var ex = r.left + r.width / 2;
      var ey = r.top + r.height / 2;
      var dx = ex - cx;
      var dy = ey - cy;
      var along;
      var off;

      if (dir === "left") {
        if (dx >= -4) continue;
        along = Math.abs(dx);
        off = Math.abs(dy);
      } else if (dir === "right") {
        if (dx <= 4) continue;
        along = Math.abs(dx);
        off = Math.abs(dy);
      } else if (dir === "up") {
        if (dy >= -4) continue;
        along = Math.abs(dy);
        off = Math.abs(dx);
      } else {
        if (dy <= 4) continue;
        along = Math.abs(dy);
        off = Math.abs(dx);
      }

      var score = along + off * 2.4;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function showScreen(id, opts) {
    opts = opts || {};
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      var s = screens[i];
      var on = s.getAttribute("data-screen") === id;
      s.classList.toggle("is-active", on);
      if (on) s.removeAttribute("hidden");
      else s.setAttribute("hidden", "");
    }
    state.screen = id;
    if (opts.replace) {
      state.stack[state.stack.length - 1] = id;
    } else if (opts.push !== false) {
      if (state.stack[state.stack.length - 1] !== id) state.stack.push(id);
    }
  }

  function go(id, opts) {
    opts = opts || {};
    var tabs = { episodes: true, world: true };
    if (tabs[id] && tabs[state.screen]) opts.replace = true;
    showScreen(id, opts);
    if (opts.focus) focusMatching(opts.focus);
    else focusFirst();
  }

  function bindPlaceholder(img, host) {
    img.onerror = function () {
      img.style.display = "none";
      if (host.querySelector(".thumb-placeholder")) return;
      var ph = document.createElement("div");
      ph.className = "thumb-placeholder";
      ph.innerHTML =
        '<span class="ph-kicker">SAMPLE STILL</span>' +
        '<span class="ph-title">Image unavailable</span>' +
        '<span class="ph-sub">placeholder card</span>';
      host.appendChild(ph);
    };
  }

  function renderEpisodes() {
    var row = els.episodeRow;
    row.innerHTML = "";
    var liveEps = state.manifest.episodes || [];
    var seen = {};
    var i;

    for (i = 0; i < liveEps.length; i++) {
      (function (ep) {
        seen[String(ep.id).toLowerCase()] = true;
        var card = document.createElement("button");
        card.type = "button";
        card.className = "ep-card";
        card.setAttribute("data-focusable", "");
        card.setAttribute("tabindex", "-1");
        card.setAttribute("data-action", "open-episode");
        card.setAttribute("data-episode-id", ep.id);
        var blurb = ep.synopsis || "";
        if (blurb.length > 140) blurb = blurb.slice(0, 137) + "…";
        card.innerHTML =
          '<p class="ep-code">' +
          escapeHtml(formatCode(ep.id)) +
          "</p>" +
          '<h3 class="ep-title">' +
          escapeHtml(ep.title || "Untitled") +
          "</h3>" +
          '<p class="ep-meta">SAMPLE · ' +
          escapeHtml(episodeMeta(ep) || "runtime TBA") +
          "</p>" +
          '<p class="ep-blurb">' +
          escapeHtml(blurb) +
          "</p>" +
          '<p class="ep-footer">Open detail</p>';
        row.appendChild(card);
      })(liveEps[i]);
    }

    for (i = 0; i < COMING_SOON.length; i++) {
      var soon = COMING_SOON[i];
      if (seen[soon.id]) continue;
      var card = document.createElement("button");
      card.type = "button";
      card.className = "ep-card is-soon";
      card.setAttribute("data-focusable", "");
      card.setAttribute("tabindex", "-1");
      card.setAttribute("data-action", "coming-soon");
      card.innerHTML =
        '<p class="ep-code">' +
        escapeHtml(formatCode(soon.id)) +
        "</p>" +
        '<h3 class="ep-title">Coming soon</h3>' +
        '<p class="ep-meta">SAMPLE · placeholder slot</p>' +
        '<p class="ep-blurb">SAMPLE — this episode has not been cut in yet.</p>' +
        '<p class="ep-footer">Coming soon</p>';
      row.appendChild(card);
    }
  }

  function renderWorld() {
    var grid = els.worldGrid;
    grid.innerHTML = "";
    var cards = state.manifest.world || [];
    if (!cards.length) {
      cards = SAMPLE_MANIFEST.world;
    }
    for (var i = 0; i < cards.length; i++) {
      var item = cards[i];
      var card = document.createElement("article");
      card.className = "lore-card";
      card.setAttribute("data-focusable", "");
      card.setAttribute("tabindex", "-1");
      card.setAttribute("data-action", "noop");
      card.innerHTML =
        "<h3>" +
        escapeHtml(item.title || "SAMPLE LORE") +
        "</h3>" +
        "<p>" +
        escapeHtml(item.text || "") +
        "</p>" +
        '<p class="lore-badge">SAMPLE placeholder</p>';
      grid.appendChild(card);
    }
  }

  function findEpisode(id) {
    var list = state.manifest.episodes || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function renderDetail(ep) {
    state.episode = ep;
    els.detailCode.textContent = formatCode(ep.id);
    els.detailTitle.textContent = ep.title || "";
    els.detailRuntime.textContent = "SAMPLE · " + (episodeMeta(ep) || ep.runtime || "");
    els.detailSynopsis.textContent = ep.synopsis || "SAMPLE SYNOPSIS — placeholder.";
    els.detailCraft.textContent = ep.craft || "SAMPLE — craft note pending.";

    var strip = els.stillsStrip;
    strip.innerHTML = "";
    var stills = ep.stills && ep.stills.length ? ep.stills : [];
    if (!stills.length) {
      stills = [
        { src: "", caption: "SAMPLE — no stills in manifest" },
        { src: "", caption: "SAMPLE — placeholder frame" }
      ];
    }
    for (var i = 0; i < stills.length; i++) {
      (function (still, index) {
        var thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "still-thumb";
        thumb.setAttribute("data-focusable", "");
        thumb.setAttribute("tabindex", "-1");
        thumb.setAttribute("data-action", "open-still");
        thumb.setAttribute("data-still-index", String(index));
        var img = document.createElement("img");
        img.alt = still.caption || "Episode still";
        if (still.src) {
          img.src = still.src;
          bindPlaceholder(img, thumb);
        } else {
          img.style.display = "none";
          var ph = document.createElement("div");
          ph.className = "thumb-placeholder";
          ph.innerHTML =
            '<span class="ph-kicker">SAMPLE STILL</span>' +
            '<span class="ph-title">Image unavailable</span>' +
            '<span class="ph-sub">placeholder card</span>';
          thumb.appendChild(ph);
        }
        thumb.appendChild(img);
        var cap = document.createElement("span");
        cap.className = "thumb-cap";
        cap.textContent = still.caption || "SAMPLE still";
        thumb.appendChild(cap);
        strip.appendChild(thumb);
      })(stills[i], i);
    }
  }

  function currentStills() {
    if (state.episode && state.episode.stills && state.episode.stills.length) {
      return state.episode.stills;
    }
    return [
      { src: "", caption: "SAMPLE — no stills in manifest" }
    ];
  }

  function paintStill() {
    var stills = currentStills();
    if (state.stillIndex < 0) state.stillIndex = stills.length - 1;
    if (state.stillIndex >= stills.length) state.stillIndex = 0;
    var still = stills[state.stillIndex];
    els.stillIndex.textContent =
      stills.length ? state.stillIndex + 1 + " / " + stills.length : "0 / 0";
    els.stillCaption.textContent = still.caption || "SAMPLE still";
    els.stillPlaceholder.classList.add("is-hidden");
    els.stillImage.style.display = "block";
    els.stillImage.alt = still.caption || "Episode still";
    els.stillImage.onerror = function () {
      els.stillImage.style.display = "none";
      els.stillPlaceholder.classList.remove("is-hidden");
    };
    if (still.src) {
      els.stillImage.src = still.src;
    } else {
      els.stillImage.removeAttribute("src");
      els.stillImage.style.display = "none";
      els.stillPlaceholder.classList.remove("is-hidden");
    }
  }

  function applyManifest(data, live) {
    state.manifest = data || SAMPLE_MANIFEST;
    state.live = !!live;
    var tag = state.manifest.tagline || "SAMPLE TAGLINE — replace";
    if (/^SAMPLE TAGLINE$/i.test(tag.trim())) tag = "SAMPLE TAGLINE — replace";
    els.tagline.textContent = tag;
    els.badge.textContent = live ? "LIVE API" : "SAMPLE FALLBACK";
    renderEpisodes();
    renderWorld();
    if (state.screen === "episodes") focusMatching(".ep-card");
    else if (state.screen === "world") focusMatching(".lore-card");
    else if (state.screen === "title") focusMatching("#title-enter");
    else if (state.screen === "detail" && state.episode) {
      var keepId = state.episode.id;
      var fresh = findEpisode(keepId);
      if (fresh) renderDetail(fresh);
      focusMatching('[data-action="open-still"]');
    }
  }

  function fetchManifest() {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, FETCH_MS);

    var opts = { method: "GET" };
    if (ctrl) opts.signal = ctrl.signal;

    return fetch(API_BASE + "/api/ark", opts)
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data !== "object") throw new Error("bad payload");
        applyManifest(normalizeManifest(data), true);
      })
      .catch(function () {
        clearTimeout(timer);
        applyManifest(SAMPLE_MANIFEST, false);
      });
  }

  function normalizeManifest(data) {
    var out = {
      title: data.title || SAMPLE_MANIFEST.title,
      tagline: data.tagline || SAMPLE_MANIFEST.tagline,
      episodes: Array.isArray(data.episodes) ? data.episodes : SAMPLE_MANIFEST.episodes,
      world: Array.isArray(data.world) && data.world.length
        ? data.world
        : SAMPLE_MANIFEST.world
    };
    return out;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openEpisode(id) {
    var ep = findEpisode(id);
    if (!ep) return;
    renderDetail(ep);
    go("detail", { focus: '[data-action="open-still"]' });
  }

  function openStill(index) {
    state.stillIndex = parseInt(index, 10) || 0;
    paintStill();
    go("stills");
  }

  function activate(el) {
    if (!el) return;
    var action = el.getAttribute("data-action");
    if (action === "open-episodes" || action === "goto-episodes") {
      go("episodes", { focus: ".ep-card" });
      return;
    }
    if (action === "goto-world") {
      go("world", { focus: ".lore-card" });
      return;
    }
    if (action === "open-episode") {
      openEpisode(el.getAttribute("data-episode-id"));
      return;
    }
    if (action === "coming-soon") {
      showToast("SAMPLE — coming soon");
      return;
    }
    if (action === "open-still") {
      openStill(el.getAttribute("data-still-index"));
      return;
    }
    if (action === "noop") return;
  }

  function exitApp() {
    try {
      if (window.tizen && tizen.application && tizen.application.getCurrentApplication) {
        tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (e) {
      /* desktop preview */
    }
    showToast("Exit (TV only)");
  }

  function goBack() {
    if (state.screen === "title") {
      exitApp();
      return;
    }
    if (state.stack.length > 1) {
      state.stack.pop();
      var prev = state.stack[state.stack.length - 1] || "title";
      showScreen(prev, { push: false });
      if (prev === "detail" && state.episode) renderDetail(state.episode);
      if (prev === "episodes") focusMatching(".ep-card");
      else if (prev === "world") focusMatching(".lore-card");
      else if (prev === "detail") focusMatching('[data-action="open-still"]');
      else focusFirst();
      return;
    }
    go("title", { replace: true });
  }

  function onKeyDown(ev) {
    var code = ev.keyCode || ev.which;
    var key = ev.key;

    var isArrow =
      code === KEY.LEFT ||
      code === KEY.RIGHT ||
      code === KEY.UP ||
      code === KEY.DOWN;
    var isEnter = code === KEY.ENTER || key === "Enter";
    var isBack =
      code === KEY.BACK ||
      code === KEY.ESC ||
      code === KEY.BACKSPACE ||
      key === "Escape" ||
      key === "Backspace";

    if (isArrow || isEnter || isBack) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    if (isBack) {
      goBack();
      return;
    }

    if (state.screen === "stills") {
      if (code === KEY.LEFT) {
        state.stillIndex -= 1;
        paintStill();
      } else if (code === KEY.RIGHT) {
        state.stillIndex += 1;
        paintStill();
      } else if (isEnter) {
        state.stillIndex += 1;
        paintStill();
      }
      return;
    }

    if (isEnter) {
      activate(state.focused);
      return;
    }

    var dir = null;
    if (code === KEY.LEFT) dir = "left";
    if (code === KEY.RIGHT) dir = "right";
    if (code === KEY.UP) dir = "up";
    if (code === KEY.DOWN) dir = "down";
    if (!dir) return;

    var next = nearestInDirection(dir);
    if (next) setFocus(next);
  }

  function onHwKey(ev) {
    if (ev.keyName === "back" || ev.keyName === "Return") {
      ev.preventDefault();
      goBack();
    }
  }

  function onClick(ev) {
    var t = ev.target.closest("[data-focusable]");
    if (!t) return;
    setFocus(t);
    activate(t);
  }

  function boot() {
    initEls();
    fitStage();
    window.addEventListener("resize", fitStage);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("tizenhwkey", onHwKey);
    document.addEventListener("click", onClick);
    applyManifest(SAMPLE_MANIFEST, false);
    focusMatching("#title-enter");
    fetchManifest();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
