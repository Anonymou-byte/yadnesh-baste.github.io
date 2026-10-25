/* Asks visitors who they are (recruiter, student, professional) and lets them leave feedback. © 2026 Yadnesh Baste.
   Answers go to the Formspree endpoint in assets/config.js; without one, the visitor's email app opens instead. */
(function () {
  const C = window.YB_CONFIG || {}, KEY = "yb-visitor";
  const card = document.createElement("div"); card.className = "fb-card"; card.hidden = true; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Quick question");
  card.innerHTML = `
    <button type="button" class="fb-x" aria-label="Close">×</button>
    <div class="fb-step" data-step="who">
      <b>Quick question: who’s visiting?</b>
      <div class="fb-opts">
        <button type="button" data-who="Recruiter">Recruiter / hiring manager</button>
        <button type="button" data-who="Student">Student</button>
        <button type="button" data-who="Professional">Professional</button>
        <button type="button" data-who="Just browsing">Just browsing</button>
      </div>
    </div>
    <form class="fb-step" data-step="note" hidden>
      <b class="fb-thanks">Thanks!</b>
      <label for="fb-text">Anything Yadnesh should know or improve? (optional)</label>
      <textarea id="fb-text" name="message" rows="3" maxlength="1500" placeholder="Your feedback, a question, or a role you think fits…"></textarea>
      <label for="fb-mail">Your email, if you’d like a reply (optional)</label>
      <input id="fb-mail" name="email" type="email" autocomplete="email" placeholder="name@company.com">
      <div class="fb-row"><button type="submit" class="btn primary">Send</button><button type="button" class="btn fb-skip">Skip</button></div>
      <p class="fb-privacy">Only what you type here is sent to Yadnesh. Nothing is tracked.</p>
    </form>
    <div class="fb-step" data-step="done" hidden><b>Thank you!</b><p class="fb-done-text"></p></div>`;
  document.body.appendChild(card);
  let who = "";
  const step = n => card.querySelectorAll(".fb-step").forEach(s => s.hidden = s.dataset.step !== n);
  async function send(data) {
    if (!C.feedbackEndpoint) return false;
    try { const r = await fetch(C.feedbackEndpoint, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) }); return r.ok; }
    catch (e) { return false; }
  }
  function show() { step("who"); card.hidden = false; card.querySelector("[data-who]").focus({ preventScroll: true }); }
  function hide() { card.hidden = true; }
  card.querySelector(".fb-x").onclick = hide;
  card.querySelectorAll("[data-who]").forEach(b => b.onclick = () => {
    who = b.dataset.who; try { localStorage.setItem(KEY, who); } catch (e) {}
    send({ visitor: who, page: location.pathname, _subject: "Portfolio visitor: " + who });
    card.querySelector(".fb-thanks").textContent = who === "Recruiter" ? "Thanks! Great to have you here." : "Thanks!";
    step("note");
    const av = window.YBAv; if (av) who === "Recruiter" ? av.celebrate("A recruiter! Let me show you my CV.") : av.wave("Nice to meet you!");
    if (who === "Recruiter" && document.getElementById("cv")) setTimeout(() => { location.hash = "cv"; }, 1800);
  });
  card.querySelector(".fb-skip").onclick = hide;
  card.querySelector("form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = card.querySelector("#fb-text").value.trim(), mail = card.querySelector("#fb-mail").value.trim();
    if (!msg && !mail) { hide(); return; }
    const ok = await send({ visitor: who || "Unknown", message: msg, email: mail, page: location.pathname, _subject: "Portfolio feedback from a " + (who || "visitor") });
    if (!ok) location.href = `mailto:${C.email}?subject=${encodeURIComponent("Portfolio feedback (" + (who || "visitor") + ")")}&body=${encodeURIComponent(msg + (mail ? "\n\nReply to: " + mail : ""))}`;
    card.querySelector(".fb-done-text").textContent = ok ? "Your note is on its way to Yadnesh." : "Your email app should open with the message ready to send.";
    step("done"); setTimeout(hide, 3500);
  });
  document.getElementById("open-feedback")?.addEventListener("click", show);
  document.querySelectorAll("#fb-float, .fb-float").forEach(b => b.addEventListener("click", () => card.hidden ? show() : hide()));
  if (!document.querySelector(".fb-float")) { const fb = document.createElement("button"); fb.type = "button"; fb.className = "fb-float"; fb.textContent = "💬 Feedback"; fb.setAttribute("aria-label", "Leave feedback"); fb.onclick = () => card.hidden ? show() : hide(); document.body.appendChild(fb); }
  window.YBFeedback = { show };
  // Ask once per browser, a little after the avatar has said hello
  let asked = ""; try { asked = localStorage.getItem(KEY) || ""; } catch (e) {}
  if (!asked && !/\/projects\//.test(location.pathname)) {
    setTimeout(() => { try { if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, "asked"); } catch (e) {} show(); }, 9000);
  }
})();
