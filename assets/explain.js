/* Simple vs technical explanations, story tabs, "Explain this graph" popovers, AI grid background. © 2026 Yadnesh Baste. */
(function () {
  // ---------- Simple / technical switch (remembered across pages)
  const KEY = "yb-mode";
  let mode = "simple"; try { mode = localStorage.getItem(KEY) || "simple"; } catch (e) {}
  function apply(m) {
    mode = m; document.documentElement.dataset.mode = m;
    document.querySelectorAll("[data-mode-set]").forEach(b => b.setAttribute("aria-pressed", b.dataset.modeSet === m));
    try { localStorage.setItem(KEY, m); } catch (e) {}
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-mode-set]"); if (b) apply(b.dataset.modeSet); });
  apply(mode);

  // ---------- Story tabs (Today / Early career)
  document.querySelectorAll("[data-story]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-story]").forEach(x => { const on = x === b; x.setAttribute("aria-pressed", on); x.setAttribute("aria-selected", on); });
    document.querySelectorAll("[data-story-panel]").forEach(p => p.hidden = p.dataset.storyPanel !== b.dataset.story);
  }));

  // ---------- "Explain this graph"
  let open = null;
  function closeAll() { if (open) { open.pop.hidden = true; open.btn.setAttribute("aria-expanded", "false"); open = null; } }
  document.querySelectorAll("[data-explain]").forEach((fig, i) => {
    const wrap = document.createElement("div"); wrap.className = "explain-wrap";
    fig.parentNode.insertBefore(wrap, fig); wrap.appendChild(fig);
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "explain-btn"; btn.textContent = "Explain this graph";
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "explain-" + i);
    const pop = document.createElement("div"); pop.className = "explain-pop"; pop.id = "explain-" + i; pop.hidden = true; pop.setAttribute("role", "note");
    pop.innerHTML = `<button type="button" class="explain-x" aria-label="Close">×</button><b>How to read this</b><p></p>`;
    pop.querySelector("p").textContent = fig.dataset.explain;
    wrap.append(btn, pop);
    btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); const was = !pop.hidden; closeAll(); if (!was) { pop.hidden = false; btn.setAttribute("aria-expanded", "true"); open = { pop, btn }; window.YBAv && YBAv.think && YBAv.think("Here’s how to read it."); } });
    pop.querySelector(".explain-x").addEventListener("click", closeAll);
  });
  document.addEventListener("click", e => { if (open && !open.pop.contains(e.target)) closeAll(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });

  // ---------- AI-style network behind the photo
  const net = document.querySelector(".hero2-photo .net");
  if (net) {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pts = Array.from({ length: 26 }, () => [20 + rnd() * 360, 20 + rnd() * 480]);
    let s = "";
    pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 120) s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }));
    pts.forEach((p, i) => s += `<circle cx="${p[0]}" cy="${p[1]}" r="${i % 5 ? 2.2 : 3.6}" class="${i % 7 ? "" : "hot"}"/>`);
    net.innerHTML = s;
  }
})();
