import * as CANNON from './cannon-es.mjs';

const MAX_BODIES = 512;
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function vector(value, fallback, min = -1000, max = 1000) {
  const result = value === undefined ? fallback : value;
  if (!Array.isArray(result) || result.length !== 3 || !result.every(Number.isFinite)) {
    throw new Error('Expected a finite three-component vector');
  }
  return result.map(component => clamp(component, min, max));
}

/** Optional MIT-licensed Cannon-es 3D physics world with bounded bodies and visual bindings. */
export function createCannonWorld(options = {}) {
  const gravity = vector(options.gravity, [0, -9.81, 0], -100, 100);
  const fixedTimeStep = clamp(Number(options.fixedTimeStep) || 1 / 60, 1 / 240, 1 / 20);
  const maxSubSteps = Math.floor(clamp(Number(options.maxSubSteps) || 5, 1, 10));
  const world = new CANNON.World({ gravity: new CANNON.Vec3(...gravity) });
  world.allowSleep = true;
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = clamp(Number(options.friction ?? 0.6), 0, 1);
  world.defaultContactMaterial.restitution = clamp(Number(options.restitution ?? 0.05), 0, 1);
  const bodies = new Map();
  const bindings = new Map();
  const collisionListeners = new Set();
  let disposed = false;
  let stepCount = 0;
  const ids = new WeakMap();
  const active = () => { if (disposed) throw new Error('Physics world is disposed'); };
  const checkId = id => {
    if (!safeId(id) || bodies.has(id)) throw new Error('Body ID is invalid or already in use');
    if (bodies.size >= MAX_BODIES) throw new Error('Physics body budget exceeded');
  };
  const material = options => new CANNON.Material({
    friction: clamp(Number(options.friction ?? 0.6), 0, 1),
    restitution: clamp(Number(options.restitution ?? 0.05), 0, 1),
  });
  const add = (id, shape, options = {}) => {
    active(); checkId(id);
    const position = vector(options.position, [0, 1, 0]);
    const requestedMass = clamp(Number(options.mass ?? 1), 0, 100000);
    const type = options.type === 'kinematic' ? CANNON.Body.KINEMATIC
      : requestedMass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC;
    const mass = type === CANNON.Body.DYNAMIC ? Math.max(0.001, requestedMass) : 0;
    const body = new CANNON.Body({
      mass, type, position: new CANNON.Vec3(...position),
      material: material(options), allowSleep: options.allowSleep !== false,
      linearDamping: clamp(Number(options.linearDamping ?? 0.01), 0, 1),
      angularDamping: clamp(Number(options.angularDamping ?? 0.05), 0, 1),
    });
    body.addShape(shape);
    if (Array.isArray(options.quaternion) && options.quaternion.length === 4 && options.quaternion.every(Number.isFinite)) {
      body.quaternion.set(...options.quaternion);
    } else if (Array.isArray(options.rotation) && options.rotation.length === 3 && options.rotation.every(Number.isFinite)) {
      body.quaternion.setFromEuler(...options.rotation);
    }
    world.addBody(body);
    bodies.set(id, body);
    ids.set(body, id);
    return id;
  };
  world.addEventListener('beginContact', event => {
    const contact = { type: 'begin', bodyA: ids.get(event.bodyA) || null, bodyB: ids.get(event.bodyB) || null };
    collisionListeners.forEach(listener => { try { listener(contact); } catch (_) {} });
  });

  return Object.freeze({
    createBox({ id, halfExtents = [0.5, 0.5, 0.5], ...opts } = {}) {
      const half = vector(halfExtents, [0.5, 0.5, 0.5], 0.001, 500);
      return add(id, new CANNON.Box(new CANNON.Vec3(...half)), opts);
    },
    createSphere({ id, radius = 0.5, ...opts } = {}) {
      const r = clamp(Number(radius), 0.01, 500);
      if (!Number.isFinite(r)) throw new Error('Invalid sphere radius');
      return add(id, new CANNON.Sphere(r), opts);
    },
    bindMesh(id, mesh) {
      active(); const body = bodies.get(id);
      if (!body || !mesh || !mesh.position || !mesh.quaternion) throw new Error('Body or compatible Three.js mesh is missing');
      bindings.set(id, mesh);
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
      return true;
    },
    applyImpulse(id, impulse, point = [0, 0, 0]) {
      active(); const body = bodies.get(id);
      if (!body) throw new Error('Unknown physics body');
      if (body.type !== CANNON.Body.DYNAMIC) throw new Error('Impulses require a dynamic body');
      body.applyImpulse(new CANNON.Vec3(...vector(impulse, [0, 0, 0])), new CANNON.Vec3(...vector(point, [0, 0, 0])));
      return true;
    },
    setVelocity(id, velocity) {
      active(); const body = bodies.get(id);
      if (!body) throw new Error('Unknown physics body');
      body.velocity.set(...vector(velocity, [0, 0, 0], -1000, 1000));
      body.wakeUp();
      return true;
    },
    step(delta = fixedTimeStep) {
      active();
      const elapsed = clamp(Number(delta), 0, 0.1);
      if (!Number.isFinite(elapsed)) throw new Error('Invalid physics delta');
      world.step(fixedTimeStep, elapsed, maxSubSteps);
      stepCount++;
      for (const [id, mesh] of bindings) {
        const body = bodies.get(id);
        if (!body) continue;
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
        mesh.matrixWorldNeedsUpdate = true;
      }
      return this.stats();
    },
    getState(id) {
      active(); const body = bodies.get(id);
      if (!body) throw new Error('Unknown physics body');
      return Object.freeze({
        position: [body.position.x, body.position.y, body.position.z],
        velocity: [body.velocity.x, body.velocity.y, body.velocity.z],
        quaternion: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w],
        sleeping: body.sleepState === CANNON.Body.SLEEPING,
        type: body.type === CANNON.Body.DYNAMIC ? 'dynamic' : body.type === CANNON.Body.KINEMATIC ? 'kinematic' : 'static',
      });
    },
    onCollision(listener) {
      active(); if (typeof listener !== 'function') throw new Error('Collision listener must be a function');
      collisionListeners.add(listener); return () => collisionListeners.delete(listener);
    },
    removeBody(id) {
      active(); const body = bodies.get(id);
      if (!body) return false;
      world.removeBody(body); bodies.delete(id); bindings.delete(id); return true;
    },
    stats() { return Object.freeze({ bodies: bodies.size, bindings: bindings.size, stepCount, fixedTimeStep, engine: 'Cannon-es 0.20.0' }); },
    dispose() {
      if (disposed) return;
      for (const body of bodies.values()) world.removeBody(body);
      bodies.clear(); bindings.clear(); collisionListeners.clear(); disposed = true;
    },
  });
}
