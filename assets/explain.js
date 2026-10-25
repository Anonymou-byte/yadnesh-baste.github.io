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

  // ---------- "Explain this graph": a text link under each graph; the explanation opens right below it
  document.querySelectorAll("[data-explain]").forEach((fig, i) => {
    const box = document.createElement("div"); box.className = "explain";
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "explain-link"; btn.textContent = "Explain this graph";
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "explain-" + i);
    const txt = document.createElement("div"); txt.className = "explain-text"; txt.id = "explain-" + i; txt.hidden = true;
    const raw = fig.dataset.explain, cut = raw.indexOf(" Why it matters:");
    const p1 = document.createElement("p"); p1.textContent = cut > 0 ? raw.slice(0, cut) : raw; txt.appendChild(p1);
    if (cut > 0) { const p2 = document.createElement("p"); const b = document.createElement("b"); b.textContent = "Why it matters: "; p2.append(b, raw.slice(cut + 17)); txt.appendChild(p2); }
    box.append(btn, txt);
    if (fig.parentElement.classList.contains("project")) { const w = document.createElement("div"); fig.parentNode.insertBefore(w, fig); w.append(fig, box); } else fig.insertAdjacentElement("afterend", box);
    btn.addEventListener("click", e => { e.preventDefault(); const open = txt.hidden; txt.hidden = !open; btn.setAttribute("aria-expanded", String(open)); btn.textContent = open ? "Hide explanation" : "Explain this graph"; if (open && window.YBAv && YBAv.think) YBAv.think("Here’s how to read it."); });
  });

  // ---------- AI-style network behind the photo
  const net = document.querySelector(".cover .net, .hero2-photo .net");
  if (net) {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const vb = net.viewBox.baseVal, W = vb.width || 400, H = vb.height || 520, n = Math.round(W * H / 9000);
    const pts = Array.from({ length: n }, () => [10 + rnd() * (W - 20), 10 + rnd() * (H - 20)]);
    let s = "";
    pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 140) s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }));
    pts.forEach((p, i) => s += `<circle cx="${p[0]}" cy="${p[1]}" r="${i % 5 ? 2.2 : 3.6}" class="${i % 7 ? "" : "hot"}"/>`);
    net.innerHTML = s;
  }
})();
