/* MDR Quality Panel — mobile graphics presets and GPU-capped 4K frame export. */
(function () {
  "use strict";
  let activeWorld = null;
  let launcher = null, panel = null;
  const profileNames = Object.keys(window.MDRQuality ? window.MDRQuality.PROFILES : {});
  const safeProfile = id => profileNames.includes(id) ? id : "auto";

  function message(text) {
    let output = panel && panel.querySelector(".mdr-quality-info");
    if (output) output.textContent = text;
  }
  function setActiveProfile(id) {
    if (!activeWorld || !window.MDRQuality) return;
    const profile = safeProfile(id);
    try {
      const result = window.MDRQuality.applyProfile(activeWorld, profile, window.devicePixelRatio || 1, document);
      panel.querySelectorAll("[data-profile]").forEach(button => {
        const active = button.dataset.profile === profile;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      message(`الوضع: ${result.label} · Pixel Ratio ${result.pixelRatioCap}× · ${result.adaptive ? "تكيّف تلقائي" : "إعداد ثابت"}`);
    } catch (error) { message("تعذر تطبيق الإعداد: " + (error.message || String(error))); }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = name; link.style.display = "none";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function export4K() {
    const world = activeWorld;
    if (!world || !world.engine || !world.engine.renderer || !world.scene || !world.camera) throw new Error("افتح مشهد اللعبة أولاً");
    const renderer = world.engine.renderer;
    const canvas = renderer.domElement || world.canvas;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.width, height: canvas.height };
    const capabilities = window.MDRQuality.getCapabilities(renderer);
    const maxBuffer = Math.min(capabilities.maxRenderbufferSize, capabilities.maxTextureSize);
    const dims = window.MDRQuality.captureDimensions(rect, maxBuffer, 3840);
    if (dims.longEdge < 1080) throw new Error("حدود GPU منخفضة جداً للتصدير عالي الدقة");
    const oldPixelRatio = typeof renderer.getPixelRatio === "function" ? renderer.getPixelRatio() : (world.engine.pixelRatioCap || 1);
    const oldWidth = Math.max(1, Math.round(canvas.width / Math.max(.5, oldPixelRatio)));
    const oldHeight = Math.max(1, Math.round(canvas.height / Math.max(.5, oldPixelRatio)));
    const previousAspect = world.camera.aspect;
    const wasRunning = world.engine.running === true;
    if (wasRunning) world.engine.stop();
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(dims.width, dims.height, false);
      world.camera.aspect = dims.width / dims.height;
      world.camera.updateProjectionMatrix && world.camera.updateProjectionMatrix();
      renderer.render(world.scene, world.camera);
      const blob = await new Promise((resolve, reject) => {
        if (typeof canvas.toBlob === "function") canvas.toBlob(result => result ? resolve(result) : reject(new Error("تعذر إنشاء صورة الرندر")), "image/png");
        else {
          try { const data = canvas.toDataURL("image/png"); const binary = atob(data.split(",")[1]); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); resolve(new Blob([bytes], { type: "image/png" })); }
          catch (error) { reject(error); }
        }
      });
      download(blob, `MDR-Frame-${dims.width}x${dims.height}.png`);
      const quality = dims.longEdge >= 3840 ? "4K" : `${dims.longEdge}px (حد GPU)`;
      message(`تم تصدير إطار ${quality}: ${dims.width} × ${dims.height} PNG`);
    } finally {
      renderer.setPixelRatio(oldPixelRatio);
      renderer.setSize(oldWidth, oldHeight, false);
      world.camera.aspect = previousAspect || oldWidth / oldHeight;
      world.camera.updateProjectionMatrix && world.camera.updateProjectionMatrix();
      renderer.render(world.scene, world.camera);
      if (wasRunning && !world.destroyed) world.engine.start();
    }
  }
  function removeUI() {
    if (launcher) launcher.remove(); if (panel) panel.remove();
    launcher = panel = null;
  }
  function mount(world) {
    if (!world || !world.engine || !world.engine.renderer) return;
    activeWorld = world; removeUI();
    launcher = document.createElement("button"); launcher.type = "button"; launcher.className = "mdr-quality-launcher";
    launcher.textContent = "⚙ الجودة والتصدير"; launcher.setAttribute("aria-expanded", "false");
    panel = document.createElement("section"); panel.className = "mdr-quality-panel";
    panel.setAttribute("aria-label", "إعدادات جودة MDR");
    panel.innerHTML = `
      <div class="mdr-quality-head"><span>🎮 MDR Graphics</span><button class="mdr-quality-close" type="button" data-close>إغلاق</button></div>
      <div class="mdr-quality-profiles">
        <button type="button" data-profile="auto">تلقائي</button>
        <button type="button" data-profile="performance">أداء</button>
        <button type="button" data-profile="balanced">متوازن</button>
        <button type="button" data-profile="high">عالٍ</button>
        <button type="button" data-profile="ultra">فائق</button>
        <button type="button" data-profile="4k">4K (حد GPU)</button>
        <button type="button" class="primary" data-capture>تصدير لقطة 4K PNG</button>
        <button type="button" class="primary" data-export-project>تصدير المشروع .mdrgame</button>
        <button type="button" data-export-build>تصدير Web + Android Studio</button>
      </div>
      <p class="mdr-quality-info">إعداد الرسوم حسب قدرة الجهاز. تصدير 4K يستخدم أعلى دقة يدعمها GPU.</p>`;
    document.body.append(launcher, panel);
    launcher.addEventListener("click", () => {
      const open = !panel.classList.contains("open"); panel.classList.toggle("open", open); launcher.setAttribute("aria-expanded", String(open));
    });
    panel.addEventListener("click", async event => {
      const button = event.target.closest("button"); if (!button) return;
      if (button.hasAttribute("data-close")) { panel.classList.remove("open"); launcher.setAttribute("aria-expanded", "false"); }
      else if (button.dataset.profile) setActiveProfile(button.dataset.profile);
      else if (button.hasAttribute("data-capture")) {
        button.disabled = true; button.textContent = "جارٍ تصدير الصورة…";
        try { await export4K(); } catch (error) { message(error.message || String(error)); }
        finally { button.disabled = false; button.textContent = "تصدير لقطة 4K PNG"; }
      } else if (button.hasAttribute("data-export-project")) {
        button.disabled = true; button.textContent = "جارٍ تجهيز المشروع…";
        try { const result = await window.MDRExporter.exportProjectPackage(); message(`تم تصدير المشروع: ${result.objects} عنصر و${result.assets} أصل`); }
        catch (error) { message(error.message || String(error)); }
        finally { button.disabled = false; button.textContent = "تصدير المشروع .mdrgame"; }
      } else if (button.hasAttribute("data-export-build")) {
        button.disabled = true; button.textContent = "جارٍ تجهيز Web + Android…";
        try { const result = await window.MDRExporter.exportGameBuild(); message(`الحزمة جاهزة: ${result.files} ملفاً · مشروع Android Studio وليس APK جاهزاً`); }
        catch (error) { message(error.message || String(error)); }
        finally { button.disabled = false; button.textContent = "تصدير Web + Android Studio"; }
      }
    });
    let preferred = "auto";
    try { preferred = localStorage.getItem("mdr.graphics.profile") || "auto"; } catch (_) {}
    setActiveProfile(preferred);
  }
  window.addEventListener("mdr2:world-ready", event => mount(event.detail));
  window.addEventListener("mdr2:world-destroy", () => { activeWorld = null; removeUI(); });
  if (window.__MDR2_ACTIVE_WORLD__) setTimeout(() => mount(window.__MDR2_ACTIVE_WORLD__), 0);
})();
