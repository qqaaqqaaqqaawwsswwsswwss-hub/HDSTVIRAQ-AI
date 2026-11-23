/* MDR Quality Studio 1.0 — mobile-aware renderer profiles and high-resolution capture. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MDRQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const PROFILES = Object.freeze({
    auto: Object.freeze({ label: "تلقائي", dprCap: 1.5, scale: 1, adaptive: true, targetFps: 55, shadows: true, pixelBudget: 5_000_000 }),
    performance: Object.freeze({ label: "أداء", dprCap: 1, scale: 1, adaptive: false, targetFps: 60, shadows: false, pixelBudget: 1_800_000 }),
    balanced: Object.freeze({ label: "متوازن", dprCap: 1.5, scale: 1, adaptive: false, targetFps: 60, shadows: true, pixelBudget: 3_500_000 }),
    high: Object.freeze({ label: "عالٍ", dprCap: 2, scale: 1, adaptive: false, targetFps: 60, shadows: true, pixelBudget: 6_000_000 }),
    ultra: Object.freeze({ label: "فائق", dprCap: 2.5, scale: 1, adaptive: false, targetFps: 60, shadows: true, pixelBudget: 8_300_000 }),
    "4k": Object.freeze({ label: "4K (حد GPU)", dprCap: 6, nativeDprLimit: false, scale: 1, adaptive: true, targetFps: 45, shadows: true, pixelBudget: 8_300_000 })
  });

  function pixelRatioFor(profileId, viewport, devicePixelRatio, capabilities = {}) {
    const profile = PROFILES[profileId];
    if (!profile) throw new RangeError("Unknown MDR quality profile");
    const width = Math.max(1, Number(viewport && viewport.width) || 1);
    const height = Math.max(1, Number(viewport && viewport.height) || 1);
    const dpr = clamp(Number(devicePixelRatio) || 1, 0.5, 3);
    const maxBuffer = Math.max(1, Number(capabilities.maxRenderbufferSize) || 8192);
    const maxTexture = Math.max(1, Number(capabilities.maxTextureSize) || 8192);
    const pixelBudget = Math.max(250_000, Number(profile.pixelBudget) || 3_500_000);
    const byBudget = Math.sqrt(pixelBudget / (width * height));
    const byBuffer = Math.min(maxBuffer, maxTexture) / Math.max(width, height);
    const deviceCap = profile.nativeDprLimit === false ? profile.dprCap : Math.min(dpr, profile.dprCap);
    return Math.round(clamp(Math.min(deviceCap, byBudget, byBuffer), 0.5, 6) * 100) / 100;
  }

  function captureDimensions(viewport, maxBufferSize, longEdge = 3840) {
    const width = Math.max(1, Number(viewport && viewport.width) || 1);
    const height = Math.max(1, Number(viewport && viewport.height) || 1);
    const limit = Math.max(1, Math.floor(Number(maxBufferSize) || 1));
    const requested = Math.max(1, Math.floor(Number(longEdge) || 3840));
    const longSide = Math.max(width, height);
    const targetLongSide = Math.min(requested, limit);
    const scale = targetLongSide / longSide;
    return {
      width: Math.max(1, Math.floor(width * scale)),
      height: Math.max(1, Math.floor(height * scale)),
      longEdge: Math.min(requested, limit),
      limited: limit < requested
    };
  }

  function getCapabilities(renderer) {
    const gl = renderer && typeof renderer.getContext === "function" ? renderer.getContext() : null;
    if (!gl || typeof gl.getParameter !== "function") return { maxRenderbufferSize: 2048, maxTextureSize: 2048 };
    return {
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 2048,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048
    };
  }

  function applyProfile(world, profileId, devicePixelRatio = 1, documentRef) {
    const profile = PROFILES[profileId];
    if (!profile) throw new RangeError("Unknown MDR quality profile");
    if (!world || !world.engine || !world.engine.renderer || !world.canvas) throw new Error("MDR world renderer is not ready");
    const rect = world.canvas.getBoundingClientRect ? world.canvas.getBoundingClientRect() : { width: world.canvas.width, height: world.canvas.height };
    const cap = pixelRatioFor(profileId, rect, devicePixelRatio, getCapabilities(world.engine.renderer));
    const governor = world.performance || (documentRef && documentRef.defaultView && documentRef.defaultView.MDRPerformance && documentRef.defaultView.MDRPerformance.get(world));
    if (governor && typeof governor.setQualityProfile === "function") {
      governor.baseShadowEnabled = profile.shadows;
      governor.setQualityProfile({
        pixelRatioCap: cap,
        minScale: profile.adaptive ? 0.45 : 1,
        maxScale: 1,
        targetFrameMs: 1000 / profile.targetFps,
        scale: 1,
        adaptive: profile.adaptive,
        name: profileId
      });
    } else {
      world.engine.pixelRatioCap = cap;
      world.engine.renderer.setPixelRatio(cap);
      if (world.engine.renderer.shadowMap) world.engine.renderer.shadowMap.enabled = profile.shadows;
    }
    try {
      if (root && root.localStorage) root.localStorage.setItem("mdr.graphics.profile", profileId);
    } catch (_) { /* Storage may be disabled in private browsing. */ }
    return { profile: profileId, label: profile.label, pixelRatioCap: cap, adaptive: profile.adaptive, shadows: profile.shadows };
  }

  return Object.freeze({ PROFILES, pixelRatioFor, captureDimensions, getCapabilities, applyProfile, clamp });
});
