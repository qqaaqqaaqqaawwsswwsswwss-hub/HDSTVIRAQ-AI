/* Export-only bootstrap: restore a packaged MDR scene and its GLB files after world startup. */
(function () {
  "use strict";
  let loaded = false;
  async function restore() {
    if (loaded || !window.MDRStudio || !window.MDRAssetStore) return;
    loaded = true;
    try {
      const response = await fetch("project/scene.json", { cache: "no-store" });
      if (!response.ok) throw new Error("تعذر قراءة project/scene.json");
      const project = await response.json();
      const manifestResponse = await fetch("project/manifest.json", { cache: "no-store" });
      if (!manifestResponse.ok) throw new Error("تعذر قراءة project/manifest.json");
      const manifest = await manifestResponse.json();
      if (!manifest || manifest.schema !== "mdr-game-package" || !Array.isArray(manifest.assets) || manifest.assets.length > 500) throw new Error("ملف manifest غير صالح أو يحتوي أصولاً كثيرة");
      const assets = [];
      const seenIds = new Set();
      let totalBytes = 0;
      for (const asset of manifest.assets) {
        if (!asset || typeof asset.id !== "string" || !/^[a-z0-9-]{1,100}$/i.test(asset.id) || seenIds.has(asset.id) ||
            typeof asset.path !== "string" || asset.path !== "project/assets/asset-" + asset.id + ".glb") throw new Error("مرجع أصل غير صالح أو مكرر");
        seenIds.add(asset.id);
        if (Number.isFinite(asset.size) && (asset.size < 0 || asset.size > 50 * 1024 * 1024)) throw new Error("حجم أصل يتجاوز حد 50MB: " + asset.name);
        const fileResponse = await fetch(asset.path, { cache: "no-store" });
        if (!fileResponse.ok) throw new Error("تعذر تحميل الأصل " + asset.name);
        const blob = await fileResponse.blob();
        if (blob.size > 50 * 1024 * 1024 || (asset.size !== undefined && blob.size !== asset.size)) throw new Error("حجم الأصل لا يطابق الحدود أو manifest: " + asset.name);
        totalBytes += blob.size;
        if (totalBytes > 250 * 1024 * 1024) throw new Error("الحزمة تتجاوز حد 250MB");
        assets.push({ id: asset.id, name: asset.name, blob });
      }
      await window.MDRStudio.importPackage(project, assets);
      document.dispatchEvent(new CustomEvent("mdr:export-project-restored", { detail: { objects: project.objects.length, assets: assets.length } }));
    } catch (error) {
      loaded = false;
      console.error("MDR export project restore failed", error);
      document.dispatchEvent(new CustomEvent("mdr:export-project-error", { detail: { message: error.message || String(error) } }));
    }
  }
  window.addEventListener("mdr2:world-ready", () => { setTimeout(restore, 100); });
  if (window.__MDR2_ACTIVE_WORLD__) setTimeout(restore, 100);
})();
