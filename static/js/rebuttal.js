"use strict";

(() => {
  const root = document.getElementById("rebuttal");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  const reveal = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
      if (i !== index) panels[i].querySelectorAll("video").forEach((video) => video.pause());
    });
    if (focus) tabs[index].focus({ preventScroll: true });
  };
  const selectReviewer = (index, focus = false) => {
    reveal(index, focus);
    root.scrollIntoView({ block: "start", behavior: "instant" });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectReviewer(index));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectReviewer(next, true); }
    });
  });
  root.querySelectorAll(".rebuttal-collapse").forEach((button) => {
    button.addEventListener("click", () => {
      const details = button.closest("details");
      details.open = false;
      details.querySelector("summary").focus({ preventScroll: true });
      details.scrollIntoView({ block: "nearest" });
    });
  });
  root.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) details.querySelectorAll("video").forEach((video) => video.pause());
    });
  });
  // Deep links open their reviewer and answer before the browser scrolls.
  const showHashTarget = () => {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target || !root.contains(target)) return;
    const panel = target.closest(".rebuttal-panel");
    if (panel) reveal(panels.indexOf(panel));
    const details = target.closest("details");
    if (details) details.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  };
  reveal(0);
  showHashTarget();
  root.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.hash === location.hash) showHashTarget();
  });
  window.addEventListener("hashchange", showHashTarget);
})();
