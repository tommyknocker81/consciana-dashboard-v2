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
    if (!s || s === "—") return null;
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  function monthsBetween(a, b) {
    return Math.round((b - a) / (30.44 * 864e5)); // nearest whole month
  }
  function fmtAge(months) {
    const y = Math.floor(months / 12);
    return (y ? `${y}y ` : "") + `${months % 12}m`;
  }
  function dateClass(s, isSupport) {
    const d = parseDate(s);
    if (!d) return "lc-date lc-date--na";
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

  // What fixing it takes: Replace (hardware ends) · Upgrade (software version ends) · Renew (licence / contract ends)
  const ACTIONS = {
    replace: { label: "Replace", icon: "chip", tip: (g) => `Hardware support ends — replace with ${g.replaceWith ? g.replaceWith.split(" · ")[0] : "a current model"}` },
    upgrade: { label: "Upgrade", icon: "trend-up", tip: (g) => `Software version ends — upgrade to ${g.upgradeTo || "a supported release"}; the hardware stays` },
    renew: { label: "Renew", icon: "clock", tip: (g) => `Licence or contract ends — ${g.upgradeTo || "renew it"}` },
  };
  const glabel = (g) => g.software || shortModel(g.model);
  const actionTag = (g) => `<span class="action-tag action-tag--${g.action}" data-tip="${esc(ACTIONS[g.action].tip(g))}">${ICON(ACTIONS[g.action].icon, 12)}${ACTIONS[g.action].label}</span>`;

  function lifecycleModel(c) {
    const groups = c.lifecycle.groups.map((g) => {
      const rows = expandGroup(g, c.sites);
      return Object.assign({ kind: "hardware", action: "replace" }, g, { rows, count: rows.length, unsupported: rows.filter((r) => r.unsupported).length });
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
    const list = (arr) => arr.map((g) => `${g.count} × ${glabel(g)}`).join(" + ");
    const needs = groups;
    m.actions = { replace: 0, upgrade: 0, renew: 0 };
    needs.forEach((g) => (m.actions[g.action] += g.count));
    m.kinds = { hardware: needs.filter((g) => g.kind === "hardware").reduce((x, g) => x + g.count, 0), software: needs.filter((g) => g.kind === "software").reduce((x, g) => x + g.count, 0) };
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

  /* ================= Cases helpers ================= */
  const NOW = new Date(2026, 4, 26, 14, 32);
  function parseDateTime(s) {
    const [d, t] = s.split(" ");
    const [dd, mm, yy] = d.split("/").map(Number);
    const [h, mi] = (t || "0:0").split(":").map(Number);
    return new Date(yy, mm - 1, dd, h, mi);
  }
  function ago(s) {
    const min = Math.max(0, Math.round((NOW - parseDateTime(s)) / 60000));
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  // case row: [status, num, desc, pri, stateLabel, stateCls, group, assigned, cat, opened, updated, sla, risk]
  function urgentCaseRows(cs) {
    return cs.rows.filter((r) => r[0] === "open" && (r[3] === "p1" || r[3] === "p2"))
      .sort((a, b) => a[3].localeCompare(b[3]) || parseDateTime(b[9]) - parseDateTime(a[9]));
  }
  function caseRow(r) {
    const [, num, desc, pri, , , , assigned, , opened] = r;
    const p1 = pri === "p1";
    const short = desc.split(" — ")[0];
    const who = assigned === "Unassigned" ? "Pending assignment…" : `Assignee: ${assigned}`;
    return `<button class="row" data-page="cases" data-tip="${p1 ? "P1 · Critical" : "P2 · High"} — opened ${opened}">
      <span class="row__icon ${p1 ? "danger-solid" : "danger"}">${ICON("alert")}</span>
      <span class="row__main"><span class="row__title">${num} | ${short}</span><span class="row__meta">${p1 ? "P1 Critical" : "P2 High"} · ${esc(who)}</span></span>
      <span class="row__right"><span class="pill ${p1 ? "pill-critical-solid" : "pill-critical"}">${ago(opened)}</span></span>
    </button>`;
  }

  /* ================= Overview ================= */
  function renderOverview(c, lm) {
    const soc = c.soc.map((s, i) => {
      const trendCls = s.trend.tone === "bad" ? " kpi-tile__trend--danger" : s.trend.tone === "good" ? " kpi-tile__trend--success" : "";
      const pillCls = s.trend.tone === "bad" ? "trend-pill--up" : s.trend.tone === "good" ? "trend-pill--down" : "trend-pill--flat";
      return tile({ graph: true, title: s.title, tip: s.tip, value: s.value, unit: s.unit, label: esc(s.label), page: s.page, toast: s.toast,
        extra: `<div class="spark" data-spark-index="${i}"></div><div class="kpi-tile__trend${trendCls}">${s.trend.text} <span class="trend-pill ${pillCls}">${s.trend.pill}${ICON("trend-" + (s.trend.icon || "flat"), 14)}</span></div>` });
    }).join("");

    // Most urgent devices = the Act now bucket only (already unsupported, then soonest loss of support).
    // End-of-Sale alone is a planning signal, not urgency — it only appears as a calm "next up" when nothing is urgent.
    const supportDate = (g) => g.rows.map((r) => parseDate(r.eosupport)).sort((x, y) => x - y)[0];
    const urgentGroups = lm.act.slice().sort((x, y) => (y.unsupported > 0) - (x.unsupported > 0) || supportDate(x) - supportDate(y));
    const whenLabel = (d) => {
      const days = Math.round((d - TODAY) / 864e5);
      return days < 14 ? `${days} days` : days < 70 ? `${Math.round(days / 7)} weeks` : `${Math.round(days / 30)} months`;
    };
    let urgent = urgentGroups.slice(0, 3).map((g) => {
      const d = supportDate(g);
      // "unsupported for at least …": count from the group's most recent End-of-Support date
      const latest = g.rows.map((r) => parseDate(r.eosupport)).sort((x, y) => y - x)[0];
      return g.unsupported
        ? row({ icon: "chip", iconTone: "disaster", title: `${glabel(g)} × ${g.count}`, meta: g.area, page: "lifecycle", scroll: "lcCardAct",
            right: `${actionTag(g)}<span class="pill pill-disaster">Unsupported ${fmtAge(monthsBetween(latest, TODAY))}</span>` })
        : row({ icon: "chip", iconTone: "danger", title: `${glabel(g)} × ${g.count}`, meta: g.area, page: "lifecycle", scroll: "lcCardAct",
            right: `${actionTag(g)}<span class="pill pill-critical">${g.action === "renew" ? "Expires" : "Support ends"} in ${whenLabel(d)}</span>` });
    }).join("");
    if (!urgent) {
      const next = lm.plan.length ? { groups: lm.plan, when: "plan within 3–6 months", pill: "pill-high", label: "Plan now", scroll: "lcCardPlan" }
        : lm.budget.length ? { groups: lm.budget, when: "budget for next year", pill: "pill-medium", label: "Budget", scroll: "lcCardBudget" } : null;
      urgent = next
        ? row({ icon: "check-circle", iconTone: "ok", title: "Nothing urgent right now", page: "lifecycle", scroll: next.scroll,
            meta: `Next up: ${next.groups.map((g) => `${glabel(g)} × ${g.count}`).join(", ")} · ${next.when}`,
            right: `<span class="pill ${next.pill}">${next.label}</span>` })
        : empty("No lifecycle milestones coming up");
    }

    const adv = c.advisories;
    const advRows = adv.urgent.map(([t, meta, score, crit]) => row({ icon: "bug", iconTone: crit ? "danger" : "", title: t, meta, page: "cves",
      right: `<span class="score${crit ? " score--critical" : ""}">${score}</span>` })).join("") || empty("No vulnerable devices");
    const cs = c.cases;
    // Urgent cases = open P1 / P2 cases, P1 first, newest first (Figma 240:3642)
    const urgentCases = urgentCaseRows(cs);
    const urgentList = urgentCases.slice(0, 3).map((r) => caseRow(r)).join("") ||
      `<div class="row row--static"><span class="row__icon ok">${ICON("check-ok")}</span><span class="row__main"><span class="row__title">No P1 or P2 cases</span></span></div>`;
    const urgentMore = urgentCases.length > 3 ? `<div class="section-card__foot"><button class="btn btn-link" data-page="cases">View all ${urgentCases.length} urgent cases${ICON("arrow-up-right", 18)}</button></div>` : "";
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
        <div class="section-card">
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
          <h3 class="sub-head__title sub-head__title--solo">Most urgent devices</h3>
          <div class="row-list">${urgent}</div>
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
            ${tile({ tone: "alert", title: "P1 or P2", tip: "Open cases with priority P1 (critical) or P2 (high)", value: urgentCases.length, label: "cases", page: "cases" })}
            ${tile({ title: "Open cases", tip: "All open incidents and requests", value: cs.open, label: "cases", page: "cases" })}
            ${tile({ title: "Awaiting you", tip: `Cases waiting on an approval or answer from ${c.name}`, value: cs.awaiting, label: "cases", page: "cases" })}
          </div>
          <h3 class="sub-head__title sub-head__title--solo">Urgent cases</h3>
          <div class="row-list">${urgentList}</div>${urgentMore}
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
          <tr data-id="${r.id}" data-kind="${r.kind}"${r.unsupported ? ' class="lc-row-unsupported"' : ""}>
            <td class="lc-th-check"><button class="lc-checkbox" aria-label="Select row"></button></td>
            <td class="lc-id">${r.id}</td><td>${esc(r.model)}</td><td>${r.host}</td><td>${esc(r.os)}</td><td>${esc(r.osver)}</td><td>${r.serial}</td>
            <td class="${dateClass(r.eosale)}">${r.eosale}</td><td class="${dateClass(r.eosw)}">${r.eosw}</td><td class="${dateClass(r.eosupport, true)}">${r.eosupport}</td>
            <td>${r.tag}</td>
          </tr>`).join("");
    const table = rows.length ? `<div class="lc-table-scroll"><table class="lc-table"><thead><tr>
            <th class="lc-th-check"><button class="lc-checkbox" data-check-all="${tbodyId}" aria-label="Select all"></button></th>
            <th class="lc-th-sort" data-sort-table="${tbodyId}">ID${ICON("chevron-down", 12)}</th>
            <th>Device</th><th>Hostname</th><th>OS</th><th>OS version</th><th>Serial number</th><th>End-Of-Sale</th><th>End-Of-Software</th><th>End-Of-Support</th><th>Action</th>
          </tr></thead><tbody id="${tbodyId}">${body}</tbody></table></div>
          <div class="lc-table-foot">Showing ${rows.length} of ${rows.length} items</div>
          <div class="lc-table-empty lc-filter-empty" hidden>${ICON("check-circle", 18)}<span></span></div>`
      : `<div class="lc-table-empty">${ICON("check-circle", 18)}<span>${esc(emptyText)}</span></div>`;
    return `<div class="lc-table-card" id="${id}" data-collapse="5">
          <div class="lc-table-head">
            <div class="lc-table-title"><i class="legend-dot ${dot}"></i>${title} <span class="lc-count">(<span class="lc-count__n">${count}</span>)</span>${flag}</div>
            <span class="lc-info" data-tip="${esc(tip)}">${ICON("info")}</span>
          </div>${table}
        </div>`;
  }
  const flatRows = (groups) => groups.flatMap((g) => g.rows.map((r) => Object.assign({ model: g.model, os: g.os, osver: g.osver, kind: g.kind, tag: actionTag(g) }, r)))
    .sort((a, b) => (b.unsupported - a.unsupported) || (a.id - b.id));

  function renderLifecycle(c, lm) {
    const segs = [
      ["disaster", lm.unsupported, "Already unsupported", "No security patches or vendor support"],
      ["critical", lm.soon, "Support ends < 3 months", "Act now — order replacements"],
      ["high", lm.planCount, "Plan now", "End of Sale passed · decide in 3–6 months"],
      ["medium", lm.budgetCount, "Budget & schedule", "Support ends in 6+ months · budget it"],
      ["low", lm.supported, "Fully supported", "No action needed"],
    ];
    let off = 0;
    const circles = segs.filter((sg) => sg[1] > 0).map(([cls, n]) => {
      const dash = (n / lm.total) * DONUT_C;
      const el = `<circle class="lc-donut__seg ${cls}" cx="60" cy="60" r="50" data-seg="${cls}" data-dash="${dash.toFixed(2)}" data-offset="${(-off).toFixed(2)}"></circle>`;
      off += dash;
      return el;
    }).join("");
    // hover / focus popover: one row per colour, the hovered segment's row is highlighted
    const pop = `<div class="lc-pop" role="tooltip" id="lcPop">
        <div class="lc-pop__head">${lm.total} devices by lifecycle status</div>
        ${segs.map(([cls, n, label, desc]) => `<div class="lc-pop__row${n ? "" : " is-zero"}" data-seg="${cls}">
          <i class="legend-dot ${cls}"></i>
          <span class="lc-pop__text"><b>${esc(label)}</b><span>${esc(desc)}</span></span>
          <span class="lc-pop__count">${n}</span></div>`).join("")}
        <div class="lc-pop__foot">Needing action: <b>${lm.actions.replace}</b> replace · <b>${lm.actions.upgrade}</b> upgrade · <b>${lm.actions.renew}</b> renew</div>
      </div>`;

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
            <span>Estimates are indicative list prices; your account director confirms the final quote. <button class="btn btn-link btn-sm invest__plan" data-page="plan">See them in the 5-year plan${ICON("arrow-up-right")}</button></span>
            ${toQuote.length ? `<button class="btn btn-primary btn-sm" data-toast="Quote request for ${listJoin(toQuote.map((g) => `${g.count} ${noun(g.type, g.count)}`))} sent to Roel Ottenheijm">${ICON("euro")}Request a quote</button>` : ""}
          </div>
        </div>` : "";

    $("lcRoot").innerHTML = `
        <div class="card lc-summary-card">
          <div class="card__head">
            <div class="card__title">${ICON("layers", 15)}Lifecycle</div>
            <button class="btn btn-secondary" data-toast="Generating hardware lifecycle report…">${ICON("file")}Generate report</button>
          </div>
          <div class="card__body lc-summary">
            <div class="lc-donut-wrap" tabindex="0" aria-describedby="lcPop">
              <svg class="lc-donut" viewBox="0 0 120 120" width="150" height="150" aria-hidden="true"><circle class="lc-donut__track" cx="60" cy="60" r="50"/>${circles}</svg>
              <div class="lc-donut__center"><b>${lm.total}</b><span>devices</span></div>
              ${pop}
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
        <div class="lc-filter" data-tabs>
          <span class="lc-filter__label">Show</span>
          <div class="tabgroup">
            <button class="tabgroup__tab active" data-tab="all">All (${lm.actCount + lm.planCount + lm.budgetCount})</button>
            <button class="tabgroup__tab" data-tab="hardware">Hardware (${lm.kinds.hardware})</button>
            <button class="tabgroup__tab" data-tab="software">Software &amp; licences (${lm.kinds.software})</button>
          </div>
        </div>
        ${lcTable("lcCardAct", "lcTableAct", "critical", "Act now — replace within 3 months", lm.actCount,
          `<span class="lc-flag"${lm.unsupported ? "" : " hidden"}><i class="legend-dot disaster"></i><span class="lc-flag__n">${lm.unsupported}</span> already unsupported</span>`,
          "Devices already past End-of-Support (no security patches) or losing support within 3 months. Order replacements now — lead time is 6–8 weeks.",
          flatRows(lm.act), "Nothing needs replacing in the next 3 months.")}
        ${lcTable("lcCardPlan", "lcTablePlan", "high", "Plan now — decide within 3–6 months", lm.planCount, "",
          "End-of-Sale has passed and software maintenance is ending (no more bug fixes). Hardware is still supported — plan the replacement this half-year.",
          flatRows(lm.plan), "No devices to plan for.")}
        ${lcTable("lcCardBudget", "lcTableBudget", "medium", "Budget & Schedule — 6+ months out", lm.budgetCount, "",
          "Support ends more than 6 months from now. No risk today — put the refresh in next year's budget.",
          flatRows(lm.budget), "Nothing to budget for yet.")}`;
    lcKind = "all";
    $("lcRoot").querySelectorAll(".lc-table-card[data-collapse]").forEach((card) => card.querySelector("tbody") && setupCollapse(card));
  }

  // donut: highlight the popover row of the hovered segment
  document.addEventListener("mouseover", (e) => {
    const wrap = e.target.closest(".lc-donut-wrap");
    if (!wrap) return;
    const seg = e.target.closest(".lc-donut__seg");
    const key = seg ? seg.getAttribute("data-seg") : "";
    wrap.querySelectorAll(".lc-pop__row").forEach((r) => r.classList.toggle("is-active", r.getAttribute("data-seg") === key));
    wrap.classList.toggle("has-active", !!key);
  });

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

  // lifecycle tables: show the first N rows (of those passing the Hardware / Software filter), expand on demand
  function refreshCollapse(card) {
    const limit = parseInt(card.getAttribute("data-collapse"), 10);
    const tbody = card.querySelector("tbody");
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll("tr")].filter((r) => !r.classList.contains("lc-row-filtered"));
    const expanded = card.classList.contains("expanded");
    tbody.querySelectorAll("tr").forEach((r) => r.classList.remove("lc-row-collapsed"));
    rows.forEach((r, i) => r.classList.toggle("lc-row-collapsed", !expanded && i >= limit));
    const n = rows.length;
    card.querySelector(".lc-count__n").textContent = n;
    const flag = card.querySelector(".lc-flag");
    if (flag) {
      const unsup = rows.filter((r) => r.classList.contains("lc-row-unsupported")).length;
      flag.querySelector(".lc-flag__n").textContent = unsup;
      flag.hidden = unsup === 0;
    }
    const foot = card.querySelector(".lc-table-foot");
    const emptyEl = card.querySelector(".lc-filter-empty");
    card.querySelector(".lc-table-scroll").hidden = n === 0;
    foot.hidden = n === 0;
    emptyEl.hidden = n !== 0;
    if (n === 0) emptyEl.querySelector("span").textContent = `No ${lcKind === "software" ? "software or licence" : "hardware"} items in this bucket.`;
    foot.innerHTML = n > limit
      ? `<span class="lc-table-foot__label">Showing ${expanded ? n : limit} of ${n} items</span><button class="btn btn-link btn-sm lc-expand" aria-expanded="${expanded}">${expanded ? "Show less" : `Show all ${n}`}${ICON("chevron-down")}</button>`
      : `Showing ${n} of ${n} items`;
  }
  function setupCollapse(card) { refreshCollapse(card); }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".lc-expand");
    if (!btn) return;
    const card = btn.closest(".lc-table-card");
    const expanded = card.classList.toggle("expanded");
    refreshCollapse(card);
    if (!expanded) card.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  });

  // Hardware / Software filter on the Lifecycle tables
  let lcKind = "all";
  function applyKindFilter(kind) {
    lcKind = kind;
    document.querySelectorAll("#lcRoot .lc-table-card[data-collapse]").forEach((card) => {
      card.querySelectorAll("tbody tr").forEach((r) => r.classList.toggle("lc-row-filtered", kind !== "all" && r.getAttribute("data-kind") !== kind));
      if (card.querySelector("tbody")) refreshCollapse(card);
    });
  }
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".lc-filter .tabgroup__tab");
    if (tab) applyKindFilter(tab.getAttribute("data-tab"));
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
    if (card) refreshCollapse(card);
  });

  /* ================= 5-year plan ================= */
  // Prepared once a year by the account director (quantity × estimated unit price per year), published read-only to the portal.
  const YEARS = [2026, 2027, 2028, 2029, 2030];
  const LINE_TYPES = { hardware: "Hardware", software: "Software & licences", service: "Services" };
  const BASIS = {
    quoted: ["Quoted", "pill-success", "Price from a vendor quote"],
    list: ["List price", "pill-neutral", "Today's vendor list price; later years include the expected yearly increase"],
    estimate: ["Estimate", "pill-brand", "Your account director's estimate of a future price (no vendor price yet)"],
  };
  // design-system chart palette, in priority order: the client's categories take colours 1, 2, 3… with no gaps
  let catColors = {};
  const catColor = (id) => catColors[id] || "var(--chart-8)";
  const eurK = (n) => {
    const k = n / 1000;
    return "€" + (k >= 1000 ? (k / 1000).toFixed(2).replace(/0$/, "") + "M" : k >= 100 ? Math.round(k) + "k" : (Math.round(k * 10) / 10) + "k");
  };
  const eur = (n) => "€" + n.toLocaleString("en-GB");
  const fmtLongDay = (s) => { const d = parseDate(s); return d.getDate() + " " + d.toLocaleString("en-GB", { month: "short" }) + " " + d.getFullYear(); };
  const linkedGroup = (lm, line) => line.replaces && lm.groups.find((g) => g.model === line.replaces || g.software === line.replaces);

  function planModel(c, type) {
    const lines = c.plan.lines.filter((l) => type === "all" || l.type === type).map((l) => {
      const amounts = l.y.map((v) => (v ? v[0] * v[1] : 0));
      return Object.assign({}, l, { amounts, total: amounts.reduce((a, b) => a + b, 0) });
    });
    const cats = window.PLAN_CATEGORIES.map(([id, label]) => {
      const ls = lines.filter((l) => l.cat === id);
      const sub = YEARS.map((_, i) => ls.reduce((s, l) => s + l.amounts[i], 0));
      return { id, label, lines: ls, sub, total: sub.reduce((a, b) => a + b, 0) };
    }).filter((x) => x.lines.length);
    const totals = YEARS.map((_, i) => cats.reduce((s, x) => s + x.sub[i], 0));
    const quoted = YEARS.map((_, i) => lines.filter((l) => l.basis === "quoted").reduce((s, l) => s + l.amounts[i], 0));
    return { lines, cats, totals, quoted, grand: totals.reduce((a, b) => a + b, 0) };
  }

  function planChart(c, pm, W) {
    const H = W < 560 ? 250 : 290, ML = 52, MR = 8, MT = 28, MB = 46, PW = W - ML - MR, PH = H - MT - MB;
    const acc = c.plan.accuracy;
    const prev = c.plan.prev.totals;
    const top = Math.max(1, ...pm.totals.map((t, i) => t * (1 + acc[i] / 100)), ...prev.filter((p) => p != null));
    const step = [10e3, 20e3, 25e3, 50e3, 100e3, 200e3, 250e3, 500e3, 1e6].find((s) => top / s <= 5) || 2e6;
    const max = Math.ceil(top / step) * step;
    const y = (v) => MT + PH - (v / max) * PH;
    const slot = PW / YEARS.length;
    const bw = Math.min(64, slot * 0.5);
    let grid = "";
    for (let v = 0; v <= max + 1; v += step) {
      grid += `<line class="plan-grid" x1="${ML}" x2="${W - MR}" y1="${y(v)}" y2="${y(v)}"/><text class="plan-axis" x="${ML - 10}" y="${y(v) + 4}" text-anchor="end">${v ? eurK(v) : "€0"}</text>`;
    }
    const bars = YEARS.map((yr, i) => {
      const cx = ML + slot * i + slot / 2;
      const x = cx - bw / 2;
      let base = 0;
      const segs = pm.cats.filter((k) => k.sub[i] > 0).map((k) => {
        const h = (k.sub[i] / max) * PH;
        const r = `<rect class="plan-seg" data-cat="${k.id}" x="${x}" y="${y(base) - h}" width="${bw}" height="${Math.max(h - 1, 0.5)}" style="fill:${catColor(k.id)}"/>`;
        base += k.sub[i];
        return r;
      }).join("");
      const t = pm.totals[i];
      const lo = y(t * (1 - acc[i] / 100));
      const hi = y(t * (1 + acc[i] / 100));
      const range = t ? `<g class="plan-range"><line x1="${cx}" x2="${cx}" y1="${lo}" y2="${hi}"/><line x1="${cx - 6}" x2="${cx + 6}" y1="${hi}" y2="${hi}"/><line x1="${cx - 6}" x2="${cx + 6}" y1="${lo}" y2="${lo}"/></g>` : "";
      const p = prev[i];
      const prevMark = p != null ? `<line class="plan-prev" x1="${x - 6}" x2="${x + bw + 6}" y1="${y(p)}" y2="${y(p)}"/>` : "";
      return `<g class="plan-col" data-i="${i}">
          <rect class="plan-hit" x="${ML + slot * i + 4}" y="${MT - 20}" width="${slot - 8}" height="${PH + 20}" rx="8"/>
          <g class="plan-bar" style="transition-delay:${reduceMotion ? 0 : 120 + i * 90}ms">${segs}</g>${range}${prevMark}
          <text class="plan-total" x="${cx}" y="${Math.min(hi, y(t)) - 8}" text-anchor="middle">${t ? eurK(t) : "—"}</text>
          <text class="plan-year" x="${cx}" y="${H - MB + 20}" text-anchor="middle">${yr}</text>
          <text class="plan-acc" x="${cx}" y="${H - MB + 37}" text-anchor="middle">±${acc[i]}%</text>
        </g>`;
    }).join("");
    return `<svg class="plan-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Planned budget per year, 2026 to 2030">${grid}${bars}</svg>`;
  }

  function planPop(c, pm, i) {
    const t = pm.totals[i];
    const a = c.plan.accuracy[i] / 100;
    const p = c.plan.prev.totals[i];
    const rows = pm.cats.filter((k) => k.sub[i] > 0).sort((k1, k2) => k2.sub[i] - k1.sub[i]).map((k) =>
      `<div class="lc-pop__row" data-cat="${k.id}"><i class="legend-dot" style="background:${catColor(k.id)}"></i><span class="lc-pop__text"><b>${esc(k.label)}</b><span>${k.lines.filter((l) => l.amounts[i]).map((l) => esc(l.item)).slice(0, 2).join(" · ")}</span></span><span class="lc-pop__count">${eurK(k.sub[i])}</span></div>`).join("");
    return `<div class="lc-pop__head">${YEARS[i]} · ${t ? `${eurK(t)} <span class="plan-pop__range">(range ${eurK(t * (1 - a))}–${eurK(t * (1 + a))})</span>` : "nothing planned"}</div>${rows}
      <div class="lc-pop__foot">${pm.quoted[i] ? `<b>${eurK(pm.quoted[i])}</b> quoted · ` : ""}${p != null ? `${esc(c.plan.prev.label)} estimate: <b>${eurK(p)}</b>` : `New year in this plan`}</div>`;
  }

  function planGrid(c, lm, pm) {
    if (!pm.lines.length) return `<div class="lc-table-empty">${ICON("check-circle", 18)}<span>No items of this type in the plan.</span></div>`;
    const cell = (l, i) => l.y[i] ? `<td class="num" data-col="${i}"><b>${eurK(l.amounts[i])}</b><span>${l.y[i][0]} × ${eur(l.y[i][1])}</span></td>` : `<td class="num plan-empty" data-col="${i}">—</td>`;
    const body = pm.cats.map((k) => `
        <tr class="plan-cat" data-cat="${k.id}" tabindex="0" aria-expanded="true">
          <td><span class="plan-cat__name">${ICON("chevron-down", 14)}<i class="legend-dot" style="background:${catColor(k.id)}"></i>${esc(k.label)} <span class="lc-count">(${k.lines.length})</span></span></td>
          ${k.sub.map((v, i) => `<td class="num" data-col="${i}">${v ? eurK(v) : "—"}</td>`).join("")}<td class="num">${eurK(k.total)}</td>
        </tr>${k.lines.map((l) => {
          const g = linkedGroup(lm, l);
          const devices = g ? `<p><b>Linked to ${g.count} ${g.count === 1 ? "device" : "devices"} in Lifecycle:</b> ${esc(g.rows.slice(0, 4).map((r) => r.host).join(", "))}${g.count > 4 ? ` and ${g.count - 4} more` : ""} · <button class="btn btn-link btn-sm" data-page="lifecycle" data-scroll="${{ act: "lcCardAct", plan: "lcCardPlan", budget: "lcCardBudget" }[g.bucket]}">Show in Lifecycle${ICON("arrow-up-right")}</button></p>` : "";
          return `
        <tr class="plan-line" data-cat="${k.id}" tabindex="0" aria-expanded="false">
          <td><b class="plan-line__item">${esc(l.item)}</b><span class="plan-line__meta">${l.replaces ? `Replaces ${esc(l.replaces)} · ` : ""}${LINE_TYPES[l.type]} <span class="pill ${BASIS[l.basis][1]}" data-tip="${esc(BASIS[l.basis][2])}">${BASIS[l.basis][0]}</span></span></td>
          ${YEARS.map((_, i) => cell(l, i)).join("")}<td class="num"><b>${eurK(l.total)}</b></td>
        </tr>
        <tr class="plan-detail" data-cat="${k.id}" hidden><td colspan="7"><p>${esc(l.note || "")}</p>${devices}</td></tr>`;
        }).join("")}`).join("");
    const acc = c.plan.accuracy;
    return `<div class="lc-table-scroll plan-scroll"><table class="lc-table plan-table">
        <thead><tr><th>Item</th>${YEARS.map((yr, i) => `<th class="num" data-col="${i}">${yr}</th>`).join("")}<th class="num">Total</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr class="plan-foot-total"><td>Total per year</td>${pm.totals.map((t, i) => `<td class="num" data-col="${i}">${t ? eurK(t) : "—"}</td>`).join("")}<td class="num">${eurK(pm.grand)}</td></tr>
          <tr class="plan-foot-range"><td>Likely range</td>${pm.totals.map((t, i) => `<td class="num" data-col="${i}">${t ? `${eurK(t * (1 - acc[i] / 100))}–${eurK(t * (1 + acc[i] / 100))}` : "—"}</td>`).join("")}<td></td></tr>
        </tfoot></table></div>`;
  }

  let planType = "all";
  function renderPlanBody(c, lm) {
    const pm = planModel(c, planType);
    $("planChart").innerHTML = planChart(c, pm, Math.max(300, $("planChart").clientWidth || 800)) + `<div class="lc-pop plan-pop" id="planPop" role="tooltip"></div>`;
    $("planChart").dataset.type = planType;
    $("planLegend").innerHTML = pm.cats.map((k) => `<span class="plan-legend__item" data-cat="${k.id}"><i class="legend-dot" style="background:${catColor(k.id)}"></i>${esc(k.label)}</span>`).join("")
      + `<span class="plan-legend__key"><i class="plan-key plan-key--prev"></i>${esc(c.plan.prev.label)} estimate</span><span class="plan-legend__key"><i class="plan-key plan-key--range"></i>Likely range</span>`;
    $("planGrid").innerHTML = planGrid(c, lm, pm);
    enhance($("planGrid"));
  }

  function renderPlan(c, lm) {
    const pl = c.plan;
    const pm = planModel(c, "all");
    catColors = {};
    pm.cats.forEach((k, i) => (catColors[k.id] = `var(--chart-${i + 1})`));
    const prevSum = pl.prev.totals.reduce((s, p) => s + (p || 0), 0);
    const nowSum = pm.totals.reduce((s, t, i) => s + (pl.prev.totals[i] != null ? t : 0), 0);
    const diff = nowSum - prevSum;
    const peak = pm.totals.indexOf(Math.max(...pm.totals));
    const drift = lm.groups.filter((g) => !pl.lines.some((l) => l.replaces && (l.replaces === g.model || l.replaces === g.software)));
    const owner = "Roel Ottenheijm";
    $("planSub").innerHTML = `<span class="page-head__live">${ICON("user", 14)}Prepared by ${owner}, account director</span><span class="dot-sep"></span><span>Published ${fmtLongDay(pl.published)}</span><span class="dot-sep"></span><span>Next review ${esc(pl.nextReview)}</span>`;
    const changeRows = YEARS.map((yr, i) => {
      const p = pl.prev.totals[i];
      const d = p == null ? null : pm.totals[i] - p;
      const pill = d == null ? `<span class="pill pill-brand">New</span>` : Math.abs(d) < 50 ? `<span class="pill pill-neutral">No change</span>`
        : `<span class="pill ${d > 0 ? "pill-orange" : "pill-success"}">${d > 0 ? "+" : "−"}${eurK(Math.abs(d))}</span>`;
      return `<tr><td><b>${yr}</b></td><td class="num">${p == null ? "—" : eurK(p)}</td><td class="num"><b>${eurK(pm.totals[i])}</b></td><td>${pill}</td><td class="plan-why">${esc(pl.changes[i])}</td></tr>`;
    }).join("");
    $("planRoot").innerHTML = `
        <div class="card plan-summary">
          <div class="card__head">
            <div class="card__title">${ICON("euro", 16)}Budget plan ${YEARS[0]}–${YEARS[YEARS.length - 1]}</div>
            <div class="plan-summary__actions">
              <button class="btn btn-secondary" data-toast="Plan ${YEARS[0]} exported for Finance: ${esc(c.name.replace(/\s+/g, "_"))}_5-year-plan.xlsx">${ICON("file")}Download for Finance</button>
              <button class="btn btn-secondary" data-toast="Meeting request sent to ${owner} to discuss the 5-year plan">${ICON("email", 16)}Discuss with ${owner.split(" ")[0]}</button>
            </div>
          </div>
          <div class="card__body">
            <div class="kpi-grid kpi-grid--4 plan-tiles">
              ${tile({ title: `This year (${YEARS[0]})`, value: Math.round(pm.totals[0] / 1000), prefix: "€", suffix: "k", scroll: "planGridCard",
                label: `<b>${eurK(pm.quoted[0])}</b> quoted · ±${pl.accuracy[0]}%`, tileTip: "The amount to budget this year. Most of it is quoted or at today's list price." })}
              ${tile({ title: "5-year total", value: Math.round(pm.grand / 1000), prefix: "€", suffix: "k", scroll: "planGridCard",
                label: `${YEARS[0]}–${YEARS[YEARS.length - 1]} · all costs`, tileTip: "Hardware, software and licences, and services across the five years" })}
              ${tile({ title: "Peak year", value: Math.round(pm.totals[peak] / 1000), prefix: "€", suffix: "k", scroll: "planChartCard",
                label: `in <b>${YEARS[peak]}</b> · ±${pl.accuracy[peak]}%`, tileTip: "The most expensive year. Consider bringing items forward to spread the cost." })}
              ${tile({ title: `vs. ${pl.prev.label}`, value: Math.round(Math.abs(diff) / 1000), prefix: (diff >= 0 ? "+" : "−") + "€", suffix: "k", scroll: "planChanges",
                label: `on ${YEARS[0]}–${YEARS[3]} · <b>${diff >= 0 ? "+" : "−"}${Math.abs(Math.round((diff / prevSum) * 100))}%</b>`, tileTip: "How much the years covered by both plans changed since last year's plan" })}
            </div>
          </div>
        </div>
        ${drift.length ? `<div class="plan-drift">${ICON("alert", 18)}<div><b>${drift.length} ${drift.length === 1 ? "item" : "items"} from Lifecycle ${drift.length === 1 ? "isn't" : "aren't"} in this plan yet</b>
            <span>${drift.map((g) => `${esc(glabel(g))} on ${esc(g.model)} (${ACTIONS[g.action].label.toLowerCase()}, support ends ${g.dates[2]})`).join(" · ")}. Added after the plan was published; ${owner.split(" ")[0]} will price it at the next review.</span></div>
            <button class="btn btn-secondary btn-sm" data-toast="Asked ${owner} to add ${esc(drift.map((g) => glabel(g)).join(", "))} to the plan">Ask to add it</button></div>` : ""}
        <div class="card" id="planChartCard">
          <div class="card__head">
            <div class="card__title">${ICON("activity", 15)}Budget per year</div>
            <div class="plan-filter" data-tabs>
              <div class="tabgroup">
                <button class="tabgroup__tab active" data-tab="all">All costs</button>
                <button class="tabgroup__tab" data-tab="hardware">Hardware</button>
                <button class="tabgroup__tab" data-tab="software">Software &amp; licences</button>
                <button class="tabgroup__tab" data-tab="service">Services</button>
              </div>
            </div>
          </div>
          <div class="card__body">
            <div class="plan-chart" id="planChart"></div>
            <div class="plan-legend" id="planLegend"></div>
          </div>
        </div>
        <div class="lc-table-card" id="planGridCard">
          <div class="lc-table-head">
            <div class="lc-table-title">Plan by category</div>
            <span class="lc-info" data-tip="Same layout as the spreadsheet: quantity × unit price per year. Click a row for the reasoning and the linked devices.">${ICON("info")}</span>
          </div>
          <div id="planGrid"></div>
          <div class="lc-table-foot plan-note">All amounts in euros, excluding VAT. ${YEARS[0]} uses quotes and current list prices; later years are ${owner.split(" ")[0]}'s estimate of future prices, so each year gets more accurate as it gets closer.</div>
        </div>
        <div class="lc-table-card" id="planChanges">
          <div class="lc-table-head">
            <div class="lc-table-title">What changed since ${esc(pl.prev.label)}</div>
            <span class="lc-info" data-tip="Each year's estimate is revised at every yearly review. This shows how and why.">${ICON("info")}</span>
          </div>
          <div class="lc-table-scroll"><table class="lc-table plan-changes">
            <thead><tr><th>Year</th><th class="num">${esc(pl.prev.label)}</th><th class="num">This plan</th><th>Change</th><th>Why</th></tr></thead>
            <tbody>${changeRows}</tbody>
          </table></div>
        </div>`;
    planType = "all";
    renderPlanBody(c, lm);
  }

  function animatePlan(root) {
    const chart = root.querySelector(".plan-chart");
    if (!chart) return;
    chart.classList.remove("drawn");
    void chart.getBoundingClientRect();
    requestAnimationFrame(() => chart.classList.add("drawn"));
  }

  // redraw the chart at its new width
  let planResizeTimer;
  window.addEventListener("resize", () => {
    if (currentPage !== "plan") return;
    clearTimeout(planResizeTimer);
    planResizeTimer = setTimeout(() => {
      renderPlanBody(client, lifecycleModel(client));
      $("planChart").classList.add("drawn");
    }, 150);
  });
  // filter: All / Hardware / Software & licences / Services (chart + grid)
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".plan-filter .tabgroup__tab");
    if (!tab) return;
    planType = tab.getAttribute("data-tab");
    renderPlanBody(client, lifecycleModel(client));
    animatePlan($("planRoot"));
  });
  // chart hover: popover per year; legend hover: highlight one category
  document.addEventListener("mouseover", (e) => {
    const col = e.target.closest(".plan-col");
    const chart = e.target.closest(".plan-chart");
    if (chart) {
      const pop = $("planPop");
      chart.querySelectorAll(".plan-col").forEach((g) => g.classList.toggle("is-active", g === col));
      chart.classList.toggle("has-active", !!col);
      if (!col) { pop.classList.remove("show"); return; }
      const i = +col.getAttribute("data-i");
      pop.innerHTML = planPop(client, planModel(client, planType), i);
      const seg = e.target.closest(".plan-seg");
      pop.querySelectorAll(".lc-pop__row").forEach((r) => r.classList.toggle("is-active", !!seg && r.getAttribute("data-cat") === seg.getAttribute("data-cat")));
      pop.classList.toggle("has-active", !!seg);
      const cw = chart.clientWidth;
      const x = 52 + ((i + 0.5) / YEARS.length) * (cw - 60);
      pop.classList.toggle("left", x > cw * 0.6);
      pop.style.left = x + "px";
      pop.classList.add("show");
    }
    const leg = e.target.closest(".plan-legend__item");
    const legend = e.target.closest(".plan-legend");
    if (legend) {
      const cat = leg ? leg.getAttribute("data-cat") : "";
      const ch = $("planChart");
      ch.classList.toggle("has-cat", !!cat);
      ch.querySelectorAll(".plan-seg").forEach((s) => s.classList.toggle("is-hl", s.getAttribute("data-cat") === cat));
    }
  });
  document.addEventListener("mouseout", (e) => {
    const chart = e.target.closest(".plan-chart");
    if (chart && !chart.contains(e.relatedTarget)) {
      chart.classList.remove("has-active");
      chart.querySelectorAll(".plan-col").forEach((g) => g.classList.remove("is-active"));
      $("planPop").classList.remove("show");
    }
    const legend = e.target.closest(".plan-legend");
    if (legend && !legend.contains(e.relatedTarget)) $("planChart").classList.remove("has-cat");
  });
  // click a year: jump to that column in the grid
  document.addEventListener("click", (e) => {
    const col = e.target.closest(".plan-col");
    if (!col) return;
    const i = col.getAttribute("data-i");
    scrollToSection("planGridCard");
    document.querySelectorAll(`#planGrid [data-col="${i}"]`).forEach((td) => {
      td.classList.remove("col-flash");
      void td.offsetWidth;
      td.classList.add("col-flash");
    });
  });
  // grid: collapse a category, open a line's reasoning
  function toggleGridRow(tr) {
    if (tr.classList.contains("plan-cat")) {
      const open = tr.getAttribute("aria-expanded") !== "true";
      tr.setAttribute("aria-expanded", String(open));
      let n = tr.nextElementSibling;
      while (n && !n.classList.contains("plan-cat")) {
        if (n.classList.contains("plan-line")) { n.hidden = !open; if (!open) n.setAttribute("aria-expanded", "false"); }
        else n.hidden = true;
        n = n.nextElementSibling;
      }
    } else {
      const open = tr.getAttribute("aria-expanded") !== "true";
      tr.setAttribute("aria-expanded", String(open));
      tr.nextElementSibling.hidden = !open;
    }
  }
  document.addEventListener("click", (e) => {
    const tr = e.target.closest(".plan-cat, .plan-line");
    if (!tr || e.target.closest(".pill")) return;
    toggleGridRow(tr);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".plan-cat, .plan-line")) {
      e.preventDefault();
      toggleGridRow(e.target);
    }
  });

  /* ================= Devices ================= */
  const STATUS = {
    unsupported: '<span class="pill pill-disaster">Unsupported · replace now</span>', act: '<span class="pill pill-critical">Replace within 3 months</span>',
    plan: '<span class="pill pill-high">Plan replacement</span>', budget: '<span class="pill pill-medium">Budget &amp; schedule</span>', ok: '<span class="pill pill-low">Supported</span>',
  };
  let devicesShown = 0;
  function renderDevices(c, lm) {
    const rows = [];
    const status = (g, r) => {
      if (g.kind !== "software") return r.unsupported ? STATUS.unsupported : STATUS[g.bucket];
      const verb = ACTIONS[g.action].label;
      if (r.unsupported) return `<span class="pill pill-disaster">Unsupported ${g.action === "renew" ? "licence" : "OS"} · ${verb.toLowerCase()} now</span>`;
      const tone = { act: "pill-critical", plan: "pill-high", budget: "pill-medium" }[g.bucket];
      const when = { act: "within 3 months", plan: "within 3–6 months", budget: "next year" }[g.bucket];
      return `<span class="pill ${tone}">${verb} ${when}</span>`;
    };
    lm.groups.forEach((g) => g.rows.slice(0, 2).forEach((r) => rows.push([r.id, g.model, r.host, g.kind === "software" ? `${g.os} ${g.osver}` : g.os, r.site, status(g, r)])));
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
      [urgentCaseRows(cs).length ? "al-sev-card--alert" : "", "sev-disaster", "alert-triangle", urgentCaseRows(cs).length, "P1 or P2"],
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
    renderPlan(client, lm);
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
  const pages = ["overview", "lifecycle", "plan", "devices", "alarms", "cves", "cases", "uptime"].reduce((acc, p) => {
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
  const PARENT_PAGE = { plan: "lifecycle" }; // sub-views keep their sidebar item highlighted
  function navigate(page, keepScroll) {
    currentPage = page;
    document.querySelectorAll(".sidebar__item[data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === (PARENT_PAGE[page] || page)));
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
      if (page === "plan") {
        renderPlanBody(client, lifecycleModel(client)); // the chart is drawn at its real width
        animatePlan(target);
        refreshIndicators();
      }
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
