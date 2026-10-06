// ============================================================
// Conscia Landing Zone — Bernhoven dashboard prototype (v2)
// Vanilla JS: page routing, tooltips, toasts, count-ups, sparklines,
// tab groups, chart entrance animations and simulated interactions.
// ============================================================

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Toasts ---------------- */
  const toastStack = document.getElementById("toastStack");
  function toast(message, opts = {}) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<svg width="15" height="15"><use href="#i-check-circle"/></svg><span></span>`;
    el.querySelector("span").textContent = message;
    toastStack.appendChild(el);
    const life = opts.life || 2600;
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 220);
    }, life);
  }

  /* ---------------- Tooltip ---------------- */
  const tooltipEl = document.getElementById("tooltip");
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

  document.querySelectorAll("[data-tip]").forEach((el) => {
    el.addEventListener("mouseenter", () => showTooltip(el, el.getAttribute("data-tip")));
    el.addEventListener("mouseleave", hideTooltip);
  });
  // info icons explain, they don't navigate
  document.querySelectorAll(".kpi-tile__info").forEach((el) => {
    el.addEventListener("click", (e) => e.stopPropagation());
  });
  window.addEventListener("scroll", () => tooltipTarget && hideTooltip(), { passive: true });

  /* ---------------- Generic data-toast triggers ---------------- */
  document.querySelectorAll("[data-toast]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      toast(el.getAttribute("data-toast"));
    });
  });

  /* ---------------- Dropdowns (notifications / account) ---------------- */
  function setupDropdown(btnId, dropId) {
    const btn = document.getElementById(btnId);
    const drop = document.getElementById(dropId);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !drop.classList.contains("open");
      closeAllDropdowns();
      if (willOpen) drop.classList.add("open");
    });
  }
  function closeAllDropdowns() {
    document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
  }
  setupDropdown("notifBtn", "notifDropdown");
  setupDropdown("userBtn", "userDropdown");
  document.addEventListener("click", closeAllDropdowns);

  document.getElementById("clientSwitch").addEventListener("click", (e) => {
    e.stopPropagation();
    toast("Only Bernhoven is available in this prototype");
  });
  document.getElementById("brandBtn").addEventListener("click", () => navigate("overview"));
  document.getElementById("helpBtn").addEventListener("click", () => {
    toast("Docs and the Conscia knowledge base would open here");
    closeMobileSidebar();
  });

  /* ---------------- Topbar action buttons ---------------- */
  document.getElementById("btnIncident").addEventListener("click", () => {
    toast("Incident report started — the Conscia SOC has been notified");
  });
  document.getElementById("btnRequest").addEventListener("click", () => {
    toast("Service request form opened in ServiceNow");
  });

  /* ---------------- Generate summary drawer ---------------- */
  const reportDrawerBackdrop = document.getElementById("reportDrawerBackdrop");
  const reportDrawerSkeleton = document.getElementById("reportDrawerSkeleton");
  const reportDrawerReport = document.getElementById("reportDrawerReport");
  const reportDrawerInput = document.getElementById("reportDrawerInput");
  const drawerInputWrap = document.getElementById("drawerInputWrap");

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
  function closeReportDrawer() {
    reportDrawerBackdrop.classList.remove("open");
  }

  document.getElementById("btnGenerate").addEventListener("click", openReportDrawer);
  document.getElementById("reportDrawerClose").addEventListener("click", closeReportDrawer);
  reportDrawerBackdrop.addEventListener("click", (e) => {
    if (e.target === reportDrawerBackdrop) closeReportDrawer();
  });

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
    document.getElementById("reportDrawerBody").scrollTo({ top: 999999, behavior: "smooth" });
  }
  document.getElementById("reportDrawerSend").addEventListener("click", submitDrawerPrompt);
  reportDrawerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitDrawerPrompt();
    }
  });

  /* ---------------- Generic named modal openers ---------------- */
  document.querySelectorAll("[data-open-modal]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const backdrop = document.getElementById(el.getAttribute("data-open-modal") + "Backdrop");
      if (backdrop) backdrop.classList.add("open");
    });
  });

  /* ---------------- Upgrade SLA tier modal (unlocks Alarms) ---------------- */
  const upgradeModalBackdrop = document.getElementById("upgradeModalBackdrop");
  function closeUpgradeModal() { upgradeModalBackdrop.classList.remove("open"); }
  document.getElementById("upgradeModalCloseX").addEventListener("click", closeUpgradeModal);
  document.getElementById("upgradeCancelBtn").addEventListener("click", closeUpgradeModal);
  upgradeModalBackdrop.addEventListener("click", (e) => {
    if (e.target === upgradeModalBackdrop) closeUpgradeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (reportDrawerBackdrop.classList.contains("open")) closeReportDrawer();
    if (upgradeModalBackdrop.classList.contains("open")) closeUpgradeModal();
    closeAllDropdowns();
  });

  let alarmsUnlocked = false;
  function unlockAlarms() {
    if (alarmsUnlocked) return;
    alarmsUnlocked = true;
    [["alarmsCardBody", "alarmsCardOverlay"], ["alarmsBody", "alarmsOverlayPage"]].forEach(([bodyId, overlayId]) => {
      const body = document.getElementById(bodyId);
      body.classList.remove("blurred");
      body.removeAttribute("aria-hidden");
      document.getElementById(overlayId).classList.add("hidden");
    });
    animateCounts(document.getElementById("alarmsCardBody"));
  }

  document.getElementById("upgradeConfirmBtn").addEventListener("click", () => {
    closeUpgradeModal();
    unlockAlarms();
    toast("Upgraded to Standard tier — Alarms unlocked");
  });

  /* ---------------- Consultant chat widget ---------------- */
  const chatWidget = document.getElementById("chatWidget");
  const chatPanelBody = document.getElementById("chatPanelBody");
  const chatInput = document.getElementById("chatInput");
  const chatInputWrap = document.getElementById("chatInputWrap");

  const chatReplies = [
    "Good question — let me pull that up. In the meantime, the fastest win is approving the ASA5506 replacement (REQ0089301): it clears the critical CVE and the Security uptime dip in one move.",
    "I'll flag that with Roel, your account director. For the €84k End-of-Life spend, I'd book it as unplanned capex now so it doesn't surprise your CFO next quarter.",
    "That's on our radar too. Once the new firewalls are in, the Security layer should be back above the 99% SLA within a week.",
  ];
  let chatReplyIndex = 0;

  function openChatWidget() {
    chatWidget.classList.add("expanded");
    chatPanelBody.scrollTo({ top: 999999 });
  }
  function minimizeChatWidget() {
    chatWidget.classList.remove("expanded");
  }
  document.getElementById("chatWidgetPill").addEventListener("click", openChatWidget);
  document.getElementById("chatPanelMinimize").addEventListener("click", minimizeChatWidget);

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
    return row;
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

    setTimeout(() => {
      typingRow.remove();
      addChatMessage(chatReplies[chatReplyIndex % chatReplies.length], "them");
      chatReplyIndex++;
    }, 1100 + Math.random() * 500);
  }
  document.getElementById("chatSend").addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  /* ---------------- Tab groups (pill tabs + sliding indicator) ---------------- */
  function moveIndicator(group) {
    const ind = group.querySelector(".tabgroup__ind");
    const active = group.querySelector(".tabgroup__tab.active");
    if (!ind || !active || !active.offsetWidth) return;
    ind.style.width = active.offsetWidth + "px";
    ind.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
  }
  document.querySelectorAll("[data-tabs]").forEach((scope) => {
    const group = scope.querySelector(".tabgroup");
    const ind = document.createElement("span");
    ind.className = "tabgroup__ind";
    group.prepend(ind);
    group.classList.add("has-ind");
    group.querySelectorAll(".tabgroup__tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        group.querySelectorAll(".tabgroup__tab").forEach((t) => t.classList.toggle("active", t === tab));
        scope.querySelectorAll("[data-tab-panel]").forEach((p) => {
          p.hidden = p.getAttribute("data-tab-panel") !== tab.getAttribute("data-tab");
        });
        moveIndicator(group);
      });
    });
  });
  function refreshIndicators() {
    document.querySelectorAll(".tabgroup.has-ind").forEach(moveIndicator);
  }
  window.addEventListener("resize", refreshIndicators);

  /* ---------------- Sparklines (SOC tiles) ---------------- */
  // Curves sampled from the Figma sparkline exports (assets/spark-1.svg pulses, assets/spark-2.svg wave),
  // window x 16–301 = the slice the Figma tile actually shows (576px-wide image at left:-16px):
  // 0 = top of the line band, 1 = bottom. Every wave tile reuses the same curve, as in the design.
  const SPARK_SHAPES = {
    pulse: [1,1,1,1,1,0.997,0.965,0.672,0.348,0.052,0.019,0.016,0.024,0.137,0.499,0.862,0.99,1,1,1,1,1,1,1,1,1,1,0.998,0.968,0.8,0.616,0.433,0.249,0.066,0.006,0,0.01,0.106,0.306,0.506,0.705,0.905,0.991,1,1,1,1,1,1,0.996,0.956,0.84,0.725,0.609,0.493,0.378,0.262,0.146,0.034,0.003,0,0.004,0.045,0.138,0.231,0.323,0.394,0.407,0.407,0.407,0.407,0.407,0.407,0.415,0.479,0.602,0.726,0.849,0.968,0.997,1,1,1,1.0,0.983,0.895,0.783,0.671,0.559,0.447,0.335,0.223,0.146,0.134,0.146,0.228,0.362,0.496,0.63,0.763,0.897,0.987,1.0,1,1,1,1,1,1,1,0.997,0.968,0.843,0.714,0.584,0.455,0.325,0.196,0.067,0.007],
    wave: [0.02,0.01,0.0,0.002,0.026,0.068,0.11,0.151,0.185,0.196,0.196,0.196,0.196,0.196,0.196,0.209,0.23,0.252,0.273,0.29,0.287,0.267,0.246,0.226,0.205,0.184,0.163,0.142,0.121,0.102,0.098,0.115,0.145,0.157,0.158,0.158,0.164,0.192,0.25,0.353,0.47,0.587,0.703,0.791,0.837,0.857,0.856,0.833,0.784,0.691,0.575,0.485,0.434,0.389,0.344,0.299,0.254,0.21,0.187,0.185,0.203,0.228,0.252,0.276,0.301,0.325,0.349,0.382,0.418,0.454,0.49,0.526,0.562,0.598,0.619,0.621,0.621,0.621,0.62,0.601,0.562,0.521,0.48,0.444,0.428,0.435,0.463,0.522,0.604,0.687,0.771,0.854,0.932,0.979,1.0,0.999,0.987,0.975,0.963,0.946,0.929,0.912,0.896,0.879,0.862,0.845,0.829,0.812,0.803,0.803,0.803,0.803,0.803,0.803,0.798,0.771,0.716,0.619,0.513,0.411],
  };
  // Per tile: which curve, and the value at the top (0) and bottom (1) of its band — used for the hover read-out.
  const SPARK_SCALE = {
    openIncidents: { shape: "pulse", top: 2, bottom: 0, decimals: 0 },
    incidentTrend: { shape: "wave", top: 14.5, bottom: 8.5, decimals: 0 },
    threatPressure: { shape: "wave", top: 9, bottom: 2, decimals: 0 },
    slaAdherence: { shape: "wave", top: 100, bottom: 99, decimals: 0 },
    avgTriage: { shape: "wave", top: 11, bottom: 6, decimals: 1 },
  };
  const TODAY = new Date(2026, 4, 26);
  const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  function sparkPaths(shape, W, H, band) {
    // band = [top, bottom] in viewBox units: the line lives in this strip, the fill runs to the bottom
    const pts = shape.map((v, i) => [(i / (shape.length - 1)) * W, band[0] + v * (band[1] - band[0])]);
    const line = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
    return { line, area: `${line}L${W},${H}L0,${H}Z`, pts };
  }

  document.querySelectorAll(".spark[data-spark]").forEach((el) => {
    const key = el.getAttribute("data-spark");
    const scale = SPARK_SCALE[key];
    if (!scale) return;
    const shape = SPARK_SHAPES[scale.shape];
    const W = 300;
    const H = 72;
    const band = scale.shape === "pulse" ? [7, H - 2] : [4, 37];
    const { line, area, pts } = sparkPaths(shape, W, H, band);
    el.classList.add("spark--" + (el.getAttribute("data-tone") || "brand"));
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="spark__area" d="${area}"/><path class="spark__line" d="${line}"/></svg><span class="spark__cursor"></span><span class="spark__dot"></span>`;
    const cursor = el.querySelector(".spark__cursor");
    const dot = el.querySelector(".spark__dot");
    const unit = el.getAttribute("data-unit") || "";
    const days = 30;

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
      day.setDate(TODAY.getDate() - Math.round((1 - frac) * (days - 1)));
      const value = scale.top + shape[i] * (scale.bottom - scale.top);
      showTooltipAt(r.left + (xPct / 100) * r.width, r.top + (yPct / 100) * r.height - 4, `${fmtDay(day)} · ${value.toFixed(scale.decimals)} ${unit}`);
    });
    el.addEventListener("mouseleave", () => {
      el.classList.remove("hovering");
      hideTooltip();
    });
  });

  function drawSparks(root) {
    root.querySelectorAll(".spark").forEach((el, i) => {
      el.classList.remove("drawn");
      el.querySelector("svg").style.transitionDelay = reduceMotion ? "0ms" : 120 + i * 70 + "ms";
      void el.offsetWidth;
      requestAnimationFrame(() => el.classList.add("drawn"));
    });
  }

  /* ---------------- Lifecycle donut ---------------- */
  const DONUT_C = 2 * Math.PI * 50; // 314.16
  function animateDonut(root) {
    root.querySelectorAll(".lc-donut__seg[data-dash]").forEach((seg, i) => {
      const dash = parseFloat(seg.getAttribute("data-dash"));
      seg.style.strokeDashoffset = seg.getAttribute("data-offset");
      seg.style.transitionDelay = reduceMotion ? "0ms" : 150 + i * 160 + "ms";
      seg.style.strokeDasharray = `0 ${DONUT_C}`;
      void seg.getBoundingClientRect();
      requestAnimationFrame(() => {
        seg.style.strokeDasharray = `${dash} ${DONUT_C - dash}`;
      });
    });
  }

  /* ---------------- Sidebar navigation / routing ---------------- */
  const pages = ["overview", "lifecycle", "devices", "alarms", "cves", "cases", "uptime"].reduce((acc, p) => {
    acc[p] = document.getElementById("page-" + p);
    return acc;
  }, {});
  const pageGeneric = document.getElementById("page-generic");
  const genericTitle = document.getElementById("genericTitle");
  const genericHeading = document.getElementById("genericHeading");
  const genericSub = document.getElementById("genericSub");

  const pageMeta = {
    recommendations: { label: "Recommendations", sub: "Conscia's prioritised improvement plan for Bernhoven will live here. Start with the Actions required on the Overview." },
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

  function navigate(page) {
    document.querySelectorAll(".sidebar__item[data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    Object.values(pages).forEach((p) => (p.style.display = "none"));
    pageGeneric.style.display = "none";

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
      pageGeneric.style.display = "";
      const meta = pageMeta[page] || { label: page.charAt(0).toUpperCase() + page.slice(1) };
      genericTitle.textContent = meta.label;
      genericHeading.textContent = meta.label;
      genericSub.textContent = meta.sub || "This section isn't wired up in this prototype — it's focused on the Overview from the Figma file.";
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    closeMobileSidebar();
    hideTooltip();
  }

  /* ---------------- Mobile sidebar (hamburger) ---------------- */
  const sidebarEl = document.getElementById("sidebar");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const menuBtn = document.getElementById("menuBtn");

  function openMobileSidebar() {
    sidebarEl.classList.add("open");
    sidebarBackdrop.classList.add("open");
  }
  function closeMobileSidebar() {
    sidebarEl.classList.remove("open");
    sidebarBackdrop.classList.remove("open");
  }
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sidebarEl.classList.contains("open")) closeMobileSidebar();
    else openMobileSidebar();
  });
  sidebarBackdrop.addEventListener("click", closeMobileSidebar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebarEl.classList.contains("open")) closeMobileSidebar();
  });

  document.querySelectorAll("[data-page]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      navigate(el.getAttribute("data-page"));
    });
  });

  // data-scroll="id": bring a section into view (after navigating, if data-page is set) and flash it briefly
  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    target.classList.remove("flash");
    void target.offsetWidth;
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 1600);
  }
  document.querySelectorAll("[data-scroll]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = el.getAttribute("data-scroll");
      // let navigate() show the page (and its entrance animation) before scrolling
      setTimeout(() => scrollToSection(id), el.hasAttribute("data-page") ? 120 : 0);
    });
  });

  // clickable tiles are divs: make them reachable and operable from the keyboard
  document.querySelectorAll("[data-page], [data-toast], [data-scroll]").forEach((el) => {
    if (el.matches("button, a, input, select, textarea")) return;
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });

  /* ---------------- Lifecycle / Devices page: row checkboxes ---------------- */
  document.querySelectorAll(".lc-checkbox").forEach((cb) => {
    if (cb.hasAttribute("data-check-all")) return;
    cb.setAttribute("aria-label", "Select row");
    cb.addEventListener("click", (e) => {
      e.stopPropagation();
      cb.classList.toggle("checked");
    });
  });
  document.querySelectorAll("[data-check-all]").forEach((headCb) => {
    headCb.addEventListener("click", (e) => {
      e.stopPropagation();
      const tbody = document.getElementById(headCb.getAttribute("data-check-all"));
      const willCheck = !headCb.classList.contains("checked");
      headCb.classList.toggle("checked", willCheck);
      tbody.querySelectorAll(".lc-checkbox").forEach((cb) => cb.classList.toggle("checked", willCheck));
    });
  });

  /* ---------------- Lifecycle: investment breakdown ---------------- */
  const investToggle = document.getElementById("investToggle");
  if (investToggle) {
    const panel = document.getElementById("investBreakdown");
    investToggle.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      investToggle.setAttribute("aria-expanded", String(open));
      investToggle.firstChild.textContent = open ? "Hide breakdown" : "View breakdown";
      if (open) panel.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------- Lifecycle tables: show the first N rows, expand on demand ---------------- */
  function applyCollapse(card) {
    const limit = parseInt(card.getAttribute("data-collapse"), 10);
    const rows = [...card.querySelectorAll("tbody tr")];
    const expanded = card.classList.contains("expanded");
    rows.forEach((r, i) => r.classList.toggle("lc-row-collapsed", !expanded && i >= limit));
    const label = card.querySelector(".lc-table-foot__label");
    if (label) label.textContent = `Showing ${expanded ? rows.length : Math.min(limit, rows.length)} of ${rows.length} devices`;
  }
  document.querySelectorAll(".lc-table-card[data-collapse]").forEach((card) => {
    const limit = parseInt(card.getAttribute("data-collapse"), 10);
    const total = card.querySelectorAll("tbody tr").length;
    if (total <= limit) return;
    const foot = card.querySelector(".lc-table-foot");
    foot.innerHTML = `<span class="lc-table-foot__label"></span><button class="btn btn-link btn-sm lc-expand">Show all ${total}<svg width="16" height="16"><use href="#i-chevron-down"/></svg></button>`;
    const btn = foot.querySelector(".lc-expand");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const expanded = card.classList.toggle("expanded");
      btn.setAttribute("aria-expanded", String(expanded));
      btn.firstChild.textContent = expanded ? "Show less" : `Show all ${total}`;
      applyCollapse(card);
      if (!expanded) card.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    });
    applyCollapse(card);
  });

  /* ---------------- Lifecycle page: sortable ID column ---------------- */
  document.querySelectorAll(".lc-th-sort").forEach((th) => {
    th.addEventListener("click", () => {
      const tbody = document.getElementById(th.getAttribute("data-sort-table"));
      const rows = [...tbody.querySelectorAll("tr")];
      const desc = !th.classList.contains("sort-desc");
      rows.sort((a, b) => {
        const av = parseInt(a.getAttribute("data-id"), 10);
        const bv = parseInt(b.getAttribute("data-id"), 10);
        return desc ? bv - av : av - bv;
      });
      rows.forEach((r) => tbody.appendChild(r));
      th.classList.toggle("sort-desc", desc);
      const card = th.closest(".lc-table-card[data-collapse]");
      if (card && card.querySelector(".lc-expand")) applyCollapse(card);
    });
  });

  /* ---------------- Devices page: pagination (visual, prototype-scope) ---------------- */
  document.querySelectorAll(".lc-page-btn[data-lc-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-lc-page");
      if (val === "prev" || val === "next") {
        toast("This prototype only has live data for page 1");
        return;
      }
      document.querySelectorAll(".lc-page-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      toast(`Loading page ${val} — devices ${(val - 1) * 18 + 1}–${val * 18}…`);
    });
  });
  const lcPerPage = document.getElementById("lcPerPage");
  if (lcPerPage) {
    lcPerPage.addEventListener("change", () => {
      toast(`Showing ${lcPerPage.value} items per page`);
    });
  }

  /* ---------------- Alarms page ---------------- */
  const alTabActive = document.getElementById("alTabActive");
  const alTabAll = document.getElementById("alTabAll");
  const alTableBody = document.getElementById("alTableBody");
  const alEmptyState = document.getElementById("alEmptyState");
  const alTableFoot = document.getElementById("alTableFoot");
  const alFilterText = document.getElementById("alFilterText");
  const alFilterSite = document.getElementById("alFilterSite");
  const alFilterSeverity = document.getElementById("alFilterSeverity");
  const alFilterSource = document.getElementById("alFilterSource");

  if (alTableBody) {
    // Build a "..." actions menu for every row, reusing the dropdown pattern used elsewhere.
    alTableBody.querySelectorAll("tr").forEach((row) => {
      const cell = row.querySelector(".al-actions-cell");
      const hostname = row.querySelector(".al-link")?.textContent || "this alarm";
      cell.innerHTML = `
        <button class="al-actions-btn" aria-label="Row actions"><svg width="16" height="16"><use href="#i-more"/></svg></button>
        <div class="dropdown">
          <div class="dropdown-item" data-al-action="ack">Acknowledge</div>
          <div class="dropdown-item" data-al-action="view">View incident</div>
          <div class="dropdown-item" data-al-action="copy">Copy hostname</div>
        </div>`;
      const btn = cell.querySelector(".al-actions-btn");
      const menu = cell.querySelector(".dropdown");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains("open");
        closeAllDropdowns();
        if (willOpen) menu.classList.add("open");
      });
      menu.querySelectorAll("[data-al-action]").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          menu.classList.remove("open");
          const action = item.getAttribute("data-al-action");
          if (action === "ack") {
            row.classList.add("al-acknowledged");
            toast(`Acknowledged: ${hostname}`);
          } else if (action === "view") {
            toast(`Opening incident details for ${hostname}`);
          } else if (action === "copy") {
            toast(`Copied "${hostname}" to clipboard`);
          }
        });
      });
    });
    function applyAlarmFilters() {
      const showAll = alTabAll.classList.contains("active");
      const q = alFilterText.value.trim().toLowerCase();
      const site = alFilterSite.value;
      const sev = alFilterSeverity.value;
      const src = alFilterSource.value;
      let visible = 0;
      alTableBody.querySelectorAll("tr").forEach((row) => {
        const isResolved = row.getAttribute("data-status") === "resolved";
        let show = showAll || !isResolved;
        if (show && q) {
          const text = row.children[3].textContent.toLowerCase() + " " + row.children[4].textContent.toLowerCase();
          if (!text.includes(q)) show = false;
        }
        if (show && site && row.getAttribute("data-site") !== site) show = false;
        if (show && sev && row.getAttribute("data-severity") !== sev) show = false;
        if (show && src && row.getAttribute("data-source") !== src) show = false;
        row.hidden = !show;
        if (show) visible++;
      });
      alEmptyState.hidden = visible !== 0;
      alTableFoot.textContent = `Showing ${visible} of ${visible} ${showAll ? "" : "active "}alarms`.replace("  ", " ");
    }

    alTabActive.addEventListener("click", () => {
      alTabActive.classList.add("active");
      alTabAll.classList.remove("active");
      applyAlarmFilters();
    });
    alTabAll.addEventListener("click", () => {
      alTabAll.classList.add("active");
      alTabActive.classList.remove("active");
      applyAlarmFilters();
    });
    alFilterText.addEventListener("input", applyAlarmFilters);
    [alFilterSite, alFilterSeverity, alFilterSource].forEach((select) => {
      select.addEventListener("change", applyAlarmFilters);
    });
    applyAlarmFilters();
  }

  /* ---------------- Advisories (CVEs) page ---------------- */
  const cvesTableBody = document.getElementById("cvesTableBody");
  if (cvesTableBody) {
    const cvesEmptyState = document.getElementById("cvesEmptyState");
    const cvesTableFoot = document.getElementById("cvesTableFoot");
    const cvesFilterText = document.getElementById("cvesFilterText");
    const cvesFilterSeverity = document.getElementById("cvesFilterSeverity");
    const cvesFilterVendor = document.getElementById("cvesFilterVendor");
    const cvesFilterOs = document.getElementById("cvesFilterOs");
    const cvesFilterOsVersion = document.getElementById("cvesFilterOsVersion");
    const cvesOnlyAffected = document.getElementById("cvesOnlyAffected");
    const totalCvesRows = cvesTableBody.querySelectorAll("tr").length;

    function applyCvesFilters() {
      const q = cvesFilterText.value.trim().toLowerCase();
      const sev = cvesFilterSeverity.value.trim().toLowerCase();
      const vendor = cvesFilterVendor.value.trim().toLowerCase();
      const os = cvesFilterOs.value.trim().toLowerCase();
      const osver = cvesFilterOsVersion.value.trim().toLowerCase();
      const affectedOnly = cvesOnlyAffected.checked;
      let visible = 0;
      cvesTableBody.querySelectorAll("tr").forEach((row) => {
        let show = true;
        if (affectedOnly && parseInt(row.getAttribute("data-related"), 10) === 0) show = false;
        if (show && q) {
          const text = (row.children[0].textContent + " " + row.children[1].textContent).toLowerCase();
          if (!text.includes(q)) show = false;
        }
        if (show && sev && !row.getAttribute("data-severity").includes(sev)) show = false;
        if (show && vendor && !row.getAttribute("data-vendor").includes(vendor)) show = false;
        if (show && os && !row.getAttribute("data-os").includes(os)) show = false;
        if (show && osver && !row.getAttribute("data-osver").toLowerCase().includes(osver)) show = false;
        row.hidden = !show;
        if (show) visible++;
      });
      cvesEmptyState.hidden = visible !== 0;
      cvesTableFoot.textContent = `Showing ${visible} of ${totalCvesRows} advisories`;
    }

    [cvesFilterText, cvesFilterSeverity, cvesFilterVendor, cvesFilterOs, cvesFilterOsVersion].forEach((input) => {
      input.addEventListener("input", applyCvesFilters);
    });
    cvesOnlyAffected.addEventListener("change", applyCvesFilters);
    document.getElementById("cvesOnlyActive").addEventListener("change", (e) => {
      toast(e.target.checked ? "Counting only active devices" : "Counting all devices, including retired ones");
    });
    applyCvesFilters();

    const cvesSyncMenuBtn = document.getElementById("cvesSyncMenuBtn");
    const cvesSyncMenu = document.getElementById("cvesSyncMenu");
    cvesSyncMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !cvesSyncMenu.classList.contains("open");
      closeAllDropdowns();
      if (willOpen) cvesSyncMenu.classList.add("open");
    });
  }

  /* ---------------- Cases page ---------------- */
  const csTableBody = document.getElementById("csTableBody");
  if (csTableBody) {
    const csTabOpen = document.getElementById("csTabOpen");
    const csTabAll = document.getElementById("csTabAll");
    const csEmptyState = document.getElementById("csEmptyState");
    const csTableFoot = document.getElementById("csTableFoot");
    const csFilterText = document.getElementById("csFilterText");
    const csFilterState = document.getElementById("csFilterState");
    const csFilterPriority = document.getElementById("csFilterPriority");
    const csFilterGroup = document.getElementById("csFilterGroup");

    csTableBody.querySelectorAll("tr").forEach((row) => {
      const cell = row.querySelector(".al-actions-cell");
      const number = row.querySelector(".al-link")?.textContent || "this case";
      cell.innerHTML = `
        <button class="al-actions-btn" aria-label="Case actions"><svg width="16" height="16"><use href="#i-more"/></svg></button>
        <div class="dropdown">
          <div class="dropdown-item" data-cs-action="open">Open in ServiceNow</div>
          <div class="dropdown-item" data-cs-action="assign">Assign to me</div>
          <div class="dropdown-item" data-cs-action="copy">Copy number</div>
        </div>`;
      const btn = cell.querySelector(".al-actions-btn");
      const menu = cell.querySelector(".dropdown");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains("open");
        closeAllDropdowns();
        if (willOpen) menu.classList.add("open");
      });
      menu.querySelectorAll("[data-cs-action]").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          menu.classList.remove("open");
          const action = item.getAttribute("data-cs-action");
          if (action === "open") toast(`Opening ${number} in ServiceNow…`);
          else if (action === "assign") toast(`Assigned ${number} to you`);
          else if (action === "copy") toast(`Copied "${number}" to clipboard`);
        });
      });
    });

    function applyCasesFilters() {
      const showAll = csTabAll.classList.contains("active");
      const q = csFilterText.value.trim().toLowerCase();
      const state = csFilterState.value;
      const priority = csFilterPriority.value;
      const group = csFilterGroup.value;
      let visible = 0;
      csTableBody.querySelectorAll("tr").forEach((row) => {
        const isClosed = row.getAttribute("data-status") === "closed";
        let show = showAll || !isClosed;
        if (show && q) {
          const text = (row.children[0].textContent + " " + row.children[1].textContent).toLowerCase();
          if (!text.includes(q)) show = false;
        }
        if (show && state && row.getAttribute("data-state") !== state) show = false;
        if (show && priority && row.getAttribute("data-priority") !== priority) show = false;
        if (show && group && row.getAttribute("data-group") !== group) show = false;
        row.hidden = !show;
        if (show) visible++;
      });
      csEmptyState.hidden = visible !== 0;
      csTableFoot.textContent = `Showing ${visible} of ${visible} ${showAll ? "" : "open "}cases`.replace("  ", " ");
    }

    csTabOpen.addEventListener("click", () => {
      csTabOpen.classList.add("active");
      csTabAll.classList.remove("active");
      applyCasesFilters();
    });
    csTabAll.addEventListener("click", () => {
      csTabAll.classList.add("active");
      csTabOpen.classList.remove("active");
      applyCasesFilters();
    });
    csFilterText.addEventListener("input", applyCasesFilters);
    [csFilterState, csFilterPriority, csFilterGroup].forEach((select) => {
      select.addEventListener("change", applyCasesFilters);
    });
    applyCasesFilters();
  }

  /* ---------------- Uptime page: range toggle + trend chart legend ---------------- */
  const utChartWrap = document.querySelector(".ut-chart-wrap");
  if (utChartWrap) {
    document.querySelectorAll(".ut-range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".ut-range-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const range = btn.getAttribute("data-range");
        document.querySelectorAll(".ut-chart").forEach((svg) => {
          svg.hidden = svg.getAttribute("data-range-chart") !== range;
        });
      });
    });

    document.querySelectorAll(".ut-legend-item").forEach((item) => {
      item.addEventListener("click", () => {
        const series = item.getAttribute("data-series");
        const nowOff = !item.classList.contains("off");
        item.classList.toggle("off", nowOff);
        document.querySelectorAll(`.ut-line.${series}, .ut-pt.${series}`).forEach((el) => {
          el.classList.toggle("series-hidden", nowOff);
        });
      });
    });
  }

  /* ---------------- Actions required: toggle done ---------------- */
  document.querySelectorAll("#actionsList .action").forEach((action) => {
    action.addEventListener("click", () => {
      action.classList.toggle("done");
      const title = action.querySelector(".action__title").textContent;
      const done = action.classList.contains("done");
      action.setAttribute("data-tip", done ? "Click to reopen" : "Click to mark as done");
      if (tooltipTarget === action) showTooltip(action, action.getAttribute("data-tip"));
      toast(done ? `Marked done: ${title}` : `Reopened: ${title}`);
    });
  });

  /* ---------------- Entrance animations: count-up, bars ---------------- */
  function animateCount(el) {
    const target = parseFloat(el.getAttribute("data-count"));
    const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (isNaN(target)) return;
    const final = decimals ? target.toFixed(decimals) : String(target);
    if (reduceMotion || target === 0) {
      el.textContent = final;
      return;
    }
    const duration = 800;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = decimals ? val.toFixed(decimals) : Math.round(val);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    }
    requestAnimationFrame(tick);
  }

  function animateCounts(root) {
    root.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = "0";
      animateCount(el);
    });
  }

  function animateBars(root) {
    root.querySelectorAll(".uptime-row__fill[data-w]").forEach((el, i) => {
      const w = el.getAttribute("data-w");
      el.style.width = "0%";
      setTimeout(() => { el.style.width = w + "%"; }, reduceMotion ? 0 : 150 + i * 110);
    });
  }

  // initial run
  window.addEventListener("DOMContentLoaded", () => {
    replayCardAnimations(pages.overview);
    animateCounts(pages.overview);
    drawSparks(pages.overview);
    refreshIndicators();
  });
  // web fonts / layout can shift tab widths after load
  window.addEventListener("load", refreshIndicators);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshIndicators);
})();
