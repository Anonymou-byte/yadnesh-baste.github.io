/* Puts the 3D avatar on every page and connects it to tabs, typing and taps. © 2026 Yadnesh Baste. */
(function () {
  if (!window.YBAvatar) return;
  const ok = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; } })();
  if (!ok) return;
  const body = document.body, stage = document.getElementById("avatar-stage");
  let av;
  if (stage) { // full-size stage (404 page)
    av = YBAvatar.mount(stage, { pose: body.dataset.avatar || "build" });
    setTimeout(() => av.say(body.dataset.hello || "Still building this one…", 5000), 900);
  } else {
    const dock = document.createElement("div"); dock.className = "av-dock"; dock.setAttribute("aria-label", "Animated 3D avatar. Type hi or tap it three times.");
    dock.innerHTML = '<div class="av-canvas"></div><button class="av-min" type="button" aria-label="Hide avatar">–</button>';
    const reopen = document.createElement("button"); reopen.className = "av-reopen"; reopen.type = "button"; reopen.setAttribute("aria-label", "Show avatar"); reopen.textContent = "👋";
    body.append(dock, reopen);
    const KEY = "yb-avatar-hidden"; let hidden = false; try { hidden = localStorage.getItem(KEY) === "1"; } catch (e) {}
    const setHidden = h => { hidden = h; dock.classList.toggle("off", h); reopen.classList.toggle("on", h); try { localStorage.setItem(KEY, h ? "1" : "0"); } catch (e) {} };
    dock.querySelector(".av-min").onclick = () => setHidden(true);
    reopen.onclick = () => { setHidden(false); setTimeout(() => av.greet(), 200); };
    setHidden(hidden);
    av = YBAvatar.mount(dock.querySelector(".av-canvas"), { pose: body.dataset.avatar || "idle", board: body.dataset.board });

    // pose per tab on the home page
    const TAB = {
      about: ["idle", null], projects: ["present", "Here's what I've built."], cv: ["read", "My CV, in short."],
      skills: ["type", "Pick a skill, I'll show the proof."], contact: ["idle", "Let's talk!"],
    };
    let first = true;
    function onTab() {
      if (!document.getElementById("about")) return;
      const id = (location.hash.slice(1) || "about").replace(/^work$/, "projects").replace(/^experience$/, "cv").replace(/^toolkit$/, "skills");
      const [pose, line] = TAB[id] || TAB.about;
      av.setPose(pose);
      if (first) { first = false; let seen = false; try { seen = sessionStorage.getItem("yb-hello") === "1"; sessionStorage.setItem("yb-hello", "1"); } catch (e) {}
        if (!seen && !hidden) setTimeout(() => av.wave("Hi! Type “hi” or tap me 3 times."), 1200); return; }
      if (id === "contact") av.wave(line); else if (line) av.say(line, 2400);
    }
    window.addEventListener("hashchange", onTab); onTab();
    if (body.dataset.hello) setTimeout(() => av.say(body.dataset.hello, 3000), 1000);
  }
  // type "hi" anywhere
  let buf = "";
  document.addEventListener("keydown", e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-9);
    clearTimeout(window.__ybHi);
    if (/(^|[^a-z])(hi|hey|hello|namaste|namaskar)$/.test(" " + buf)) window.__ybHi = setTimeout(() => { av.greet(); buf = ""; }, 450);
  });
  window.YBAv = av;
})();
