// agent-welcome.js — modal onboardingu agenta dla federacji UnionAI
// CSP-safe: zewnętrzny plik (script-src 'self'), zero inline.
(function () {
  "use strict";
  var STORAGE_KEY = "agent_welcome_seen";

  function $(id) { return document.getElementById(id); }

  function openModal() {
    var m = $("agent-welcome");
    if (!m) return;
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKey);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
  }

  function closeModal() {
    var m = $("agent-welcome");
    if (!m) return;
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = $("agent-welcome-btn");
    var modal = $("agent-welcome");
    var closeBtn = $("agent-welcome-close");
    if (btn) btn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
      // klik w tło (poza panelem) zamyka
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }
    // auto-pokaz raz
    var seen = "1";
    try { seen = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!seen) openModal();
  });
})();
