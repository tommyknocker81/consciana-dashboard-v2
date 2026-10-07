// ============================================================
// Conscia Landing Zone — dashboard prototype (v2, multi-client)
// Vanilla JS. Every client-dependent part of the UI is rendered from window.CLIENTS (clients.js);
// behaviour (navigation, toasts, tooltips, tabs, tables) is wired with event delegation so it
// keeps working after a client switch re-renders the page.
// ============================================================

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CLIENTS = window.CLIENTS;
  const TODAY = new Date(2026, 4, 26);
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  let client = null; // current client object
  let clientId = null;
  const unlockedAlarms = new Set();
  let currentPage = "overview";

  /* ================= Dates & lifecycle helpers ================= */
  function parseDate(s) {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  function monthsBetween(a, b) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
  }
  function fmtAge(months) {
    const y = Math.floor(months / 12);
    return (y ? `${y}y ` : "") + `${months % 12}m`;
  }
  function dateClass(s, isSupport) {
    const d = parseDate(s);
    if (d < TODAY) return isSupport ? "lc-date lc-date--unsupported" : "lc-date lc-date--past";
    if ((d - TODAY) / 864e5 <= 183) return "lc-date lc-date--soon";
    return "lc-date";
  }
  const pad = (n, digits) => String(n).padStart(digits, "0");
  // "Wi-Fi access point" → "Wi-Fi access points"; "Distribution switch" → "distribution switches"
  const noun = (type, n) => {
    const t = /^[A-Z][a-z]/.test(type) && !type.startsWith("Wi-Fi") ? type[0].toLowerCase() + type.slice(1) : type;
    return n === 1 ? t : t.replace(/(ch|sh|s|x)$/, "$1e") + "s";
  };
  const listJoin = (items) => (items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " and " + items[items.length - 1]);
  const shortModel = (m) => m.replace(/-X$/, "").replace(/-48(P|FPD-L)$/, "");

  function expandGroup(g, sites) {
    const rows = [];
    if (g.rows) {
      g.rows.forEach((r, i) => rows.push({ id: r[0], host: r[1], serial: r[2], site: sites[r[3] || 0],
        eosale: g.dates[0], eosw: g.dates[1], eosupport: (g.perRowSupport && g.perRowSupport[i]) || g.dates[2] }));
    } else {
      const split = g.siteSplit || [g.gen.count];
      let siteIdx = 0;
      let inSite = 0;
      for (let k = 0; k < g.gen.count; k++) {
        while (siteIdx < split.length - 1 && inSite >= split[siteIdx]) { siteIdx++; inSite = 0; }
        inSite++;
        rows.push({ id: g.gen.idStart + k, host: g.gen.host + pad(g.gen.hostStart + k, g.gen.digits),
          serial: g.gen.serial + pad(k + 1, 2) + "ABCDEFGHJKLMNPQRSTUVWXYZ"[k % 24],
          site: sites[Math.min(siteIdx, sites.length - 1)], eosale: g.dates[0], eosw: g.dates[1], eosupport: g.dates[2] });
      }
    }
    rows.forEach((r) => (r.unsupported = parseDate(r.eosupport) < TODAY));
    return rows;
  }

  function lifecycleModel(c) {
    const groups = c.lifecycle.groups.map((g) => {
      const rows = expandGroup(g, c.sites);
      return Object.assign({}, g, { rows, count: rows.length, unsupported: rows.filter((r) => r.unsupported).length });
    });
    const by = (b) => groups.filter((g) => g.bucket === b);
    const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
    const act = by("act");
    const plan = by("plan");
    const budget = by("budget");
    const m = {
      groups, act, plan, budget,
      actCount: sum(act, (g) => g.count), planCount: sum(plan, (g) => g.count), budgetCount: sum(budget, (g) => g.count),
      unsupported: sum(groups, (g) => g.unsupported), supported: c.lifecycle.supported,
      quoted: sum(groups.filter((g) => g.estimate && g.quoted), (g) => g.estimate),
      toQuote: sum(groups.filter((g) => g.estimate && !g.quoted), (g) => g.estimate),
    };
    m.soon = m.actCount - m.unsupported;
    m.total = m.actCount + m.planCount + m.budgetCount + m.supported;
    const list = (arr) => arr.map((g) => `${g.count} × ${shortModel(g.model)}`).join(" + ");
    m.tips = {
      act: m.actCount ? `${list(act)} — ${m.unsupported ? m.unsupported + " already past End-of-Support, " : ""}the rest lose support within 3 months` : "No devices need action within 3 months",
      plan: m.planCount ? `${list(plan)} — End-of-Sale passed; decide on replacement within 3–6 months` : "No devices in this bucket",
      budget: m.budgetCount ? `${list(budget)} — support ends more than 6 months out; budget the refresh now` : "No devices in this bucket",
    };
    return m;
  }

  /* ================= Toasts ================= */
  const toastStack = $("toastStack");
  function toast(message, opts = {}) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<svg width="15" height="15"><use href="#i-check-circle"/></svg><span></span>`;
    el.querySelector("span").textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 220);
    }, opts.life || 2600);
  }

  /* ================= Tooltip (delegated) ================= */
  const tooltipEl = $("tooltip");
  let tooltipTarget = null;
  function showTooltipAt(x, y, text) {
    tooltipEl.textContent = text;
    tooltipEl.style.left = x + "px";
    tooltipEl.style.top = y + "px";
    tooltipEl.classList.add("show");
  }
  function showTooltip(target, text) {
    const r = target.getBoundingClientRect();
    showTooltipAt(r.left + r.width / 2, r.top, text);
    tooltipTarget = target;
  }
  function hideTooltip() {
    tooltipEl.classList.remove("show");
    tooltipTarget = null;
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el || el === tooltipTarget) return;
    if (el.hasAttribute("data-tip-follow")) {
      tooltipTarget = el;
      showTooltipAt(e.clientX, e.clientY - 8, el.getAttribute("data-tip"));
    } else {
      showTooltip(el, el.getAttribute("data-tip"));
    }
  });
  document.addEventListener("mousemove", (e) => {
    if (tooltipTarget && tooltipTarget.hasAttribute("data-tip-follow")) showTooltipAt(e.clientX, e.clientY - 8, tooltipTarget.getAttribute("data-tip"));
  });
  document.addEventListener("mouseout", (e) => {
    if (!tooltipTarget) return;
    if (e.relatedTarget && tooltipTarget.contains(e.relatedTarget)) return;
    if (e.target.closest("[data-tip]") === tooltipTarget) hideTooltip();
  });
  window.addEventListener("scroll", () => tooltipTarget && hideTooltip(), { passive: true });

  /* ================= Dropdowns ================= */
  function closeAllDropdowns() {
    document.querySelectorAll(".dropdown.open").forEach((d) => d.classList.remove("open"));
    $("clientSwitch").setAttribute("aria-expanded", "false");
  }
  function setupDropdown(btnId, dropId) {
    const btn = $(btnId);
    const drop = $(dropId);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !drop.classList.contains("open");
      closeAllDropdowns();
      if (willOpen) {
        drop.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }
  setupDropdown("notifBtn", "notifDropdown");
  setupDropdown("userBtn", "userDropdown");
  setupDropdown("clientSwitch", "clientDropdown");
  document.addEventListener("click", closeAllDropdowns);

  /* ================= Delegated actions: data-toast / data-page / data-scroll / data-open-modal ================= */
  function scrollToSection(id) {
    const target = $(id);
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    target.classList.remove("flash");
    void target.offsetWidth;
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 1600);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".kpi-tile__info")) return; // info icons explain, they don't navigate
    const el = e.target.closest("[data-toast], [data-page], [data-scroll], [data-open-modal]");
    if (!el || el.closest(".lock-body.blurred")) return;
    if (el.hasAttribute("data-toast")) {
      e.preventDefault();
      toast(el.getAttribute("data-toast"));
    }
    if (el.hasAttribute("data-open-modal")) {
      const backdrop = $(el.getAttribute("data-open-modal") + "Backdrop");
      if (backdrop) backdrop.classList.add("open");
    }
    if (el.hasAttribute("data-page")) navigate(el.getAttribute("data-page"));
    if (el.hasAttribute("data-scroll")) {
      const id = el.getAttribute("data-scroll");
      setTimeout(() => scrollToSection(id), el.hasAttribute("data-page") ? 120 : 0);
    }
  });

  // keyboard access for clickable non-buttons (tiles); role/tabindex are added in enhance()
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target;
    if (el.getAttribute && el.getAttribute("role") === "button" && !el.matches("button, a, input, select, textarea")) {
      e.preventDefault();
      el.click();
    }
  });

  // pill tab groups with a sliding indicator
  function moveIndicator(group) {
    const ind = group.querySelector(".tabgroup__ind");
    const active = group.querySelector(".tabgroup__tab.active");
    if (!ind || !active || !active.offsetWidth) return;
    ind.style.width = active.offsetWidth + "px";
    ind.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
  }
  function refreshIndicators() {
    document.querySelectorAll(".tabgroup.has-ind").forEach(moveIndicator);
  }
  window.addEventListener("resize", refreshIndicators);
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tabgroup__tab");
    if (!tab) return;
    e.stopPropagation();
    const scope = tab.closest("[data-tabs]");
    const group = tab.closest(".tabgroup");
    group.querySelectorAll(".tabgroup__tab").forEach((t) => t.classList.toggle("active", t === tab));
    scope.querySelectorAll("[data-tab-panel]").forEach((p) => {
      p.hidden = p.getAttribute("data-tab-panel") !== tab.getAttribute("data-tab");
    });
    moveIndicator(group);
  });

  function enhance(root) {
    root.querySelectorAll("[data-page], [data-toast], [data-scroll]").forEach((el) => {
      if (el.matches("button, a, input, select, textarea") || el.hasAttribute("tabindex")) return;
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
    });
    root.querySelectorAll("[data-tabs] .tabgroup:not(.has-ind)").forEach((group) => {
      const ind = document.createElement("span");
      ind.className = "tabgroup__ind";
      group.prepend(ind);
      group.classList.add("has-ind");
    });
  }

  /* ================= Topbar ================= */
  $("brandBtn").addEventListener("click", () => navigate("overview"));
  $("helpBtn").addEventListener("click", () => {
    toast("Docs and the Conscia knowledge base would open here");
    closeMobileSidebar();
  });
  $("btnIncident").addEventListener("click", () => toast("Incident report started — the Conscia SOC has been notified"));
  $("btnRequest").addEventListener("click", () => toast("Service request form opened in ServiceNow"));

  /* ================= Summary drawer ================= */
  const reportDrawerBackdrop = $("reportDrawerBackdrop");
  const reportDrawerSkeleton = $("reportDrawerSkeleton");
  const reportDrawerReport = $("reportDrawerReport");
  const reportDrawerInput = $("reportDrawerInput");
  const drawerInputWrap = $("drawerInputWrap");

  function openReportDrawer() {
    reportDrawerBackdrop.classList.add("open");
    reportDrawerSkeleton.style.display = "flex";
    reportDrawerReport.hidden = true;
    document.querySelectorAll(".drawer__qa").forEach((el) => el.remove());
    setTimeout(() => {
      reportDrawerSkeleton.style.display = "none";
      reportDrawerReport.hidden = false;
    }, reduceMotion ? 0 : 1100);
  }
  function closeReportDrawer() { reportDrawerBackdrop.classList.remove("open"); }
  $("btnGenerate").addEventListener("click", openReportDrawer);
  $("reportDrawerClose").addEventListener("click", closeReportDrawer);
  reportDrawerBackdrop.addEventListener("click", (e) => { if (e.target === reportDrawerBackdrop) closeReportDrawer(); });
  reportDrawerInput.addEventListener("focus", () => drawerInputWrap.classList.add("focused"));
  reportDrawerInput.addEventListener("blur", () => drawerInputWrap.classList.remove("focused"));
  reportDrawerInput.addEventListener("input", () => {
    reportDrawerInput.style.height = "auto";
    reportDrawerInput.style.height = Math.min(reportDrawerInput.scrollHeight, 120) + "px";
  });
  function submitDrawerPrompt() {
    const question = reportDrawerInput.value.trim();
    if (!question) return;
    const qa = document.createElement("div");
    qa.className = "drawer__qa";
    qa.innerHTML = `<div class="qa-q"></div><div class="qa-a">This is a static prototype, so live Q&amp;A isn't wired up yet — in the real product this would pull a fresh answer from your current landing zone data.</div>`;
    qa.querySelector(".qa-q").textContent = question;
    reportDrawerReport.appendChild(qa);
    reportDrawerInput.value = "";
    reportDrawerInput.style.height = "auto";
    $("reportDrawerBody").scrollTo({ top: 999999, behavior: "smooth" });
  }
  $("reportDrawerSend").addEventListener("click", submitDrawerPrompt);
  reportDrawerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitDrawerPrompt();
    }
  });

  /* ================= Upgrade modal (unlocks Alarms for the current client) ================= */
  const upgradeModalBackdrop = $("upgradeModalBackdrop");
  function closeUpgradeModal() { upgradeModalBackdrop.classList.remove("open"); }
  $("upgradeModalCloseX").addEventListener("click", closeUpgradeModal);
  $("upgradeCancelBtn").addEventListener("click", closeUpgradeModal);
  upgradeModalBackdrop.addEventListener("click", (e) => { if (e.target === upgradeModalBackdrop) closeUpgradeModal(); });
  $("upgradeConfirmBtn").addEventListener("click", () => {
    closeUpgradeModal();
    unlockedAlarms.add(clientId);
    applyAlarmLock(true);
    toast("Upgraded to Standard tier — Alarms unlocked");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (reportDrawerBackdrop.classList.contains("open")) closeReportDrawer();
    if (upgradeModalBackdrop.classList.contains("open")) closeUpgradeModal();
    closeAllDropdowns();
    closeMobileSidebar();
  });

  function applyAlarmLock(animate) {
    const open = client.tier !== "Essential" || unlockedAlarms.has(clientId);
    [["alarmsCardBody", "alarmsCardOverlay"], ["alarmsBody", "alarmsOverlayPage"]].forEach(([bodyId, overlayId]) => {
      const body = $(bodyId);
      body.classList.toggle("blurred", !open);
      if (open) body.removeAttribute("aria-hidden");
      else body.setAttribute("aria-hidden", "true");
      $(overlayId).classList.toggle("hidden", open);
    });
    if (open && animate) animateCounts($("alarmsCardBody"));
  }

  /* ================= Chat widget ================= */
  const chatWidget = $("chatWidget");
  const chatPanelBody = $("chatPanelBody");
  const chatInput = $("chatInput");
  const chatInputWrap = $("chatInputWrap");
  let chatReplyIndex = 0;
  $("chatWidgetPill").addEventListener("click", () => {
    chatWidget.classList.add("expanded");
    chatPanelBody.scrollTo({ top: 999999 });
  });
  $("chatPanelMinimize").addEventListener("click", () => chatWidget.classList.remove("expanded"));
  chatInput.addEventListener("focus", () => chatInputWrap.classList.add("focused"));
  chatInput.addEventListener("blur", () => chatInputWrap.classList.remove("focused"));
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 90) + "px";
  });
  const chatAvatar = `<img class="chat-msg__avatar" src="assets/team-daan.png" width="24" height="24" alt="" />`;
  function addChatMessage(text, who) {
    const row = document.createElement("div");
    row.className = "chat-msg chat-msg--" + who;
    row.innerHTML = `${who === "them" ? chatAvatar : ""}<div class="chat-msg__bubble"></div>`;
    row.querySelector(".chat-msg__bubble").textContent = text;
    chatPanelBody.appendChild(row);
    chatPanelBody.scrollTo({ top: chatPanelBody.scrollHeight, behavior: "smooth" });
  }
  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMessage(text, "me");
    chatInput.value = "";
    chatInput.style.height = "auto";
    const typingRow = document.createElement("div");
    typingRow.className = "chat-msg chat-msg--them chat-msg--typing";
    typingRow.innerHTML = `${chatAvatar}<div class="chat-msg__bubble"><span class="chat-msg__dot"></span><span class="chat-msg__dot"></span><span class="chat-msg__dot"></span></div>`;
    chatPanelBody.appendChild(typingRow);
    chatPanelBody.scrollTo({ top: chatPanelBody.scrollHeight, behavior: "smooth" });
    const replies = client.chat.replies;
    setTimeout(() => {
      typingRow.remove();
      addChatMessage(replies[chatReplyIndex % replies.length], "them");
      chatReplyIndex++;
    }, 1100 + Math.random() * 500);
  }
  $("chatSend").addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  /* ================= Sparklines (SOC tiles) ================= */
  // Curves sampled from the Figma sparkline exports (assets/spark-1.svg pulses, assets/spark-2.svg wave),
  // window x 16–301 = the slice the Figma tile actually shows (576px-wide image at left:-16px):
  // 0 = top of the line band, 1 = bottom. Every wave tile reuses the same curve, as in the design;
  // spec.tilt ("up" | "down") leans it so rising / falling trends read correctly.
  const SPARK_SHAPES = {
    pulse: [1,1,1,1,1,0.997,0.965,0.672,0.348,0.052,0.019,0.016,0.024,0.137,0.499,0.862,0.99,1,1,1,1,1,1,1,1,1,1,0.998,0.968,0.8,0.616,0.433,0.249,0.066,0.006,0,0.01,0.106,0.306,0.506,0.705,0.905,0.991,1,1,1,1,1,1,0.996,0.956,0.84,0.725,0.609,0.493,0.378,0.262,0.146,0.034,0.003,0,0.004,0.045,0.138,0.231,0.323,0.394,0.407,0.407,0.407,0.407,0.407,0.407,0.415,0.479,0.602,0.726,0.849,0.968,0.997,1,1,1,1.0,0.983,0.895,0.783,0.671,0.559,0.447,0.335,0.223,0.146,0.134,0.146,0.228,0.362,0.496,0.63,0.763,0.897,0.987,1.0,1,1,1,1,1,1,1,0.997,0.968,0.843,0.714,0.584,0.455,0.325,0.196,0.067,0.007],
    wave: [0.02,0.01,0.0,0.002,0.026,0.068,0.11,0.151,0.185,0.196,0.196,0.196,0.196,0.196,0.196,0.209,0.23,0.252,0.273,0.29,0.287,0.267,0.246,0.226,0.205,0.184,0.163,0.142,0.121,0.102,0.098,0.115,0.145,0.157,0.158,0.158,0.164,0.192,0.25,0.353,0.47,0.587,0.703,0.791,0.837,0.857,0.856,0.833,0.784,0.691,0.575,0.485,0.434,0.389,0.344,0.299,0.254,0.21,0.187,0.185,0.203,0.228,0.252,0.276,0.301,0.325,0.349,0.382,0.418,0.454,0.49,0.526,0.562,0.598,0.619,0.621,0.621,0.621,0.62,0.601,0.562,0.521,0.48,0.444,0.428,0.435,0.463,0.522,0.604,0.687,0.771,0.854,0.932,0.979,1.0,0.999,0.987,0.975,0.963,0.946,0.929,0.912,0.896,0.879,0.862,0.845,0.829,0.812,0.803,0.803,0.803,0.803,0.803,0.803,0.798,0.771,0.716,0.619,0.513,0.411],
  };
  function tiltShape(shape, tilt) {
    if (!tilt) return shape;
    const n = shape.length;
    return shape.map((v, i) => {
      const t = i / (n - 1);
      const ramp = tilt === "up" ? 1 - t : t; // "up" = values rise over time = line moves up
      return Math.min(1, Math.max(0, v * 0.4 + ramp * 0.6));
    });
  }
  function renderSpark(el, spec) {
    const shape = tiltShape(SPARK_SHAPES[spec.shape], spec.tilt);
    const W = 300;
    const H = 72;
    const band = spec.shape === "pulse" ? [7, H - 2] : [4, 37];
    const pts = shape.map((v, i) => [(i / (shape.length - 1)) * W, band[0] + v * (band[1] - band[0])]);
    const line = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
    el.className = "spark spark--" + spec.tone;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="spark__area" d="${line}L${W},${H}L0,${H}Z"/><path class="spark__line" d="${line}"/></svg><span class="spark__cursor"></span><span class="spark__dot"></span>`;
    const cursor = el.querySelector(".spark__cursor");
    const dot = el.querySelector(".spark__dot");
    const decimals = spec.decimals || 0;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const i = Math.round(frac * (pts.length - 1));
      const xPct = (pts[i][0] / W) * 100;
      const yPct = (pts[i][1] / H) * 100;
      cursor.style.left = xPct + "%";
      dot.style.left = xPct + "%";
      dot.style.top = yPct + "%";
      el.classList.add("hovering");
      const day = new Date(TODAY);
      day.setDate(TODAY.getDate() - Math.round((1 - frac) * 29));
      const value = spec.top + shape[i] * (spec.bottom - spec.top);
      showTooltipAt(r.left + (xPct / 100) * r.width, r.top + (yPct / 100) * r.height - 4, `${fmtDay(day)} · ${value.toFixed(decimals)} ${spec.unit}`);
    });
    el.addEventListener("mouseleave", () => {
      el.classList.remove("hovering");
      hideTooltip();
    });
  }
  function drawSparks(root) {
    root.querySelectorAll(".spark").forEach((el, i) => {
      const svg = el.querySelector("svg");
      if (!svg) return;
      el.classList.remove("drawn");
      svg.style.transitionDelay = reduceMotion ? "0ms" : 120 + i * 70 + "ms";
      void el.offsetWidth;
      requestAnimationFrame(() => el.classList.add("drawn"));
    });
  }

  /* ================= Templates ================= */
  const ICON = (id, size = 16) => `<svg width="${size}" height="${size}"><use href="#i-${id}"/></svg>`;

  function tile(o) {
    // o: { tone, graph, title, tip, value, decimals, unit, prefix, suffix, label (html), page, scroll, toast, tileTip, extra (html) }
    const zero = o.value === 0 && ["alert", "critical", "high", "medium"].includes(o.tone); // empty buckets stay calm
    const cls = "kpi-tile" + (o.tone && !zero ? " kpi-tile--" + o.tone : "") + (o.graph ? " kpi-tile--graph" : "");
    const attrs = [
      o.page ? `data-page="${o.page}"` : "", o.scroll ? `data-scroll="${o.scroll}"` : "",
      o.toast ? `data-toast="${esc(o.toast)}"` : "", o.tileTip ? `data-tip="${esc(o.tileTip)}"` : "",
    ].join(" ");
    const link = o.page || o.toast ? `<span class="kpi-tile__link">${ICON("arrow-up-right")}</span>` : "";
    const info = o.tip ? `<span class="kpi-tile__info" data-tip="${esc(o.tip)}">${ICON("info")}</span>` : "";
    const dec = o.decimals ? ` data-decimals="${o.decimals}"` : "";
    return `<div class="${cls}" ${attrs}>
      <div class="kpi-tile__head"><span class="kpi-tile__title">${esc(o.title)}${info}</span>${link}</div>
      <div class="kpi-tile__value">${o.prefix || ""}<span data-count="${o.value}"${dec}>0</span>${o.suffix || ""}${o.unit ? `<span class="kpi-tile__unit">${o.unit}</span>` : ""}</div>
      <div class="kpi-tile__label">${o.label}</div>${o.extra || ""}
    </div>`;
  }
  function row(o) {
    // o: { icon, iconTone, title, meta, right (html), stack, page, scroll, toast }
    const attrs = [o.page ? `data-page="${o.page}"` : "", o.scroll ? `data-scroll="${o.scroll}"` : "", o.toast ? `data-toast="${esc(o.toast)}"` : ""].join(" ");
    return `<button class="row" ${attrs}>
      <span class="row__icon${o.iconTone ? " " + o.iconTone : ""}">${ICON(o.icon, 14)}</span>
      <span class="row__main"><span class="row__title">${esc(o.title)}</span><span class="row__meta">${esc(o.meta)}</span></span>
      <span class="row__right${o.stack ? " row__right--stack" : ""}">${o.right}</span>
    </button>`;
  }
  const empty = (text) => `<div class="row-empty">${ICON("check-circle", 16)}<span>${esc(text)}</span></div>`;

  /* ================= Overview ================= */
  function renderOverview(c, lm) {
    const soc = c.soc.map((s, i) => {
      const trendCls = s.trend.tone === "bad" ? " kpi-tile__trend--danger" : s.trend.tone === "good" ? " kpi-tile__trend--success" : "";
      const pillCls = s.trend.tone === "bad" ? "trend-pill--up" : s.trend.tone === "good" ? "trend-pill--down" : "trend-pill--flat";
      return tile({ graph: true, title: s.title, tip: s.tip, value: s.value, unit: s.unit, label: esc(s.label), page: s.page, toast: s.toast,
        extra: `<div class="spark" data-spark-index="${i}"></div><div class="kpi-tile__trend${trendCls}">${s.trend.text} <span class="trend-pill ${pillCls}">${s.trend.pill}${ICON("trend-" + (s.trend.icon || "flat"), 14)}</span></div>` });
    }).join("");

    const urgentSupport = lm.act.filter((g) => g.unsupported).map((g) => {
      const oldest = g.rows.filter((r) => r.unsupported).map((r) => parseDate(r.eosupport)).sort((a, b) => a - b)[0];
      return row({ icon: "chip", iconTone: "disaster", title: `${shortModel(g.model)} × ${g.unsupported}`, meta: g.area, page: "lifecycle", scroll: "lcCardAct",
        right: `<span class="pill pill-disaster">Unsupported ${fmtAge(monthsBetween(oldest, TODAY))}</span>` });
    }).join("") || empty("No devices are past End of Support");
    const urgentSale = lm.plan.map((g) => row({ icon: "chip", iconTone: "warn", title: `${shortModel(g.model)} × ${g.count}`, meta: g.area, page: "lifecycle", scroll: "lcCardPlan",
      right: `<span class="pill pill-orange">Overdue ${fmtAge(monthsBetween(parseDate(g.dates[0]), TODAY))}</span>` })).join("") || empty("No devices are past End of Sale");

    const adv = c.advisories;
    const advRows = adv.urgent.map(([t, meta, score, crit]) => row({ icon: "bug", iconTone: crit ? "danger" : "", title: t, meta, page: "cves",
      right: `<span class="score${crit ? " score--critical" : ""}">${score}</span>` })).join("") || empty("No vulnerable devices");
    const cs = c.cases;
    const p12 = cs.p12.map(([t, meta, num, crit]) => row({ icon: "chip", iconTone: crit ? "danger" : "", title: t, meta, page: "cases",
      right: `<span class="pill ${crit ? "pill-critical" : "pill-neutral"}">${num}</span>` })).join("") || empty("No open P1 or P2 incidents");
    const al = c.alarms;
    const alRows = al.recent.map(([t, host, sev, ago, crit]) => row({ icon: "chip", iconTone: crit ? "danger" : "", title: t, meta: host, page: "alarms", stack: true,
      right: `<span class="pill ${crit ? "pill-critical" : "pill-neutral"}">${sev}</span><span class="row__time">${ago}</span>` })).join("") || empty("No recent alarms");
    const actions = c.actions.map(([kind, badge, title, ctx]) => `<button class="action" data-tip="Click to mark as done">
        <span class="badge badge--${kind}">${esc(badge)}</span>
        <span class="action__main"><span class="action__title">${esc(title)}</span><span class="action__context">${esc(ctx)}</span></span>
      </button>`).join("");

    $("ovRoot").innerHTML = `
      <div class="section-card">
        <h2 class="section-card__title">SOC</h2>
        <div class="kpi-grid kpi-grid--5">${soc}</div>
      </div>
      <div class="grid grid-2">
        <div class="section-card" data-tabs>
          <h2 class="section-card__title">Lifecycle management</h2>
          <div class="kpi-grid kpi-grid--3">
            ${tile({ tone: "critical", title: "Act now", tip: lm.tips.act, value: lm.actCount, label: "within <b>3 months</b>", page: "lifecycle", scroll: "lcCardAct" })}
            ${tile({ tone: "high", title: "Plan now", tip: lm.tips.plan, value: lm.planCount, label: "within <b>3-6 months</b>", page: "lifecycle", scroll: "lcCardPlan" })}
            ${tile({ tone: "medium", title: "Budget & Schedule", tip: lm.tips.budget, value: lm.budgetCount, label: "within <b>6+ months</b>", page: "lifecycle", scroll: "lcCardBudget" })}
          </div>
          <div class="cta-strip">
            <span>Contact us to get estimated investment for replacement plan</span>
            <button class="btn btn-primary" data-toast="Your Conscia account director will contact you about a replacement quote">${ICON("euro", 18)}Contact Sales</button>
          </div>
          <div class="sub-head">
            <h3 class="sub-head__title">Most urgent devices</h3>
            <div class="tabgroup">
              <button class="tabgroup__tab active" data-tab="eosupport">PastEOSupport (${lm.unsupported})</button>
              <button class="tabgroup__tab" data-tab="eosale">PastEOSale (${lm.planCount})</button>
            </div>
          </div>
          <div class="row-list" data-tab-panel="eosupport">${urgentSupport}</div>
          <div class="row-list" data-tab-panel="eosale" hidden>${urgentSale}</div>
          <div class="section-card__foot"><button class="btn btn-link" data-page="devices">See all${ICON("arrow-up-right", 18)}</button></div>
        </div>
        <div class="section-card">
          <h2 class="section-card__title">Security advisories</h2>
          <div class="kpi-grid kpi-grid--2">
            ${tile({ tone: "alert", title: "Critical CVEs", tip: adv.criticalTip, value: adv.critical, label: "devices", page: "cves" })}
            ${tile({ title: "High CVEs", tip: adv.highTip, value: adv.high, label: "devices", page: "cves" })}
          </div>
          <h3 class="sub-head__title sub-head__title--solo">Most urgent devices</h3>
          <div class="row-list">${advRows}</div>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="section-card">
          <h2 class="section-card__title">Cases</h2>
          <div class="kpi-grid kpi-grid--3">
            ${tile({ tone: "alert", title: "Open incidents", tip: `Open ServiceNow incidents (INC) for ${c.name}`, value: cs.incidents, label: "cases", page: "cases" })}
            ${tile({ title: "Open cases", tip: "All open incidents and requests", value: cs.open, label: "cases", page: "cases" })}
            ${tile({ title: "Awaiting you", tip: `Cases waiting on an approval or answer from ${c.name}`, value: cs.awaiting, label: "cases", page: "cases" })}
          </div>
          <h3 class="sub-head__title sub-head__title--solo">P1 or P2 incidents</h3>
          <div class="row-list">${p12}</div>
        </div>
        <div class="section-card" id="alarmsCard">
          <h2 class="section-card__title">Alarms</h2>
          <div class="lock-wrap">
            <div class="lock-body" id="alarmsCardBody">
              <div class="kpi-grid kpi-grid--3">
                ${tile({ tone: "alert", title: "Critical", tip: al.criticalTip, value: al.critical, label: "alarms", page: "alarms" })}
                ${tile({ title: "High", tip: "High-severity alarms active now", value: al.high, label: "alarms", page: "alarms" })}
                ${tile({ title: "Avg. resolve", tip: "Average time to resolve an alarm (30 days)", value: al.avgResolve, decimals: 1, label: "hours", page: "alarms" })}
              </div>
              <h3 class="sub-head__title sub-head__title--solo">Most recent alarms</h3>
              <div class="row-list">${alRows}</div>
            </div>
            <div class="locked-overlay" id="alarmsCardOverlay">
              <p>Your current tier does not grant access to Alarms.</p>
              <button class="btn btn-primary" data-open-modal="upgradeModal">${ICON("upgrade", 18)}Upgrade tier</button>
            </div>
          </div>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="section-card">
          <h2 class="section-card__title">Actions required</h2>
          <div class="action-list" id="actionsList">${actions}</div>
        </div>
        ${teamCard()}
      </div>`;
    $("ovRoot").querySelectorAll(".spark[data-spark-index]").forEach((el) => renderSpark(el, c.soc[+el.getAttribute("data-spark-index")].spark));
  }

  function member(photo, name, role) {
    const pic = photo.endsWith(".png") ? `<img class="member__photo" src="assets/${photo}" width="32" height="32" alt="" />` : `<span class="member__photo member__photo--initials">${photo}</span>`;
    return `<div class="member">${pic}
      <span class="member__main"><span class="member__name">${name}</span><span class="member__role">${role}</span></span>
      <span class="member__actions">
        <button class="member__btn" data-toast="New email to ${name} opened">${ICON("email", 20)}Email</button>
        <button class="member__btn" data-toast="Calling ${name}…">${ICON("call", 20)}Call</button>
      </span></div>`;
  }
  function teamCard() {
    return `<div class="section-card" data-tabs>
      <h2 class="section-card__title">Your Conscia Team</h2>
      <div class="tabgroup tabgroup--team">
        <button class="tabgroup__tab active" data-tab="primary">Primary contacts</button>
        <button class="tabgroup__tab" data-tab="commercial">Commercial</button>
        <button class="tabgroup__tab" data-tab="escalation">Escalation</button>
      </div>
      <div class="team-list" data-tab-panel="primary">${member("team-daan.png", "Daan Herpers", "Service delivery manager")}${member("team-roel.png", "Roel Ottenheijm", "Account director")}${member("team-michel.png", "Michel Koerting", "Engineering lead")}</div>
      <div class="team-list" data-tab-panel="commercial" hidden>${member("team-roel.png", "Roel Ottenheijm", "Account director")}${member("IW", "Inge Willems", "Inside sales · quotes &amp; renewals")}</div>
      <div class="team-list" data-tab-panel="escalation" hidden>${member("24/7", "Conscia Service Desk", "24/7 · first point of escalation")}${member("team-daan.png", "Daan Herpers", "Service delivery manager · second line")}</div>
    </div>`;
  }

  // Actions required: toggle done
  document.addEventListener("click", (e) => {
    const action = e.target.closest("#actionsList .action");
    if (!action) return;
    action.classList.toggle("done");
    const done = action.classList.contains("done");
    action.setAttribute("data-tip", done ? "Click to reopen" : "Click to mark as done");
    if (tooltipTarget === action) showTooltip(action, action.getAttribute("data-tip"));
    toast(`${done ? "Marked done" : "Reopened"}: ${action.querySelector(".action__title").textContent}`);
  });

  /* ================= Lifecycle ================= */
  const DONUT_C = 2 * Math.PI * 50;
  function lcTable(id, tbodyId, dot, title, count, flag, tip, rows, emptyText) {
    const body = rows.map((r) => `
          <tr data-id="${r.id}"${r.unsupported ? ' class="lc-row-unsupported"' : ""}>
            <td class="lc-th-check"><button class="lc-checkbox" aria-label="Select row"></button></td>
            <td class="lc-id">${r.id}</td><td>${esc(r.model)}</td><td>${r.host}</td><td>${esc(r.os)}</td><td>${esc(r.osver)}</td><td>${r.serial}</td>
            <td class="${dateClass(r.eosale)}">${r.eosale}</td><td class="${dateClass(r.eosw)}">${r.eosw}</td><td class="${dateClass(r.eosupport, true)}">${r.eosupport}</td>
          </tr>`).join("");
    const table = rows.length ? `<div class="lc-table-scroll"><table class="lc-table"><thead><tr>
            <th class="lc-th-check"><button class="lc-checkbox" data-check-all="${tbodyId}" aria-label="Select all"></button></th>
            <th class="lc-th-sort" data-sort-table="${tbodyId}">ID${ICON("chevron-down", 12)}</th>
            <th>Device</th><th>Hostname</th><th>OS</th><th>OS version</th><th>Serial number</th><th>End-Of-Sale</th><th>End-Of-Software</th><th>End-Of-Support</th>
          </tr></thead><tbody id="${tbodyId}">${body}</tbody></table></div>
          <div class="lc-table-foot">Showing ${rows.length} of ${rows.length} devices</div>`
      : `<div class="lc-table-empty">${ICON("check-circle", 18)}<span>${esc(emptyText)}</span></div>`;
    return `<div class="lc-table-card" id="${id}" data-collapse="5">
          <div class="lc-table-head">
            <div class="lc-table-title"><i class="legend-dot ${dot}"></i>${title} <span class="lc-count">(${count})</span>${flag}</div>
            <span class="lc-info" data-tip="${esc(tip)}">${ICON("info")}</span>
          </div>${table}
        </div>`;
  }
  const flatRows = (groups) => groups.flatMap((g) => g.rows.map((r) => Object.assign({ model: g.model, os: g.os, osver: g.osver }, r)))
    .sort((a, b) => (b.unsupported - a.unsupported) || (a.id - b.id));

  function renderLifecycle(c, lm) {
    const segs = [
      ["disaster", lm.unsupported, "Already unsupported"], ["critical", lm.soon, "Support ends within 3 months"],
      ["high", lm.planCount, "Plan now (3–6 months)"], ["medium", lm.budgetCount, "Budget & schedule (6+ months)"], ["low", lm.supported, "Fully supported"],
    ];
    let off = 0;
    const circles = segs.filter((s) => s[1] > 0).map(([cls, n, label]) => {
      const dash = (n / lm.total) * DONUT_C;
      const el = `<circle class="lc-donut__seg ${cls}" cx="60" cy="60" r="50" data-dash="${dash.toFixed(2)}" data-offset="${(-off).toFixed(2)}" data-tip="${esc(label)} · ${n} device${n === 1 ? "" : "s"}" data-tip-follow></circle>`;
      off += dash;
      return el;
    }).join("");

    const estGroups = lm.groups.filter((g) => g.estimate);
    const why = (g) => g.unsupported ? `<span class="pill pill-disaster">Past End of Support</span>`
      : g.bucket === "act" ? `<span class="pill pill-critical">End of Support ${g.dates[2]}</span>`
      : g.bucket === "plan" ? `<span class="pill pill-orange">Past End of Sale</span>` : `<span class="pill pill-medium">End of Support ${g.dates[2]}</span>`;
    const hosts = (g) => g.rows.length <= 2 ? g.rows.map((r) => r.host).join(", ") : `${g.rows[0].host}–${g.rows[g.rows.length - 1].host.slice(-3)}`;
    const toQuote = estGroups.filter((g) => !g.quoted);
    const breakdown = estGroups.length ? `<div class="invest" id="investBreakdown" hidden>
          <table class="invest__table">
            <thead><tr><th>Replace</th><th>With</th><th>Why</th><th>Status</th><th class="num">Estimate</th></tr></thead>
            <tbody>${estGroups.map((g) => `<tr>
              <td><b>${g.count} × ${esc(g.type)}</b><span>${esc(g.model)} · ${hosts(g)}</span></td>
              <td>${esc(g.replaceWith)}</td><td>${why(g)}</td>
              <td><span class="pill ${g.quoted ? "pill-neutral" : "pill-orange"}">${g.quoted ? "Quoted" : "To quote"}</span></td>
              <td class="num">${g.quoted ? "" : "~"}€${g.estimate}k</td></tr>`).join("")}</tbody>
            <tfoot><tr><td colspan="4">Total · <b>€${lm.quoted}k</b> quoted${lm.toQuote ? ` + <b>~€${lm.toQuote}k</b> still to quote` : ""}</td><td class="num">${lm.toQuote ? "~" : ""}€${lm.quoted + lm.toQuote}k</td></tr></tfoot>
          </table>
          <div class="invest__actions">
            <span>Estimates are indicative list prices; your account director confirms the final quote.</span>
            ${toQuote.length ? `<button class="btn btn-primary btn-sm" data-toast="Quote request for ${listJoin(toQuote.map((g) => `${g.count} ${noun(g.type, g.count)}`))} sent to Roel Ottenheijm">${ICON("euro")}Request a quote</button>` : ""}
          </div>
        </div>` : "";

    $("lcRoot").innerHTML = `
        <div class="card lc-summary-card">
          <div class="card__head">
            <div class="card__title">${ICON("layers", 15)}Hardware lifecycle</div>
            <button class="btn btn-secondary" data-toast="Generating hardware lifecycle report…">${ICON("file")}Generate report</button>
          </div>
          <div class="card__body lc-summary">
            <div class="lc-donut-wrap">
              <svg class="lc-donut" viewBox="0 0 120 120" width="150" height="150"><circle class="lc-donut__track" cx="60" cy="60" r="50"/>${circles}</svg>
              <div class="lc-donut__center"><b>${lm.total}</b><span>devices</span></div>
            </div>
            <div class="kpi-grid kpi-grid--4 lc-tiles">
              ${tile({ tone: "critical", title: "Act now", value: lm.actCount, label: "within <b>3 months</b>", scroll: "lcCardAct", tileTip: lm.tips.act })}
              ${tile({ tone: "high", title: "Plan now", value: lm.planCount, label: "within <b>3-6 months</b>", scroll: "lcCardPlan", tileTip: lm.tips.plan })}
              ${tile({ tone: "medium", title: "Budget & Schedule", value: lm.budgetCount, label: "within <b>6+ months</b>", scroll: "lcCardBudget", tileTip: lm.tips.budget })}
              ${tile({ tone: "cta", title: "Est. investment", value: lm.quoted, prefix: "€", suffix: "k",
                label: estGroups.length ? `<button class="btn btn-link kpi-tile__btn" id="investToggle" aria-expanded="false" aria-controls="investBreakdown">View breakdown${ICON("chevron-down")}</button>` : "nothing to replace" })}
            </div>
          </div>
          ${breakdown}
        </div>
        ${lcTable("lcCardAct", "lcTableAct", "critical", "Act now — replace within 3 months", lm.actCount,
          lm.unsupported ? `<span class="lc-flag"><i class="legend-dot disaster"></i>${lm.unsupported} already unsupported</span>` : "",
          "Devices already past End-of-Support (no security patches) or losing support within 3 months. Order replacements now — lead time is 6–8 weeks.",
          flatRows(lm.act), "Nothing needs replacing in the next 3 months.")}
        ${lcTable("lcCardPlan", "lcTablePlan", "high", "Plan now — decide within 3–6 months", lm.planCount, "",
          "End-of-Sale has passed and software maintenance is ending (no more bug fixes). Hardware is still supported — plan the replacement this half-year.",
          flatRows(lm.plan), "No devices to plan for.")}
        ${lcTable("lcCardBudget", "lcTableBudget", "medium", "Budget & Schedule — 6+ months out", lm.budgetCount, "",
          "Support ends more than 6 months from now. No risk today — put the refresh in next year's budget.",
          flatRows(lm.budget), "Nothing to budget for yet.")}`;
    $("lcRoot").querySelectorAll(".lc-table-card[data-collapse]").forEach(setupCollapse);
  }

  function animateDonut(root) {
    root.querySelectorAll(".lc-donut__seg[data-dash]").forEach((seg, i) => {
      const dash = parseFloat(seg.getAttribute("data-dash"));
      seg.style.strokeDashoffset = seg.getAttribute("data-offset");
      seg.style.transitionDelay = reduceMotion ? "0ms" : 150 + i * 140 + "ms";
      seg.style.strokeDasharray = `0 ${DONUT_C}`;
      void seg.getBoundingClientRect();
      requestAnimationFrame(() => { seg.style.strokeDasharray = `${dash} ${DONUT_C - dash}`; });
    });
  }

  // investment breakdown toggle
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#investToggle");
    if (!btn) return;
    e.stopPropagation();
    const panel = $("investBreakdown");
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.firstChild.textContent = open ? "Hide breakdown" : "View breakdown";
    if (open) panel.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  });

  // lifecycle tables: show the first N rows, expand on demand
  function applyCollapse(card) {
    const limit = parseInt(card.getAttribute("data-collapse"), 10);
    const rows = [...card.querySelectorAll("tbody tr")];
    const expanded = card.classList.contains("expanded");
    rows.forEach((r, i) => r.classList.toggle("lc-row-collapsed", !expanded && i >= limit));
    const label = card.querySelector(".lc-table-foot__label");
    if (label) label.textContent = `Showing ${expanded ? rows.length : Math.min(limit, rows.length)} of ${rows.length} devices`;
  }
  function setupCollapse(card) {
    const limit = parseInt(card.getAttribute("data-collapse"), 10);
    const total = card.querySelectorAll("tbody tr").length;
    if (total <= limit) return;
    card.querySelector(".lc-table-foot").innerHTML = `<span class="lc-table-foot__label"></span><button class="btn btn-link btn-sm lc-expand" aria-expanded="false">Show all ${total}${ICON("chevron-down")}</button>`;
    applyCollapse(card);
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".lc-expand");
    if (!btn) return;
    const card = btn.closest(".lc-table-card");
    const expanded = card.classList.toggle("expanded");
    btn.setAttribute("aria-expanded", String(expanded));
    btn.firstChild.textContent = expanded ? "Show less" : `Show all ${card.querySelectorAll("tbody tr").length}`;
    applyCollapse(card);
    if (!expanded) card.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  });

  // checkboxes + sortable ID column (Lifecycle + Devices)
  document.addEventListener("click", (e) => {
    const cb = e.target.closest(".lc-checkbox");
    if (cb) {
      e.stopPropagation();
      const all = cb.getAttribute("data-check-all");
      if (all) {
        const willCheck = !cb.classList.contains("checked");
        cb.classList.toggle("checked", willCheck);
        $(all).querySelectorAll(".lc-checkbox").forEach((x) => x.classList.toggle("checked", willCheck));
      } else {
        cb.classList.toggle("checked");
      }
      return;
    }
    const th = e.target.closest(".lc-th-sort");
    if (!th) return;
    const tbody = $(th.getAttribute("data-sort-table"));
    const rows = [...tbody.querySelectorAll("tr")];
    const desc = !th.classList.contains("sort-desc");
    rows.sort((a, b) => (desc ? -1 : 1) * (parseInt(a.getAttribute("data-id"), 10) - parseInt(b.getAttribute("data-id"), 10)));
    rows.forEach((r) => tbody.appendChild(r));
    th.classList.toggle("sort-desc", desc);
    const card = th.closest(".lc-table-card[data-collapse]");
    if (card && card.querySelector(".lc-expand")) applyCollapse(card);
  });

  /* ================= Devices ================= */
  const STATUS = {
    unsupported: '<span class="pill pill-disaster">Unsupported · replace now</span>', act: '<span class="pill pill-critical">Replace within 3 months</span>',
    plan: '<span class="pill pill-high">Plan replacement</span>', budget: '<span class="pill pill-medium">Budget &amp; schedule</span>', ok: '<span class="pill pill-low">Supported</span>',
  };
  let devicesShown = 0;
  function renderDevices(c, lm) {
    const rows = [];
    lm.groups.forEach((g) => g.rows.slice(0, 2).forEach((r) => rows.push([r.id, g.model, r.host, g.os, r.site, r.unsupported ? STATUS.unsupported : STATUS[g.bucket]])));
    c.lifecycle.supportedSamples.forEach(([id, model, host, os, si]) => rows.push([id, model, host, os, c.sites[si], STATUS.ok]));
    devicesShown = rows.length;
    $("lcTableAll").innerHTML = rows.map(([id, model, host, os, site, status]) =>
      `<tr data-id="${id}"><td class="lc-th-check"><button class="lc-checkbox" aria-label="Select row"></button></td><td class="lc-id">${id}</td><td>${esc(model)}</td><td>${host}</td><td>${esc(os)}</td><td>${esc(site)}</td><td>${status}</td></tr>`).join("");
    $("devCount").textContent = `Showing 1–${rows.length} of ${lm.total} devices`;
  }
  document.querySelectorAll(".lc-page-btn[data-lc-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-lc-page");
      if (val === "prev" || val === "next") {
        toast("This prototype only has live data for page 1");
        return;
      }
      document.querySelectorAll(".lc-page-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      toast(`Loading page ${val} — devices ${(val - 1) * devicesShown + 1}–${val * devicesShown}…`);
    });
  });
  const lcPerPage = $("lcPerPage");
  if (lcPerPage) lcPerPage.addEventListener("change", () => toast(`Showing ${lcPerPage.value} items per page`));

  /* ================= Row action menus (Alarms, Cases) ================= */
  function attachRowMenu(rowEl, items, onPick) {
    const cell = rowEl.querySelector(".al-actions-cell");
    cell.innerHTML = `<button class="al-actions-btn" aria-label="Row actions">${ICON("more")}</button>
      <div class="dropdown">${items.map(([k, label]) => `<div class="dropdown-item" data-act="${k}">${label}</div>`).join("")}</div>`;
    const btn = cell.querySelector(".al-actions-btn");
    const menu = cell.querySelector(".dropdown");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !menu.classList.contains("open");
      closeAllDropdowns();
      if (willOpen) menu.classList.add("open");
    });
    menu.querySelectorAll("[data-act]").forEach((item) => item.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.remove("open");
      onPick(item.getAttribute("data-act"));
    }));
  }
  function setTab(onId, offId, apply) {
    $(onId).classList.add("active");
    $(offId).classList.remove("active");
    apply();
  }

  /* ================= Alarms ================= */
  const SEV = { disaster: ["sev-disaster", "Disaster"], high: ["sev-high", "High"], average: ["sev-average", "Average"], warning: ["sev-warning", "Warning"], information: ["sev-info", "Information"], unclassified: ["sev-unclassified", "Unclassified"] };
  function renderAlarms(c) {
    const al = c.alarms;
    const icons = ["alert-triangle", "alert-triangle", "bell", "bell", "info", "help"];
    $("alSummary").innerHTML = Object.keys(SEV).map((k, i) => `<div class="al-sev-card">
        <span class="al-sev-card__icon ${SEV[k][0]}">${ICON(icons[i], 20)}</span>
        <div><div class="al-sev-card__value">${al.sev[i]}</div><div class="al-sev-card__label">${SEV[k][1]}</div></div></div>`).join("");
    $("alFilterSite").innerHTML = `<option value="">All sites</option>` + c.sites.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
    const tbody = $("alTableBody");
    tbody.innerHTML = al.rows.map(([sev, status, ack, site, time, problem, host, ip, inc, dur, resolved, source]) =>
      `<tr${ack ? ' class="al-acknowledged"' : ""} data-status="${status}" data-severity="${sev}" data-site="${esc(site)}" data-source="${esc(source)}">
        <td><span class="al-sev-pill ${SEV[sev][0]}">${SEV[sev][1]}</span></td><td>${esc(site)}</td><td>${time}</td><td>${esc(problem)}</td>
        <td><a href="#" class="al-link" data-toast="Opening ${host}">${host}</a></td><td>${ip}</td><td><a href="#" class="al-link" data-toast="Opening incident ${inc}">${inc}</a></td>
        <td>${dur}</td><td>${resolved}</td><td>${esc(source)}</td><td class="al-actions-cell"></td></tr>`).join("");
    tbody.querySelectorAll("tr").forEach((rowEl) => {
      const hostname = rowEl.querySelector(".al-link").textContent;
      attachRowMenu(rowEl, [["ack", "Acknowledge"], ["view", "View incident"], ["copy", "Copy hostname"]], (act) => {
        if (act === "ack") { rowEl.classList.add("al-acknowledged"); toast(`Acknowledged: ${hostname}`); }
        else if (act === "view") toast(`Opening incident details for ${hostname}`);
        else toast(`Copied "${hostname}" to clipboard`);
      });
    });
    $("upgradeWarning").textContent = al.upgradeWarning || "";
    $("upgradeWarning").parentElement.hidden = !al.upgradeWarning;
    applyAlarmFilters();
  }
  function applyAlarmFilters() {
    const showAll = $("alTabAll").classList.contains("active");
    const q = $("alFilterText").value.trim().toLowerCase();
    const site = $("alFilterSite").value;
    const sev = $("alFilterSeverity").value;
    const src = $("alFilterSource").value;
    let visible = 0;
    $("alTableBody").querySelectorAll("tr").forEach((rowEl) => {
      let show = showAll || rowEl.getAttribute("data-status") !== "resolved";
      if (show && q && !(rowEl.children[3].textContent + " " + rowEl.children[4].textContent).toLowerCase().includes(q)) show = false;
      if (show && site && rowEl.getAttribute("data-site") !== site) show = false;
      if (show && sev && rowEl.getAttribute("data-severity") !== sev) show = false;
      if (show && src && rowEl.getAttribute("data-source") !== src) show = false;
      rowEl.hidden = !show;
      if (show) visible++;
    });
    $("alEmptyState").hidden = visible !== 0;
    $("alTableFoot").textContent = `Showing ${visible} of ${visible} ${showAll ? "" : "active "}alarms`.replace("  ", " ");
  }
  $("alTabActive").addEventListener("click", () => setTab("alTabActive", "alTabAll", applyAlarmFilters));
  $("alTabAll").addEventListener("click", () => setTab("alTabAll", "alTabActive", applyAlarmFilters));
  $("alFilterText").addEventListener("input", applyAlarmFilters);
  ["alFilterSite", "alFilterSeverity", "alFilterSource"].forEach((id) => $(id).addEventListener("change", applyAlarmFilters));

  /* ================= Advisories ================= */
  function renderCves(c) {
    const counts = c.advisories.counts;
    $("cvesTableBody").innerHTML = window.ADVISORIES.map(([title, cve, sev, ver, os, osver, updated]) => {
      const [rel, vul, nv, nc] = counts[cve] || [0, 0, 0, 0];
      return `<tr data-severity="${sev}" data-vendor="cisco" data-os="${os}" data-osver="${esc(osver)}" data-related="${rel}">
        <td class="adv-title-cell">${esc(title)}</td><td><a href="#" class="al-link" data-toast="Opening ${cve} detail">${cve}</a></td>
        <td><span class="adv-sev-pill ${sev}">${sev[0].toUpperCase() + sev.slice(1)}</span></td><td>${ver}</td><td><span class="adv-vendor-pill">Cisco</span></td>
        <td>${updated}</td><td>${rel}</td><td${vul ? ' class="adv-vuln"' : ""}>${vul}</td><td>${nv}</td><td>${nc}</td></tr>`;
    }).join("");
    applyCvesFilters();
  }
  function applyCvesFilters() {
    const val = (id) => $(id).value.trim().toLowerCase();
    const q = val("cvesFilterText");
    const sev = val("cvesFilterSeverity");
    const vendor = val("cvesFilterVendor");
    const os = val("cvesFilterOs");
    const osver = val("cvesFilterOsVersion");
    const affectedOnly = $("cvesOnlyAffected").checked;
    const rows = $("cvesTableBody").querySelectorAll("tr");
    let visible = 0;
    rows.forEach((rowEl) => {
      let show = !(affectedOnly && parseInt(rowEl.getAttribute("data-related"), 10) === 0);
      if (show && q && !(rowEl.children[0].textContent + " " + rowEl.children[1].textContent).toLowerCase().includes(q)) show = false;
      if (show && sev && !rowEl.getAttribute("data-severity").includes(sev)) show = false;
      if (show && vendor && !rowEl.getAttribute("data-vendor").includes(vendor)) show = false;
      if (show && os && !rowEl.getAttribute("data-os").includes(os)) show = false;
      if (show && osver && !rowEl.getAttribute("data-osver").toLowerCase().includes(osver)) show = false;
      rowEl.hidden = !show;
      if (show) visible++;
    });
    $("cvesEmptyState").hidden = visible !== 0;
    $("cvesTableFoot").textContent = `Showing ${visible} of ${rows.length} advisories`;
  }
  ["cvesFilterText", "cvesFilterSeverity", "cvesFilterVendor", "cvesFilterOs", "cvesFilterOsVersion"].forEach((id) => $(id).addEventListener("input", applyCvesFilters));
  $("cvesOnlyAffected").addEventListener("change", applyCvesFilters);
  $("cvesOnlyActive").addEventListener("change", (e) => toast(e.target.checked ? "Counting only active devices" : "Counting all devices, including retired ones"));
  $("cvesSyncMenuBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = $("cvesSyncMenu");
    const willOpen = !menu.classList.contains("open");
    closeAllDropdowns();
    if (willOpen) menu.classList.add("open");
  });

  /* ================= Cases ================= */
  const PRI = { p1: "P1 - Critical", p2: "P2 - High", p3: "P3 - Moderate", p4: "P4 - Low" };
  function renderCases(c) {
    const cs = c.cases;
    const cards = [
      [cs.incidents ? "al-sev-card--alert" : "", "sev-disaster", "alert-triangle", cs.incidents, "Open incidents"],
      ["", "sev-info", "ticket", cs.open, "Open cases"], ["", "sev-average", "user", cs.awaiting, "Awaiting you"],
      ["", "sev-high", "clock", cs.atRisk, "At risk (SLA)"], ["", "sev-low", "check-circle", cs.resolved30, "Resolved (30d)"],
    ];
    $("csSummary").innerHTML = cards.map(([mod, sev, icon, v, label]) => `<div class="al-sev-card ${mod}">
        <span class="al-sev-card__icon ${sev}">${ICON(icon, 20)}</span><div><div class="al-sev-card__value">${v}</div><div class="al-sev-card__label">${label}</div></div></div>`).join("");
    const tbody = $("csTableBody");
    tbody.innerHTML = cs.rows.map(([status, num, desc, pri, stateLabel, stateCls, group, assigned, cat, opened, updated, sla, risk]) =>
      `<tr data-status="${status}" data-state="${stateLabel.toLowerCase()}" data-priority="${pri}" data-group="${group}">
        <td><a href="#" class="al-link" data-toast="Opening ${num} in ServiceNow">${num}</a></td><td class="adv-title-cell">${desc}</td>
        <td><span class="al-sev-pill ${pri}">${PRI[pri]}</span></td><td><span class="cs-state-pill ${stateCls}">${stateLabel}</span></td>
        <td>${group}</td><td>${assigned}</td><td>${cat}</td><td>${opened}</td><td>${updated}</td><td${risk ? ' class="cs-sla-risk"' : ""}>${sla}</td><td class="al-actions-cell"></td></tr>`).join("");
    tbody.querySelectorAll("tr").forEach((rowEl) => {
      const number = rowEl.querySelector(".al-link").textContent;
      attachRowMenu(rowEl, [["open", "Open in ServiceNow"], ["assign", "Assign to me"], ["copy", "Copy number"]], (act) => {
        if (act === "open") toast(`Opening ${number} in ServiceNow…`);
        else if (act === "assign") toast(`Assigned ${number} to you`);
        else toast(`Copied "${number}" to clipboard`);
      });
    });
    applyCasesFilters();
  }
  function applyCasesFilters() {
    const showAll = $("csTabAll").classList.contains("active");
    const q = $("csFilterText").value.trim().toLowerCase();
    const state = $("csFilterState").value;
    const priority = $("csFilterPriority").value;
    const group = $("csFilterGroup").value;
    let visible = 0;
    $("csTableBody").querySelectorAll("tr").forEach((rowEl) => {
      let show = showAll || rowEl.getAttribute("data-status") !== "closed";
      if (show && q && !(rowEl.children[0].textContent + " " + rowEl.children[1].textContent).toLowerCase().includes(q)) show = false;
      if (show && state && rowEl.getAttribute("data-state") !== state) show = false;
      if (show && priority && rowEl.getAttribute("data-priority") !== priority) show = false;
      if (show && group && rowEl.getAttribute("data-group") !== group) show = false;
      rowEl.hidden = !show;
      if (show) visible++;
    });
    $("csEmptyState").hidden = visible !== 0;
    $("csTableFoot").textContent = `Showing ${visible} of ${visible} ${showAll ? "" : "open "}cases`.replace("  ", " ");
  }
  $("csTabOpen").addEventListener("click", () => setTab("csTabOpen", "csTabAll", applyCasesFilters));
  $("csTabAll").addEventListener("click", () => setTab("csTabAll", "csTabOpen", applyCasesFilters));
  $("csFilterText").addEventListener("input", applyCasesFilters);
  ["csFilterState", "csFilterPriority", "csFilterGroup"].forEach((id) => $(id).addEventListener("change", applyCasesFilters));

  /* ================= Uptime ================= */
  // JS port of docs/tools/gen_uptime_chart.py so every client gets its own 7 / 30 / 90-day trend.
  const LAYERS = [["core", "Core"], ["security", "Security"], ["edge", "Edge"], ["wlan", "WLAN"], ["services", "Services"]];
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function uptimeChart(u, n, seed, visible) {
    const rand = mulberry32(seed);
    const W = 800, H = 260, ML = 34, MR = 10, MT = 10, MB = 24, PW = W - ML - MR, PH = H - MT - MB;
    const YMIN = u.ymin;
    const YMAX = 100.3;
    const y = (v) => MT + ((YMAX - v) / (YMAX - YMIN)) * PH;
    const x = (i) => ML + (n > 1 ? (i / (n - 1)) * PW : 0);
    const noise = { core: 0.12, security: 0.15, edge: 0.1, wlan: 0.12, services: 0.05 };
    const data = {};
    LAYERS.forEach(([k]) => {
      const vals = Array.from({ length: n }, () => u.base[k] + (rand() * 2 - 1) * noise[k]);
      const dec = u.decline[k];
      if (dec) {
        const days = Math.min(dec[0], n);
        const startIdx = n - days;
        const startVal = startIdx > 0 ? vals[startIdx - 1] : u.base[k];
        for (let d = 0; d < days; d++) vals[startIdx + d] = startVal + (dec[1] - startVal) * ((d + 1) / days) + (rand() * 2 - 1) * 0.08;
      }
      vals[n - 1] = u.today[k];
      data[k] = vals.map((v) => Math.max(YMIN + 0.1, Math.min(100, v)));
    });
    const step = YMAX - YMIN < 3.5 ? 0.5 : 1;
    let grid = "";
    for (let g = Math.ceil(YMIN / step) * step; g <= 100.001; g += step) {
      grid += `<line x1="${ML}" y1="${y(g).toFixed(1)}" x2="${W - MR}" y2="${y(g).toFixed(1)}" class="ut-grid"></line><text x="${ML - 6}" y="${(y(g) + 3).toFixed(1)}" class="ut-axis-label" text-anchor="end">${+g.toFixed(1)}%</text>`;
    }
    const day = (i) => {
      const d = new Date(TODAY);
      d.setDate(TODAY.getDate() - (n - 1 - i));
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    };
    const ptStep = n <= 10 ? 1 : n <= 35 ? 3 : 6;
    const lines = LAYERS.map(([k]) => `<path class="ut-line ${k}" d="M ${data[k].map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L ")}"></path>`).join("");
    const pts = LAYERS.map(([k, label]) => data[k].map((v, i) => (i % ptStep === 0 || i === n - 1)
      ? `<circle class="ut-pt ${k}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6" data-tip="${label} · ${day(i)}: ${v.toFixed(1)}%"></circle>` : "").join("")).join("");
    const idxs = n <= 7 ? [...Array(n).keys()] : [...new Set([0, 1, 2, 3, 4, 5].map((i) => Math.round((i * (n - 1)) / 5)))];
    const xl = idxs.map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="ut-axis-label" text-anchor="middle">${day(i)}</text>`).join("");
    return `<svg class="ut-chart" data-range-chart="${n}" viewBox="0 0 ${W} ${H}"${visible ? "" : " hidden"}><g class="ut-grid-group">${grid}</g>${lines}${pts}<g class="ut-xlabels">${xl}</g></svg>`;
  }
  function renderUptime(c) {
    const u = c.uptime;
    const cards = [
      ["sev-info", "activity", `${u.overall}<span class="unit">%</span>`, "Overall uptime (30d)"],
      ["sev-low", "check-circle", u.meeting, "Layers meeting 99% SLA"],
      [u.below ? "sev-high" : "sev-low", u.below ? "alert-triangle" : "check-circle", u.below, u.belowLabel],
      ["sev-unclassified", "clock", u.longest, "Longest outage (30d)"],
      ["sev-brand", "ticket", u.incidents, "Related incidents (30d)"],
    ];
    $("utSummary").innerHTML = cards.map(([sev, icon, v, label]) => `<div class="al-sev-card"><span class="al-sev-card__icon ${sev}">${ICON(icon, 20)}</span><div><div class="al-sev-card__value">${v}</div><div class="al-sev-card__label">${label}</div></div></div>`).join("");
    $("utLegend").innerHTML = LAYERS.map(([k, label]) => `<button class="ut-legend-item" data-series="${k}"><i class="ut-legend-dot ${k}"></i>${label} <span>${u.today[k]}%</span></button>`).join("");
    const seed = [...clientId].reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const active = (document.querySelector(".ut-range-btn.active") || {}).getAttribute ? document.querySelector(".ut-range-btn.active").getAttribute("data-range") : "30";
    $("utChartWrap").innerHTML = [7, 30, 90].map((n) => uptimeChart(u, n, seed + n, String(n) === active)).join("");
    $("utToday").innerHTML = `<div class="uptime__legend"><span><i class="legend-dot low"></i>&ge; 99% target met</span><span><i class="legend-dot high"></i>Below SLA</span></div>` +
      LAYERS.map(([k, label]) => {
        const v = u.today[k];
        const warn = v < 99;
        return `<div class="uptime-row" data-tip="${label}: ${v}% uptime, ${warn ? "below SLA" : "target met"}">
          <div class="uptime-row__label"><i class="legend-dot ${warn ? "high" : "low"}"></i>${label}</div>
          <div class="uptime-row__track"><div class="uptime-row__fill${warn ? " warn" : ""}" data-w="${v}"></div><div class="uptime-row__threshold"></div></div>
          <div class="uptime-row__value${warn ? " warn" : ""}">${v}%</div></div>`;
      }).join("");
    const [tone, strong, rest] = u.footer;
    $("utFoot").innerHTML = `<span class="${tone}"><svg class="inline-icon" width="13" height="13"><use href="#i-${tone === "good" ? "check-circle" : "alert-triangle"}"/></svg><strong>${strong}</strong>${rest}</span>`;
    $("utOutages").innerHTML = u.outages.map(([layer, start, dur, problem, status, ref]) => `<tr><td>${layer}</td><td>${start}</td><td>${dur}</td><td class="adv-title-cell">${esc(problem)}</td>
      <td><span class="pill ${status === "Ongoing" ? "pill-critical" : "pill-neutral"}">${status}</span></td><td><a href="#" class="al-link" data-toast="Opening ${ref}">${ref}</a></td></tr>`).join("");
    $("utOutagesFoot").textContent = `Showing ${u.outages.length} of ${u.outages.length} outages`;
  }
  document.querySelectorAll(".ut-range-btn").forEach((btn) => btn.addEventListener("click", () => {
    document.querySelectorAll(".ut-range-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".ut-chart").forEach((svg) => { svg.hidden = svg.getAttribute("data-range-chart") !== btn.getAttribute("data-range"); });
  }));
  document.addEventListener("click", (e) => {
    const item = e.target.closest(".ut-legend-item");
    if (!item) return;
    const series = item.getAttribute("data-series");
    const off = !item.classList.contains("off");
    item.classList.toggle("off", off);
    document.querySelectorAll(`.ut-line.${series}, .ut-pt.${series}`).forEach((el) => el.classList.toggle("series-hidden", off));
  });
  function animateBars(root) {
    root.querySelectorAll(".uptime-row__fill[data-w]").forEach((el, i) => {
      el.style.width = "0%";
      setTimeout(() => { el.style.width = el.getAttribute("data-w") + "%"; }, reduceMotion ? 0 : 150 + i * 110);
    });
  }

  /* ================= Shell: client switcher, account, notifications, summary, chat ================= */
  const STATUS_LABEL = { alarming: "Needs urgent attention", mixed: "Some items need attention", good: "All on track" };
  function renderShell(c, lm) {
    $("clientName").textContent = c.name;
    document.querySelectorAll('[data-bind="devices"]').forEach((el) => (el.textContent = lm.total));
    $("clientList").innerHTML = $("clientListCompact").innerHTML = window.CLIENT_ORDER.map((id) => {
      const x = CLIENTS[id];
      return `<button class="client-option${id === clientId ? " active" : ""}" role="option" aria-selected="${id === clientId}" data-client="${id}">
        <i class="client-dot client-dot--${x.status}"></i>
        <span class="client-option__main"><b>${esc(x.name)}</b><span>${esc(x.sector)} · ${STATUS_LABEL[x.status]}</span></span>
        ${id === clientId ? ICON("check", 16) : ""}</button>`;
    }).join("");
    $("userInitials").textContent = c.contact.initials;
    $("userName").textContent = c.contact.name;
    $("userRole").textContent = `${c.contact.role} · ${c.name}`;
    $("notifList").innerHTML = c.notifications.map(([t, meta, toastMsg, read]) =>
      `<div class="notif-item" data-toast="${esc(toastMsg)}"><div class="d${read ? " read" : ""}"></div><div><b>${esc(t)}</b><span>${esc(meta)}</span></div></div>`).join("");
    document.querySelector("#notifBtn .dot").hidden = c.notifications.every((n) => n[3]);
    const s = c.summary;
    reportDrawerReport.innerHTML = `<p class="rp-alert rp-alert--${s.tone}">${s.alert}</p><p>${s.intro}</p>` +
      s.sections.map(([h, p]) => `<h4>${h}</h4><p>${p}</p>`).join("") + `<p class="rp-decisions-label">${s.decisionsLabel}</p><p>${s.decisions}</p>`;
    $("chatGreeting").textContent = c.chat.greeting;
    [...chatPanelBody.querySelectorAll(".chat-msg")].slice(1).forEach((m) => m.remove());
    chatReplyIndex = 0;
  }

  document.addEventListener("click", (e) => {
    const opt = e.target.closest(".client-option");
    if (!opt) return;
    e.stopPropagation();
    closeAllDropdowns();
    const id = opt.getAttribute("data-client");
    if (id === clientId) return;
    setClient(id);
    toast(`Switched to ${CLIENTS[id].name}`);
  });

  function setClient(id) {
    clientId = CLIENTS[id] ? id : "bernhoven";
    client = CLIENTS[clientId];
    try { localStorage.setItem("lz-client", clientId); } catch (err) { /* storage unavailable — fine */ }
    const lm = lifecycleModel(client);
    renderShell(client, lm);
    renderOverview(client, lm);
    renderLifecycle(client, lm);
    renderDevices(client, lm);
    renderAlarms(client);
    renderCves(client);
    renderCases(client);
    renderUptime(client);
    applyAlarmLock(false);
    enhance(document);
    navigate(currentPage, true);
  }

  /* ================= Routing ================= */
  const pages = ["overview", "lifecycle", "devices", "alarms", "cves", "cases", "uptime"].reduce((acc, p) => {
    acc[p] = $("page-" + p);
    return acc;
  }, {});
  const pageMeta = {
    recommendations: { label: "Recommendations", sub: "Conscia's prioritised improvement plan will live here. Start with the Actions required on the Overview." },
    admin: { label: "Admin", sub: "Users, integrations (ServiceNow, Cisco PSIRT) and notification preferences." },
  };
  function replayCardAnimations(container) {
    container.querySelectorAll(".section-card, .card, .lc-panel, .lc-table-card, .al-sev-card").forEach((el, i) => {
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.animation = "";
      el.style.animationDelay = reduceMotion ? "0ms" : Math.min(i, 8) * 50 + "ms";
    });
  }
  function navigate(page, keepScroll) {
    currentPage = page;
    document.querySelectorAll(".sidebar__item[data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    Object.values(pages).forEach((p) => (p.style.display = "none"));
    $("page-generic").style.display = "none";
    const target = pages[page];
    if (target) {
      target.style.display = "";
      replayCardAnimations(target);
      animateCounts(target);
      if (page === "overview") {
        drawSparks(target);
        refreshIndicators();
      }
      if (page === "lifecycle") animateDonut(target);
      if (page === "uptime") animateBars(target);
    } else {
      $("page-generic").style.display = "";
      const meta = pageMeta[page] || { label: page.charAt(0).toUpperCase() + page.slice(1) };
      $("genericTitle").textContent = meta.label;
      $("genericHeading").textContent = meta.label;
      $("genericSub").textContent = meta.sub || "This section isn't wired up in this prototype.";
    }
    if (!keepScroll) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    closeMobileSidebar();
    hideTooltip();
  }

  /* ================= Mobile sidebar ================= */
  const sidebarEl = $("sidebar");
  const sidebarBackdrop = $("sidebarBackdrop");
  function closeMobileSidebar() {
    sidebarEl.classList.remove("open");
    sidebarBackdrop.classList.remove("open");
  }
  $("menuBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !sidebarEl.classList.contains("open");
    sidebarEl.classList.toggle("open", open);
    sidebarBackdrop.classList.toggle("open", open);
  });
  sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  /* ================= Count-ups ================= */
  function animateCount(el) {
    const target = parseFloat(el.getAttribute("data-count"));
    const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (isNaN(target)) return;
    const final = decimals ? target.toFixed(decimals) : String(target);
    if (reduceMotion || target === 0) {
      el.textContent = final;
      return;
    }
    const start = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - start) / 800);
      const val = target * (1 - Math.pow(1 - p, 3));
      el.textContent = decimals ? val.toFixed(decimals) : Math.round(val);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    })(performance.now());
  }
  function animateCounts(root) {
    root.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = "0";
      animateCount(el);
    });
  }

  /* ================= Start ================= */
  let initial = new URLSearchParams(location.search).get("client");
  if (!initial) {
    try { initial = localStorage.getItem("lz-client"); } catch (err) { initial = null; }
  }
  setClient(initial && CLIENTS[initial] ? initial : "bernhoven");
  window.addEventListener("load", refreshIndicators);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshIndicators);
})();
