/* MDR Physics 0.1 — deterministic fixed-step primitive rigid-body foundation.
 * Axis-aligned box and sphere colliders; no angular dynamics or constraints yet.
 */
(function (root) {
  "use strict";

  const MAX_BODIES = 2048;
  const EPSILON = 1e-8;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const vec3 = (value, fallback) => {
    if (Array.isArray(value) && value.length >= 3) {
      return { x: finite(value[0], fallback.x), y: finite(value[1], fallback.y), z: finite(value[2], fallback.z) };
    }
    if (value && typeof value === "object") {
      return { x: finite(value.x, fallback.x), y: finite(value.y, fallback.y), z: finite(value.z, fallback.z) };
    }
    return { ...fallback };
  };
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const length = value => Math.sqrt(dot(value, value));
  const normalize = value => {
    const magnitude = length(value);
    return magnitude > EPSILON ? { x: value.x / magnitude, y: value.y / magnitude, z: value.z / magnitude } : { x: 0, y: 1, z: 0 };
  };
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const mul = (a, scalar) => ({ x: a.x * scalar, y: a.y * scalar, z: a.z * scalar });
  const pairKey = (a, b) => a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;

  function bounds(body) {
    const p = body.position;
    const e = body.shape === "sphere" ? { x: body.radius, y: body.radius, z: body.radius } : body.halfExtents;
    return {
      min: { x: p.x - e.x, y: p.y - e.y, z: p.z - e.z },
      max: { x: p.x + e.x, y: p.y + e.y, z: p.z + e.z }
    };
  }

  function overlapAABB(a, b) {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z;
  }

  function boxBox(a, b) {
    const aa = bounds(a), bb = bounds(b);
    const ox = Math.min(aa.max.x - bb.min.x, bb.max.x - aa.min.x);
    const oy = Math.min(aa.max.y - bb.min.y, bb.max.y - aa.min.y);
    const oz = Math.min(aa.max.z - bb.min.z, bb.max.z - aa.min.z);
    if (ox <= 0 || oy <= 0 || oz <= 0) return null;
    const delta = sub(b.position, a.position);
    if (ox <= oy && ox <= oz) return { normal: { x: delta.x >= 0 ? 1 : -1, y: 0, z: 0 }, penetration: ox };
    if (oy <= oz) return { normal: { x: 0, y: delta.y >= 0 ? 1 : -1, z: 0 }, penetration: oy };
    return { normal: { x: 0, y: 0, z: delta.z >= 0 ? 1 : -1 }, penetration: oz };
  }

  function sphereSphere(a, b) {
    const delta = sub(b.position, a.position);
    const distanceSquared = dot(delta, delta);
    const radius = a.radius + b.radius;
    if (distanceSquared >= radius * radius) return null;
    const distance = Math.sqrt(distanceSquared);
    return { normal: distance > EPSILON ? mul(delta, 1 / distance) : { x: 0, y: 1, z: 0 }, penetration: radius - distance };
  }

  function sphereBox(sphere, box) {
    const h = box.halfExtents, c = box.position, p = sphere.position;
    const closest = {
      x: clamp(p.x, c.x - h.x, c.x + h.x),
      y: clamp(p.y, c.y - h.y, c.y + h.y),
      z: clamp(p.z, c.z - h.z, c.z + h.z)
    };
    const towardBox = sub(closest, p);
    const distanceSquared = dot(towardBox, towardBox);
    if (distanceSquared > sphere.radius * sphere.radius) return null;
    if (distanceSquared > EPSILON) {
      const distance = Math.sqrt(distanceSquared);
      return { normal: mul(towardBox, 1 / distance), penetration: sphere.radius - distance };
    }
    // Sphere center is inside the box: choose the nearest face and push it out.
    const dx = h.x - Math.abs(p.x - c.x), dy = h.y - Math.abs(p.y - c.y), dz = h.z - Math.abs(p.z - c.z);
    if (dx <= dy && dx <= dz) return { normal: { x: p.x >= c.x ? -1 : 1, y: 0, z: 0 }, penetration: sphere.radius + dx };
    if (dy <= dz) return { normal: { x: 0, y: p.y >= c.y ? -1 : 1, z: 0 }, penetration: sphere.radius + dy };
    return { normal: { x: 0, y: 0, z: p.z >= c.z ? -1 : 1 }, penetration: sphere.radius + dz };
  }

  function collide(a, b) {
    if (a.shape === "sphere" && b.shape === "sphere") return sphereSphere(a, b);
    if (a.shape === "box" && b.shape === "box") return boxBox(a, b);
    if (a.shape === "sphere" && b.shape === "box") return sphereBox(a, b);
    const contact = sphereBox(b, a);
    return contact ? { normal: mul(contact.normal, -1), penetration: contact.penetration } : null;
  }

  class World {
    constructor(options = {}) {
      this.gravity = vec3(options.gravity, { x: 0, y: -9.81, z: 0 });
      this.maxBodies = clamp(Math.floor(finite(options.maxBodies, MAX_BODIES)), 1, MAX_BODIES);
      this.solverIterations = clamp(Math.floor(finite(options.solverIterations, 6)), 1, 12);
      this.maxPairs = clamp(Math.floor(finite(options.maxPairs, 16384)), 128, 65536);
      this.positionCorrection = clamp(finite(options.positionCorrection, 0.72), 0.1, 1);
      this.bodies = new Map();
      this.listeners = new Map();
      this.nextId = 1;
      this.previousPairs = new Map();
      this.disposed = false;
      this.metrics = { steps: 0, bodies: 0, candidatePairs: 0, contacts: 0, activePairs: 0, pairBudgetExceeded: false, lastStepMs: 0 };
    }

    addBody(options = {}) {
      if (this.disposed) throw new Error("Physics world is disposed");
      if (this.bodies.size >= this.maxBodies) throw new Error(`Physics body limit (${this.maxBodies}) reached`);
      const type = options.type || "dynamic";
      const shape = options.shape || "box";
      if (!["static", "dynamic", "kinematic"].includes(type)) throw new Error("Body type must be static, dynamic, or kinematic");
      if (!["box", "sphere"].includes(shape)) throw new Error("Collider shape must be box or sphere");
      const position = vec3(options.position, { x: 0, y: 0, z: 0 });
      const velocity = vec3(options.velocity, { x: 0, y: 0, z: 0 });
      const size = vec3(options.size, { x: 1, y: 1, z: 1 });
      const id = this.nextId++;
      const mass = Math.max(0.001, finite(options.mass, 1));
      const body = {
        id, name: String(options.name || `Body ${id}`).slice(0, 80), type, shape,
        position, velocity, force: { x: 0, y: 0, z: 0 },
        halfExtents: {
          x: Math.max(0.001, Math.abs(size.x) / 2),
          y: Math.max(0.001, Math.abs(size.y) / 2),
          z: Math.max(0.001, Math.abs(size.z) / 2)
        },
        radius: Math.max(0.001, finite(options.radius, 0.5)),
        mass, invMass: type === "dynamic" ? 1 / mass : 0,
        restitution: clamp(finite(options.restitution, 0.08), 0, 1),
        friction: clamp(finite(options.friction, 0.65), 0, 1),
        linearDamping: clamp(finite(options.linearDamping, 0.02), 0, 20),
        gravityScale: clamp(finite(options.gravityScale, 1), -10, 10),
        group: (Math.floor(finite(options.group, 1)) >>> 0) || 1,
        mask: Math.floor(finite(options.mask, 0xffffffff)) >>> 0,
        sensor: options.sensor === true,
        object: options.object || null,
        userData: options.userData && typeof options.userData === "object" ? options.userData : null,
        enabled: options.enabled !== false
      };
      if (type === "static") body.velocity = { x: 0, y: 0, z: 0 };
      this.bodies.set(id, body);
      this.metrics.bodies = this.bodies.size;
      this._syncObject(body);
      return body;
    }

    removeBody(id) {
      const body = this.bodies.get(Number(id));
      if (!body) return false;
      this.bodies.delete(body.id);
      this.metrics.bodies = this.bodies.size;
      for (const [key, pair] of this.previousPairs) {
        if (pair.a.id === body.id || pair.b.id === body.id) {
          this._emit(pair.sensor ? "trigger-exit" : "collision-end", { ...pair, removed: true });
          this.previousPairs.delete(key);
        }
      }
      return true;
    }

    getBody(id) { return this.bodies.get(Number(id)) || null; }

    applyForce(id, force) {
      const body = this.getBody(id);
      if (!body || body.type !== "dynamic") return false;
      body.force = add(body.force, vec3(force, { x: 0, y: 0, z: 0 }));
      return true;
    }

    applyImpulse(id, impulse) {
      const body = this.getBody(id);
      if (!body || body.type !== "dynamic") return false;
      body.velocity = add(body.velocity, mul(vec3(impulse, { x: 0, y: 0, z: 0 }), body.invMass));
      return true;
    }

    setVelocity(id, velocity) {
      const body = this.getBody(id);
      if (!body || body.type === "static") return false;
      body.velocity = vec3(velocity, { x: 0, y: 0, z: 0 });
      return true;
    }

    teleport(id, position, clearVelocity = true) {
      const body = this.getBody(id);
      if (!body) return false;
      body.position = vec3(position, body.position);
      if (clearVelocity) body.velocity = { x: 0, y: 0, z: 0 };
      this._syncObject(body);
      return true;
    }

    on(eventName, callback) {
      if (typeof callback !== "function") throw new TypeError("Physics event callback must be a function");
      const list = this.listeners.get(eventName) || new Set();
      list.add(callback); this.listeners.set(eventName, list);
      return () => { list.delete(callback); if (!list.size) this.listeners.delete(eventName); };
    }

    _emit(eventName, payload) {
      const callbacks = this.listeners.get(eventName);
      if (!callbacks) return;
      for (const callback of [...callbacks]) {
        try { callback(payload); }
        catch (error) {
          if (eventName !== "listener-error") this._emit("listener-error", { eventName, error });
          else if (root.console && typeof root.console.error === "function") root.console.error("MDR Physics listener failed", error);
        }
      }
    }

    _syncObject(body) {
      const target = body.object && body.object.position;
      if (target && typeof target.set === "function") target.set(body.position.x, body.position.y, body.position.z);
      else if (target) Object.assign(target, body.position);
    }

    _broadphase() {
      const collidables = [...this.bodies.values()].filter(body => body.enabled).map(body => ({ body, aabb: bounds(body) }));
      collidables.sort((a, b) => a.aabb.min.x - b.aabb.min.x || a.body.id - b.body.id);
      const pairs = [];
      let truncated = false;
      outer: for (let i = 0; i < collidables.length; i++) {
        const a = collidables[i];
        for (let j = i + 1; j < collidables.length; j++) {
          const b = collidables[j];
          if (b.aabb.min.x > a.aabb.max.x) break;
          if (a.body.invMass === 0 && b.body.invMass === 0) continue;
          if (((a.body.group & b.body.mask) >>> 0) === 0 || ((b.body.group & a.body.mask) >>> 0) === 0) continue;
          if (!overlapAABB(a.aabb, b.aabb)) continue;
          if (pairs.length >= this.maxPairs) { truncated = true; break outer; }
          pairs.push([a.body, b.body]);
        }
      }
      return { pairs, truncated };
    }

    _resolve(a, b, contact) {
      if (a.sensor || b.sensor) return;
      const invMass = a.invMass + b.invMass;
      if (invMass <= 0) return;
      const normal = contact.normal;
      const relativeVelocity = sub(b.velocity, a.velocity);
      const velocityAlongNormal = dot(relativeVelocity, normal);
      let normalImpulse = 0;
      if (velocityAlongNormal < 0) {
        const restitution = Math.min(a.restitution, b.restitution);
        normalImpulse = -(1 + restitution) * velocityAlongNormal / invMass;
        const impulse = mul(normal, normalImpulse);
        if (a.invMass) a.velocity = sub(a.velocity, mul(impulse, a.invMass));
        if (b.invMass) b.velocity = add(b.velocity, mul(impulse, b.invMass));

        const afterRelative = sub(b.velocity, a.velocity);
        const tangentRaw = sub(afterRelative, mul(normal, dot(afterRelative, normal)));
        const tangentLength = length(tangentRaw);
        if (tangentLength > EPSILON) {
          const tangent = mul(tangentRaw, 1 / tangentLength);
          let frictionImpulse = -dot(afterRelative, tangent) / invMass;
          const frictionLimit = normalImpulse * Math.sqrt(a.friction * b.friction);
          frictionImpulse = clamp(frictionImpulse, -frictionLimit, frictionLimit);
          const friction = mul(tangent, frictionImpulse);
          if (a.invMass) a.velocity = sub(a.velocity, mul(friction, a.invMass));
          if (b.invMass) b.velocity = add(b.velocity, mul(friction, b.invMass));
        }
      }
      const correctionMagnitude = Math.max(contact.penetration - 0.002, 0) * this.positionCorrection / invMass;
      const correction = mul(normal, correctionMagnitude);
      if (a.invMass) a.position = sub(a.position, mul(correction, a.invMass));
      if (b.invMass) b.position = add(b.position, mul(correction, b.invMass));
    }

    step(dt) {
      if (this.disposed) return;
      const delta = finite(dt, 0);
      if (delta <= 0 || delta > 0.25) throw new RangeError("Physics step must be between 0 and 0.25 seconds");
      const start = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      for (const body of this.bodies.values()) {
        if (body.type !== "dynamic" && body.type !== "kinematic") continue;
        if (body.type === "dynamic") {
          body.velocity = add(body.velocity, mul(add(this.gravity, mul(body.force, body.invMass)), body.gravityScale * delta));
          const damping = Math.max(0, 1 - body.linearDamping * delta);
          body.velocity = mul(body.velocity, damping);
        }
        body.position = add(body.position, mul(body.velocity, delta));
        body.force = { x: 0, y: 0, z: 0 };
      }

      const broadphase = this._broadphase();
      const candidates = broadphase.pairs;
      if (broadphase.truncated) this._emit("pair-budget-exceeded", { maxPairs: this.maxPairs, candidates: candidates.length });
      let contacts = [];
      for (let iteration = 0; iteration < this.solverIterations; iteration++) {
        contacts = [];
        for (const [a, b] of candidates) {
          const contact = collide(a, b);
          if (!contact) continue;
          const key = pairKey(a, b);
          contacts.push({ key, a, b, normal: contact.normal, penetration: contact.penetration, sensor: a.sensor || b.sensor });
          if (iteration === 0 || !a.sensor && !b.sensor) this._resolve(a, b, contact);
        }
      }

      const currentPairs = new Map();
      for (const contact of contacts) {
        const payload = { a: contact.a, b: contact.b, normal: contact.normal, penetration: contact.penetration, sensor: contact.sensor };
        currentPairs.set(contact.key, payload);
        const previous = this.previousPairs.has(contact.key);
        this._emit(contact.sensor ? (previous ? "trigger-stay" : "trigger-enter") : (previous ? "collision-stay" : "collision-start"), payload);
      }
      for (const [key, pair] of this.previousPairs) {
        if (!currentPairs.has(key)) this._emit(pair.sensor ? "trigger-exit" : "collision-end", pair);
      }
      this.previousPairs = currentPairs;
      for (const body of this.bodies.values()) this._syncObject(body);

      this.metrics.steps++;
      this.metrics.bodies = this.bodies.size;
      this.metrics.candidatePairs = candidates.length;
      this.metrics.contacts = contacts.length;
      this.metrics.pairBudgetExceeded = broadphase.truncated;
      this.metrics.activePairs = currentPairs.size;
      const end = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      this.metrics.lastStepMs = Math.max(0, end - start);
    }

    getStats() { return { ...this.metrics, gravity: { ...this.gravity }, maxBodies: this.maxBodies }; }

    dispose() {
      this.bodies.clear(); this.listeners.clear(); this.previousPairs.clear(); this.metrics.bodies = 0; this.disposed = true;
    }
  }

  root.MDRPhysics = Object.freeze({ World, MAX_BODIES, VERSION: "0.1.0" });
})(typeof window !== "undefined" ? window : globalThis);
