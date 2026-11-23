/* MDR SmartScale 1.0 — adaptive rendering budget and opt-in distance LOD.
 * Designed for Three.js renderers on mobile WebGL. No external dependencies.
 */
(function (root) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  class SceneBudget {
    constructor(camera, options = {}) {
      this.camera = camera;
      this.entries = new Map();
      this.updateInterval = clamp(finite(options.updateInterval, 0.2), 0.05, 2);
      this.elapsed = 0;
      this.lastCount = 0;
      this.tmpPosition = camera && camera.position && typeof camera.position.clone === "function"
        ? camera.position.clone() : null;
      this.tmpCamera = camera && camera.position && typeof camera.position.clone === "function"
        ? camera.position.clone() : null;
    }

    register(object, options = {}) {
      if (!object || typeof object !== "object") throw new TypeError("Scene budget requires an Object3D");
      const maxDistance = finite(options.maxDistance, 120);
      if (maxDistance <= 0) throw new RangeError("maxDistance must be greater than zero");
      const entry = {
        object,
        maxDistance,
        shadowDistance: Math.max(0, finite(options.shadowDistance, maxDistance * 0.6)),
        baseVisible: object.visible !== false,
        baseCastShadow: object.castShadow,
        baseReceiveShadow: object.receiveShadow,
        visible: object.visible !== false,
        distance: Infinity
      };
      this.entries.set(object, entry);
      return () => this.unregister(object);
    }

    unregister(object) {
      const entry = this.entries.get(object);
      if (!entry) return false;
      entry.object.visible = entry.baseVisible;
      if (typeof entry.baseCastShadow === "boolean") entry.object.castShadow = entry.baseCastShadow;
      if (typeof entry.baseReceiveShadow === "boolean") entry.object.receiveShadow = entry.baseReceiveShadow;
      this.entries.delete(object);
      return true;
    }

    update(dt, camera = this.camera, qualityScale = 1) {
      if (!camera || !camera.position || !this.tmpPosition) return this.stats();
      this.elapsed += Math.max(0, finite(dt, 0));
      if (this.elapsed < this.updateInterval) return this.stats();
      this.elapsed = 0;
      const quality = clamp(finite(qualityScale, 1), 0.5, 1);
      let visibleCount = 0;
      for (const entry of this.entries.values()) {
        const object = entry.object;
        if (!object || object.parent === null) continue;
        if (typeof object.getWorldPosition === "function") object.getWorldPosition(this.tmpPosition);
        else if (object.position) this.tmpPosition.copy(object.position);
        else continue;
        const distance = camera.position.distanceTo(this.tmpPosition);
        entry.distance = distance;
        // A little hysteresis avoids rapid show/hide flicker at the boundary.
        const showAt = entry.maxDistance * quality;
        const hideAt = showAt * 1.08;
        if (entry.visible) {
          if (distance > hideAt) entry.visible = false;
        } else if (distance < showAt) {
          entry.visible = true;
        }
        object.visible = entry.baseVisible && entry.visible;
        if (typeof entry.baseCastShadow === "boolean") object.castShadow = entry.baseCastShadow && distance <= entry.shadowDistance * quality;
        if (typeof entry.baseReceiveShadow === "boolean") object.receiveShadow = entry.baseReceiveShadow && distance <= entry.shadowDistance * quality;
        if (object.visible) visibleCount++;
      }
      this.lastCount = visibleCount;
      return this.stats();
    }

    stats() { return { registered: this.entries.size, visible: this.lastCount }; }

    dispose() {
      for (const object of [...this.entries.keys()]) this.unregister(object);
      this.camera = null;
      this.tmpPosition = null;
      this.tmpCamera = null;
    }
  }

  class PerformanceGovernor {
    constructor(world, options = {}) {
      if (!world || !world.engine || !world.engine.renderer) throw new Error("MDR SmartScale requires a live MDR world renderer");
      this.world = world;
      this.engine = world.engine;
      this.renderer = world.engine.renderer;
      this.camera = world.camera || world.engine.camera;
      this.enabled = options.enabled !== false;
      this.targetFrameMs = clamp(finite(options.targetFrameMs, 1000 / 55), 12, 40);
      this.minScale = clamp(finite(options.minScale, 0.55), 0.35, 1);
      this.maxScale = clamp(finite(options.maxScale, 1), this.minScale, 1);
      this.scale = this.maxScale;
      this.avgFrameMs = this.targetFrameMs;
      this.sampleCount = 0;
      this.overBudgetTime = 0;
      this.underBudgetTime = 0;
      this.lastDecision = "initial";
      this.lastAdjustmentMs = 0;
      this.basePixelRatioCap = clamp(finite(this.engine.pixelRatioCap, 1), 0.5, 3);
      this.originalPixelRatioCap = this.basePixelRatioCap;
      this.baseShadowEnabled = this.renderer.shadowMap ? this.renderer.shadowMap.enabled : false;
      this.originalShadowEnabled = this.baseShadowEnabled;
      this.sceneBudget = new SceneBudget(this.camera, options.sceneBudget || {});
      this.frameStats = { fps: 0, frameMs: 0, scale: this.scale, pixelRatio: 0, visibleObjects: 0, registeredObjects: 0, adjustments: 0 };
      this._sampleWindow = [];
      this._sampleWindowSize = clamp(Math.floor(finite(options.sampleWindow, 45)), 10, 180);
      this._lastUiUpdate = 0;
      this._ui = null;
      this._mountUI();
      this._system = (engine, dt) => this.update(dt);
      this.engine.renderSystems.push(this._system);
      this._visibilityHandler = () => {
        if (root.document && root.document.hidden) {
          this.overBudgetTime = 0;
          this.underBudgetTime = 0;
        }
      };
      if (root.document) root.document.addEventListener("visibilitychange", this._visibilityHandler);
      this._applyQuality();
    }

    _mountUI() {
      if (!root.document || !root.document.createElement) return;
      const button = root.document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Toggle MDR SmartScale adaptive graphics");
      button.style.cssText = "position:fixed;z-index:70;right:10px;bottom:10px;max-width:calc(100vw - 20px);padding:7px 10px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(10,16,25,.84);color:#dcecff;font:600 10px/1.2 system-ui,sans-serif;letter-spacing:.1px;backdrop-filter:blur(8px);box-shadow:0 4px 18px rgba(0,0,0,.28);cursor:pointer;";
      button.addEventListener("click", () => this.setEnabled(!this.enabled));
      root.document.body && root.document.body.appendChild(button);
      this._ui = button;
      this._refreshUI(true);
    }

    _refreshUI(force = false) {
      if (!this._ui) return;
      const now = Date.now();
      if (!force && now - this._lastUiUpdate < 500) return;
      this._lastUiUpdate = now;
      const mode = this.enabled ? "AUTO" : "FULL";
      this._ui.textContent = `MDR SmartScale · ${mode} · ${Math.round(this.scale * 100)}% · ${this.frameStats.fps} FPS`;
      this._ui.setAttribute("aria-pressed", String(this.enabled));
    }

    setEnabled(enabled) {
      this.enabled = enabled === true;
      if (!this.enabled) this.setScale(this.maxScale, "manual-profile");
      else this._applyQuality();
      this._refreshUI(true);
      return this.enabled;
    }

    setQualityProfile(options = {}) {
      const cap = clamp(finite(options.pixelRatioCap, this.basePixelRatioCap), 0.5, 6);
      this.basePixelRatioCap = cap;
      this.minScale = clamp(finite(options.minScale, this.minScale), 0.35, 1);
      this.maxScale = clamp(finite(options.maxScale, this.maxScale), this.minScale, 1);
      this.targetFrameMs = clamp(finite(options.targetFrameMs, this.targetFrameMs), 12, 40);
      this.scale = clamp(finite(options.scale, this.maxScale), this.minScale, this.maxScale);
      this.enabled = options.adaptive === true;
      this.lastDecision = String(options.name || "quality-profile").slice(0, 40);
      this._applyQuality();
      this._refreshUI(true);
      return this.stats();
    }

    setScale(nextScale, reason = "manual") {
      const next = clamp(finite(nextScale, this.scale), this.minScale, this.maxScale);
      if (Math.abs(next - this.scale) < 0.015) return false;
      this.scale = Math.round(next * 100) / 100;
      this.lastDecision = reason;
      this.lastAdjustmentMs = Date.now();
      this.frameStats.adjustments++;
      this._applyQuality();
      return true;
    }

    _applyQuality() {
      const pixelRatio = clamp(this.basePixelRatioCap * this.scale, 0.5, this.basePixelRatioCap);
      this.engine.pixelRatioCap = pixelRatio;
      if (typeof this.renderer.setPixelRatio === "function") this.renderer.setPixelRatio(pixelRatio);
      if (this.renderer.shadowMap) {
        // Keep shadows enabled on high quality; disable only at the lowest scale.
        this.renderer.shadowMap.enabled = this.baseShadowEnabled && this.scale > this.minScale + 0.04;
      }
      this.frameStats.scale = this.scale;
      this.frameStats.pixelRatio = pixelRatio;
    }

    update(dt) {
      const frameMs = clamp(finite(dt, 0) * 1000, 0, 250);
      if (frameMs <= 0) return this.stats();
      this._sampleWindow.push(frameMs);
      if (this._sampleWindow.length > this._sampleWindowSize) this._sampleWindow.shift();
      const recent = this._sampleWindow.reduce((sum, value) => sum + value, 0) / this._sampleWindow.length;
      this.avgFrameMs += (recent - this.avgFrameMs) * 0.14;
      this.sampleCount++;
      this.frameStats.frameMs = Math.round(this.avgFrameMs * 10) / 10;
      this.frameStats.fps = Math.round(1000 / Math.max(1, this.avgFrameMs));

      if (this.enabled && !(root.document && root.document.hidden)) {
        if (this.avgFrameMs > this.targetFrameMs * 1.16) {
          this.overBudgetTime += dt;
          this.underBudgetTime = 0;
        } else if (this.avgFrameMs < this.targetFrameMs * 0.78) {
          this.underBudgetTime += dt;
          this.overBudgetTime = 0;
        } else {
          this.overBudgetTime = Math.max(0, this.overBudgetTime - dt * 0.5);
          this.underBudgetTime = Math.max(0, this.underBudgetTime - dt * 0.5);
        }
        if (this.overBudgetTime >= 1.1 && Date.now() - this.lastAdjustmentMs > 900) {
          const pressure = this.avgFrameMs / this.targetFrameMs;
          this.setScale(this.scale - (pressure > 1.65 ? 0.12 : 0.06), "frame-pressure");
          this.overBudgetTime = 0;
        } else if (this.underBudgetTime >= 3.5 && Date.now() - this.lastAdjustmentMs > 1800) {
          this.setScale(this.scale + 0.04, "headroom");
          this.underBudgetTime = 0;
        }
      }
      const budgetStats = this.sceneBudget.update(dt, this.camera, this.scale);
      this.frameStats.visibleObjects = budgetStats.visible;
      this.frameStats.registeredObjects = budgetStats.registered;
      this._refreshUI();
      return this.stats();
    }

    registerDistanceObject(object, options = {}) { return this.sceneBudget.register(object, options); }
    unregisterDistanceObject(object) { return this.sceneBudget.unregister(object); }
    stats() { return { ...this.frameStats, enabled: this.enabled, decision: this.lastDecision, sampleCount: this.sampleCount }; }

    dispose() {
      const index = this.engine && this.engine.renderSystems ? this.engine.renderSystems.indexOf(this._system) : -1;
      if (index >= 0) this.engine.renderSystems.splice(index, 1);
      if (root.document) root.document.removeEventListener("visibilitychange", this._visibilityHandler);
      this.sceneBudget.dispose();
      this._applyRestore();
      if (this._ui && this._ui.parentNode) this._ui.parentNode.removeChild(this._ui);
      this._ui = null;
      this.world = this.engine = this.renderer = this.camera = null;
    }

    _applyRestore() {
      if (this.engine) this.engine.pixelRatioCap = this.originalPixelRatioCap;
      if (this.renderer && typeof this.renderer.setPixelRatio === "function") this.renderer.setPixelRatio(this.originalPixelRatioCap);
      if (this.renderer && this.renderer.shadowMap) this.renderer.shadowMap.enabled = this.originalShadowEnabled;
    }
  }

  const attached = new WeakMap();
  function attach(world, options = {}) {
    if (!world || typeof world !== "object") throw new TypeError("A world instance is required");
    const existing = attached.get(world);
    if (existing) return existing;
    const governor = new PerformanceGovernor(world, options);
    attached.set(world, governor);
    world.performance = governor;
    return governor;
  }

  function autoAttach(world) {
    if (!world || world.destroyed || !world.engine || !world.engine.renderer) return null;
    try { return attach(world); }
    catch (error) {
      if (root.console && typeof root.console.warn === "function") root.console.warn("MDR SmartScale could not attach", error);
      return null;
    }
  }

  root.MDRPerformance = Object.freeze({
    VERSION: "1.0.0",
    PerformanceGovernor,
    SceneBudget,
    attach,
    get(world) { return world && attached.get(world) || null; }
  });

  if (root.addEventListener) {
    root.addEventListener("mdr2:world-ready", event => autoAttach(event.detail));
    root.addEventListener("mdr2:world-destroy", event => {
      const world = event.detail || root.__MDR2_ACTIVE_WORLD__;
      const governor = world && attached.get(world);
      if (governor) { governor.dispose(); attached.delete(world); try { delete world.performance; } catch (_) {} }
    });
  }
  // In case the game world was created before this optional runtime finished loading.
  if (root.__MDR2_ACTIVE_WORLD__) autoAttach(root.__MDR2_ACTIVE_WORLD__);
})(typeof window !== "undefined" ? window : globalThis);
