(function drawerRsiViewerDetail(global) {
  "use strict";
  const TASKS = [{ metric: "close", label: "Close" }, { metric: "middle", label: "Open-middle" }, { metric: "top", label: "Open-top" }];
  const formatStep = (value) => Number(value).toLocaleString("en-US");
  const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const taskForMetric = (metric) => TASKS.find((task) => task.metric === metric);

  function init(root) {
    if (!root || root.dataset.viewerDetailInitialized === "true") return;
    const data = global.DRAWER_RSI_DATA, dialog = root.querySelector(".drawer-detail-dialog"), content = root.querySelector(".drawer-detail-content");
    if (!data || !dialog || !content) return;
    root.dataset.viewerDetailInitialized = "true";
    const componentBase = new URL(root.dataset.componentBase || "./", document.baseURI);
    let manifestPromise, requestId = 0;
    function loadManifest() {
      if (!manifestPromise) manifestPromise = fetch(new URL("manifest.json?v=public-cleanup", componentBase)).then((response) => {
        if (!response.ok) throw new Error(`${response.status} manifest.json`);
        return response.json();
      }).catch((error) => { manifestPromise = null; throw error; });
      return manifestPromise;
    }

    function candidatesFor(trajectories, metric, step, success) {
      if (metric === "overall") return TASKS.map((task) => trajectories.find((row) => row.step === step && row.metric === task.metric && row.success === success)).filter(Boolean);
      return trajectories.filter((row) => row.step === step && row.metric === metric && row.success === success);
    }

    async function injectViewer(metric, index, currentRequest) {
      const old = content.querySelector(".drawer-viewer-section"); if (old) old.remove();
      const manifest = await loadManifest();
      if (currentRequest !== requestId || !dialog.open) return;
      const step = data.steps[index], denominator = data.denominators[metric], count = data.counts.RSI[metric][index], rate = count / denominator;
      const groups = { success: candidatesFor(manifest.trajectories, metric, step, true), failure: candidatesFor(manifest.trajectories, metric, step, false) };
      let activeOutcome = groups.success.length ? "success" : "failure", selectedIndex = 0;
      const metricLabel = metric === "overall" ? "Overall" : taskForMetric(metric).label;
      const section = document.createElement("section"); section.className = "drawer-viewer-section"; section.setAttribute("aria-label", "Interactive 3D evaluation trajectories");
      const hasReplays = groups.success.length > 0 || groups.failure.length > 0;
      section.innerHTML = `<div class="drawer-viewer-heading"><div><p class="drawer-viewer-rate"><strong>${count}/${denominator}</strong> (${(rate * 100).toFixed(1)}% ${escapeHtml(metricLabel)} success)</p></div><p class="drawer-viewer-step">Evaluation step ${formatStep(step)}</p></div><div class="drawer-viewer-controls" aria-label="Trajectory outcome"><button type="button" data-viewer-outcome="success" aria-pressed="${hasReplays && activeOutcome === "success"}" ${groups.success.length ? "" : "disabled"}>${groups.success.length ? `Successful examples · ${groups.success.length}` : "No successful replays"}</button><button type="button" data-viewer-outcome="failure" aria-pressed="${hasReplays && activeOutcome === "failure"}" ${groups.failure.length ? "" : "disabled"}>${groups.failure.length ? `Failed examples · ${groups.failure.length}` : "No failed replays"}</button></div>${hasReplays ? `<div class="drawer-viewer-layout"><div class="drawer-viewer-frame-wrap"><iframe class="drawer-viewer-frame" title="Draggable 3D trajectory replay" loading="eager"></iframe><p class="drawer-viewer-hint">Drag to rotate · wheel to zoom</p></div><div class="drawer-viewer-cases" aria-label="Trajectory examples"></div></div>` : `<p class="drawer-viewer-empty">No replays available at this step.</p>`}`;
      content.prepend(section);
      dialog.querySelector(".drawer-detail-shell").scrollTop = 0;
      if (!hasReplays) return;
      const frame = section.querySelector(".drawer-viewer-frame"), cases = section.querySelector(".drawer-viewer-cases");
      function activeCandidates() { return groups[activeOutcome]; }
      function render() {
        const candidates = activeCandidates(), trajectory = candidates[selectedIndex] || candidates[0]; if (!trajectory) return;
        cases.innerHTML = candidates.map((row, candidateIndex) => { const label = taskForMetric(row.metric)?.label || row.instruction; return `<button type="button" class="drawer-viewer-case ${row.success ? "is-success" : "is-failure"}" data-viewer-case="${candidateIndex}" aria-pressed="${candidateIndex === selectedIndex}"><strong>${escapeHtml(label)}</strong><span>step ${formatStep(step)}</span><em>${row.success ? "Successful trajectory" : "Failed trajectory"}</em></button>`; }).join("");
        cases.querySelectorAll("[data-viewer-case]").forEach((button) => button.addEventListener("click", () => { selectedIndex = Number(button.dataset.viewerCase); render(); }));
        frame.src = new URL(`viewer/index.html?embed=1&case=${encodeURIComponent(trajectory.case_id)}&view=overview&font=times&cleanup=1`, componentBase).href;
      }
      section.querySelectorAll("[data-viewer-outcome]").forEach((button) => button.addEventListener("click", () => { if (button.disabled) return; activeOutcome = button.dataset.viewerOutcome; selectedIndex = 0; section.querySelectorAll("[data-viewer-outcome]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); render(); }));
      render();
    }

    root.addEventListener("drawer-rsi-detail-opened", (event) => {
      const { seriesName, metric, index } = event.detail || {};
      const currentRequest = ++requestId;
      if (seriesName !== "RSI" || !metric || index < 0) return;
      injectViewer(metric, index, currentRequest).catch(() => {
        if (currentRequest !== requestId || !dialog.open) return;
        const notice = document.createElement("p"); notice.className = "drawer-detail-notice"; notice.textContent = "The 3D replay is temporarily unavailable."; content.prepend(notice);
      });
    });
    dialog.addEventListener("close", () => { ++requestId; dialog.querySelectorAll("iframe.drawer-viewer-frame").forEach((frame) => { frame.src = "about:blank"; }); });
  }
  function autoInit() { document.querySelectorAll("[data-drawer-rsi-figure]").forEach(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit, { once: true }); else autoInit();
})(window);
