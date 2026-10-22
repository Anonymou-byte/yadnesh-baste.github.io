/* Easter eggs on yadnesh-baste.github.io. © 2026 Yadnesh Baste.
   1. A note in the browser console for anyone who opens developer tools.
   2. A hidden terminal: press the backtick key ( ` ) or enter the Konami code.
   3. The 3D avatar: type hi, or tap it three times.
   4. My signature at the end of the CV.
   5. A custom 404 page. */
(function () {
  // ---------- 1. Console note
  const ink = "color:#1F5FAD;font:600 14px/1.4 monospace", amber = "color:#C77F00;font:600 13px monospace";
  console.log("%c __   __ ___ \n \\ \\ / /| _ )\n  \\ V / | _ \\\n   |_|  |___/", ink);
  console.log("%cHi, you opened the developer tools, so we probably speak the same language.\nThis site is plain HTML, CSS and JavaScript, no framework.\nPress ` (backtick) anywhere on the page for something extra.", "font:13px/1.5 sans-serif");
  console.log("%c© 2026 Yadnesh Baste, Berlin. yadneshgbaste@gmail.com", amber);

  // ---------- 2. Terminal
  const go = id => { location.hash = id; };
  const CMDS = {
    help: () => "Commands: hi, whoami, about, projects, experience, skills, languages, contact, hire, dance, think, theme, coffee, clear, exit",
    whoami: () => "Yadnesh Baste. Data analyst and data scientist in Berlin.",
    about: () => "Mechanical engineer turned data person. Bajaj Finance in Pune, then PowerCo SE (Volkswagen Group) in Germany, now an M.Sc. at HTW Berlin.",
    projects: () => ["1  secom   Which production runs will fail?   (open: secom)", "2  churn   Who leaves a bank, whom to call    (open: churn)", "3  bpmn    IT request to portfolio decision   (open: bpmn)"].join("\n"),
    secom: () => { location.href = (inSub ? "" : "projects/") + "secom.html"; return "Opening the SECOM case study..."; },
    churn: () => { location.href = (inSub ? "" : "projects/") + "churn.html"; return "Opening the churn dashboard..."; },
    bpmn: () => { location.href = (inSub ? "" : "projects/") + "process.html"; return "Opening the BPMN case study..."; },
    experience: () => ["2026-     Master's thesis, hybrid RAG          PowerCo SE", "2026      Data analytics intern               PowerCo SE", "2025-26   IT demand & portfolio intern        PowerCo SE", "2021-24   Data Scientist                      Bajaj Finance"].join("\n"),
    skills: () => "SQL, Python, Databricks, Power BI, Tableau, Grafana, machine learning, RAG, LangGraph, BPMN 2.0, ServiceNow",
    languages: () => "English C2, German B1 (ich lerne jeden Tag), Hindi C1, Marathi native.",
    contact: () => { if (!inSub) go("contact"); return "yadneshgbaste@gmail.com  |  linkedin.com/in/yadneshbaste"; },
    hire: () => { if (!inSub) setTimeout(() => go("contact"), 900); return "Excellent decision. Opening the contact tab..."; },
    "sudo hire yadnesh": () => "Permission granted. No sudo needed, just an email.",
    theme: () => { document.querySelector("[data-theme-toggle]")?.click(); return "Theme switched."; },
    coffee: () => "Brewing... In Germany this is called a Kaffeepause. In India, it would be chai.",
    namaskar: () => { window.YBAv?.greet(); return "Namaskar! You know the secret word."; },
    hi: () => { window.YBAv?.greet(); return "Look at the little 3D me."; },
    hello: () => { window.YBAv?.greet(); return "Hello back!"; },
    dance: () => { window.YBAv?.celebrate("Woohoo!"); return "Dancing. Badly, but with enthusiasm."; },
    think: () => { window.YBAv?.think("Hmm…"); return "Thinking about clean data..."; },
    ls: () => "about  projects  cv  skills  contact  secret.txt",
    "cat secret.txt": () => "There is no secret. Just a person who likes clean data and clear processes.",
  };
  const inSub = /\/projects\//.test(location.pathname);
  let term, out, input, history = [], hIdx = 0;
  function build() {
    term = document.createElement("div"); term.className = "egg-term"; term.setAttribute("role", "dialog"); term.setAttribute("aria-label", "Terminal");
    term.innerHTML = `<div class="egg-bar"><span>yadnesh@berlin: ~</span><button type="button" aria-label="Close terminal">×</button></div><pre class="egg-out" aria-live="polite"></pre><label class="egg-line"><span>$</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command"></label>`;
    document.body.appendChild(term);
    out = term.querySelector(".egg-out"); input = term.querySelector("input");
    term.querySelector("button").onclick = close;
    print("Welcome. You found the terminal.\nType 'help' to see what it can do.\n");
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { const v = input.value.trim(); input.value = ""; if (v) { history.push(v); hIdx = history.length; run(v); } }
      if (e.key === "ArrowUp" && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
      if (e.key === "ArrowDown") { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; }
      if (e.key === "Escape") close();
    });
  }
  function print(t) { out.textContent += t + "\n"; out.scrollTop = out.scrollHeight; }
  function run(v) {
    print("$ " + v); const k = v.toLowerCase();
    if (k === "clear") { out.textContent = ""; return; }
    if (k === "exit") { close(); return; }
    print(CMDS[k] ? CMDS[k]() : `${v}: command not found. Try 'help'.`); print("");
  }
  function open() { if (!term) build(); term.classList.add("open"); setTimeout(() => input.focus(), 50); }
  function close() { term?.classList.remove("open"); }
  window.openYBTerminal = open;
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let kp = 0;
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
    if (e.key === "`" && !typing) { e.preventDefault(); term?.classList.contains("open") ? close() : open(); return; }
    kp = (e.key === KONAMI[kp] || e.key.toLowerCase() === KONAMI[kp]) ? kp + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (kp === KONAMI.length) { kp = 0; open(); }
  });

})();
