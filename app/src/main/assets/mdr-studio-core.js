/* MDR Studio project data core — versioned, bounded and data-only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MDRStudioCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = 3;
  const MAX_OBJECTS = 500;
  const MAX_JSON_CHARS = 2_000_000;
  const TYPES = new Set(["box", "sphere", "cylinder", "directionalLight", "glb"]);
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function createProject(name = "MDR Scene") { return { schema: "mdr-scene", version: VERSION, name: String(name).slice(0, 80), objects: [] }; }
  function normalizeObject(input, fallbackId = "") {
    if (!input || typeof input !== "object") throw new Error("Invalid scene object");
    const type = String(input.type || "");
    if (!TYPES.has(type)) throw new Error("Unsupported scene object type");
    const vector = (value, fallback, min, max) => {
      const src = Array.isArray(value) ? value : fallback;
      if (src.length !== 3 || !src.every(finite)) throw new Error("Invalid transform vector");
      return src.map(v => clamp(v, min, max));
    };
    const item = { id: String(input.id || fallbackId || ""), type, name: String(input.name || type).slice(0, 80),
      position: vector(input.position, [0, 1, 0], -500, 500), rotation: vector(input.rotation, [0, 0, 0], -Math.PI * 100, Math.PI * 100),
      scale: vector(input.scale, [1, 1, 1], 0.05, 50), color: /^#[0-9a-f]{6}$/i.test(input.color || "") ? input.color : "#8da9c4" };
    if (input.physics !== undefined && input.physics !== null) {
      const physics = input.physics;
      if (!physics || typeof physics !== "object" || Array.isArray(physics)) throw new Error("Invalid physics body settings");
      const bodyType = String(physics.type || "dynamic");
      const shape = String(physics.shape || (type === "sphere" ? "sphere" : "box"));
      if (!["static", "dynamic", "kinematic"].includes(bodyType) || !["box", "sphere"].includes(shape)) throw new Error("Invalid physics body type or shape");
      const mass = physics.mass === undefined ? 1 : physics.mass;
      const friction = physics.friction === undefined ? 0.65 : physics.friction;
      const restitution = physics.restitution === undefined ? 0.08 : physics.restitution;
      if (![mass, friction, restitution].every(finite)) throw new Error("Physics values must be finite numbers");
      item.physics = { type: bodyType, shape, mass: clamp(mass, 0.001, 10000), friction: clamp(friction, 0, 1), restitution: clamp(restitution, 0, 1) };
    }
    if (type === "glb") {
      const assetId = String(input.assetId || "");
      if (!/^asset-[a-z0-9-]{4,90}$/i.test(assetId)) throw new Error("Invalid GLB asset ID");
      item.assetId = assetId;
      item.fileName = String(input.fileName || "model.glb").replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 120);
    }
    return item;
  }
  function validateProject(input) {
    if (!input || input.schema !== "mdr-scene" || ![1, 2, VERSION].includes(input.version) || !Array.isArray(input.objects))
      throw new Error("Invalid or unsupported MDR scene project");
    if (input.objects.length > MAX_OBJECTS) throw new Error("Scene object limit exceeded");
    const seen = new Set();
    const objects = input.objects.map((obj, index) => {
      const migrated = input.version === 1 && obj && obj.type === "pointLight" ? { ...obj, type: "directionalLight" } : obj;
      const item = normalizeObject(migrated, `object-${index + 1}`);
      if (!item.id || seen.has(item.id)) throw new Error("Missing or duplicate object ID");
      seen.add(item.id);
      return item;
    });
    return { schema: "mdr-scene", version: VERSION, name: String(input.name || "MDR Scene").slice(0, 80), objects };
  }
  function serialize(project) {
    const text = JSON.stringify(validateProject(project), null, 2);
    if (text.length > MAX_JSON_CHARS) throw new Error("Scene project is too large to export");
    return text;
  }
  function parse(text) {
    if (typeof text !== "string" || text.length > MAX_JSON_CHARS) throw new Error("Scene file is invalid or too large");
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error("Scene file is not valid JSON"); }
    return validateProject(data);
  }
  return Object.freeze({ VERSION, MAX_OBJECTS, MAX_JSON_CHARS, TYPES: Object.freeze(Array.from(TYPES)), createProject, normalizeObject, validateProject, serialize, parse });
});
