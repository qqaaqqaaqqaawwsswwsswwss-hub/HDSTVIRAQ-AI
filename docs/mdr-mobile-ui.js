/* MDR Mobile UI 1.0 — activates the responsive workspace and safe-area support. */
(function () {
  "use strict";
  function boot() {
    document.documentElement.classList.add("mdr-mobile-ready");
    const nav = document.querySelector(".topnav");
    if (nav) nav.setAttribute("aria-label", "التنقل الرئيسي");
    document.querySelectorAll(".topnav-btn").forEach(button => {
      button.setAttribute("type", "button");
      button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "instant" });
      }, { passive: true });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  const observer = new MutationObserver(() => {
    const nav = document.querySelector(".topnav");
    if (nav && !nav.dataset.mdrReady) { nav.dataset.mdrReady = "true"; boot(); }
  });
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
})();
