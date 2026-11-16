(function drawerRsiScrollStory(global) {
  "use strict";
  const STAGES = [
    { key: "overall", number: "01", title: "Overall performance" },
    { key: "tasks", number: "02", title: "Task performance" },
    { key: "comparison", number: "03", title: "Task comparison" },
  ];
  function stageHeader(stage) {
    const header = document.createElement("header");
    header.className = "drawer-story-header";
    header.innerHTML = `<span class="drawer-story-number">${stage.number}</span><h3>${stage.title}</h3>`;
    return header;
  }
  function build(root) {
    if (!root || root.dataset.scrollStoryInitialized === "true") return;
    const panels = root.querySelector(".drawer-panels");
    const overall = panels?.querySelector('.drawer-panel[data-metric="overall"]');
    const tasks = ["close", "middle", "top"].map((metric) => panels?.querySelector(`.drawer-panel[data-metric="${metric}"]`));
    const comparison = panels?.querySelector("[data-trajectory-panel]");
    const methodLegend = root.querySelector(".drawer-legend");
    if (!panels || !overall || tasks.some((panel) => !panel) || !comparison) return;
    root.dataset.scrollStoryInitialized = "true";
    const stageElements = [];
    STAGES.forEach((stage) => {
      const section = document.createElement("section");
      section.className = `drawer-story-stage drawer-story-${stage.key}`;
      section.dataset.storyStage = stage.key;
      section.append(stageHeader(stage));
      const frame = document.createElement("div");
      frame.className = "drawer-story-frame";
      if (stage.key === "overall") {
        if (methodLegend) frame.append(methodLegend);
        const hint = document.createElement("p");
        hint.className = "drawer-node-hint";
        hint.innerHTML = '<span class="drawer-node-hint-mark" aria-hidden="true"></span><span>Click any node to view evaluation details.</span>';
        frame.append(hint);
        const taskMixKey = document.createElement("p");
        taskMixKey.className = "drawer-task-mix-key";
        taskMixKey.innerHTML = '<span>Close (C)</span><span>Open-middle (M)</span><span>Open-top (T)</span>';
        frame.append(taskMixKey);
        frame.append(overall);
      }
      if (stage.key === "tasks") {
        const branches = document.createElement("div");
        branches.className = "drawer-story-branches";
        tasks.forEach((panel) => branches.append(panel));
        frame.append(branches);
      }
      if (stage.key === "comparison") frame.append(comparison);
      section.append(frame);
      panels.append(section);
      stageElements.push(section);
    });
    const progress = document.createElement("nav");
    progress.className = "drawer-story-progress";
    progress.setAttribute("aria-label", "Figure chapters");
    progress.innerHTML = STAGES.map((stage) => `<button type="button" data-story-jump="${stage.key}" aria-label="Go to ${stage.title}"><span>${stage.number}</span><b>${stage.key === "overall" ? "Overall" : stage.key === "tasks" ? "Tasks" : "Compare"}</b><i></i></button>`).join("");
    panels.before(progress);
    const reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)");
    progress.querySelectorAll("[data-story-jump]").forEach((button) => button.addEventListener("click", () => {
      const section = root.querySelector(`[data-story-stage="${button.dataset.storyJump}"]`);
      if (!section) return;
      const stickyTop = parseFloat(getComputedStyle(root).getPropertyValue("--drawer-sticky-top")) || 12;
      const top = global.scrollY + section.getBoundingClientRect().top - stickyTop - progress.getBoundingClientRect().height - 20;
      global.scrollTo({ top, behavior: reducedMotion.matches ? "instant" : "smooth" });
    }));
    const siteHeader = document.querySelector(".site-header");
    if (siteHeader && root.dataset.componentBase) {
      const syncHeader = () => root.style.setProperty("--drawer-sticky-top", `${Math.ceil(siteHeader.getBoundingClientRect().height) + 12}px`);
      new ResizeObserver(syncHeader).observe(siteHeader);
      syncHeader();
    }
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("is-visible"); }), { rootMargin: "0px 0px -12% 0px", threshold: .16 });
    stageElements.forEach((section) => reveal.observe(section));
    let ticking = false;
    function updateStory() {
      ticking = false;
      const viewportMiddle = global.innerHeight * .46;
      let active = stageElements[0];
      stageElements.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= viewportMiddle) active = section;
        if (!reducedMotion.matches) {
          const raw = (viewportMiddle - rect.top) / Math.max(rect.height, 1);
          section.style.setProperty("--stage-progress", String(Math.max(0, Math.min(1, raw)).toFixed(3)));
        }
      });
      const activeKey = active.dataset.storyStage;
      root.dataset.storyActive = activeKey;
      progress.querySelectorAll("[data-story-jump]").forEach((button) => {
        const current = button.dataset.storyJump === activeKey;
        button.classList.toggle("is-active", current);
        if (current) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
      });
      const rootRect = root.getBoundingClientRect();
      progress.classList.toggle("is-on-canvas", rootRect.top < global.innerHeight * .55 && rootRect.bottom > global.innerHeight * .45);
    }
    function requestUpdate() { if (!ticking) { ticking = true; global.requestAnimationFrame(updateStory); } }
    global.addEventListener("scroll", requestUpdate, { passive: true });
    global.addEventListener("resize", requestUpdate, { passive: true });
    root.classList.add("is-story-ready");
    updateStory();
  }
  function init() { document.querySelectorAll("[data-drawer-rsi-figure]").forEach(build); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})(window);
