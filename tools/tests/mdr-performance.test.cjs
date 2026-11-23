'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../app/src/main/assets/mdr-performance.js'), 'utf8');
function makeSandbox() {
  const handlers = new Map();
  const sandbox = {
    console,
    Date,
    performance: { now: () => 0 },
    document: {
      hidden: false,
      addEventListener: (name, fn) => handlers.set(name, fn),
      removeEventListener: name => handlers.delete(name)
    },
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: name => handlers.delete(name)
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'mdr-performance.js' });
  return { sandbox, handlers };
}
function fakeWorld() {
  const renderer = {
    shadowMap: { enabled: true },
    pixelRatio: 2,
    setPixelRatio(value) { this.pixelRatio = value; }
  };
  const engine = { renderer, pixelRatioCap: 2, renderSystems: [] };
  const camera = { position: { x: 0, y: 0, z: 0 } };
  return { engine, renderer, camera, destroyed: false };
}

test('SmartScale attaches once and registers a render-system update', () => {
  const { sandbox } = makeSandbox();
  const world = fakeWorld();
  const governor = sandbox.MDRPerformance.attach(world);
  assert.equal(sandbox.MDRPerformance.attach(world), governor);
  assert.equal(world.engine.renderSystems.length, 1);
  assert.equal(world.performance, governor);
  assert.equal(governor.stats().enabled, true);
});

test('adaptive resolution steps down under sustained pressure and restores at dispose', () => {
  const { sandbox } = makeSandbox();
  const world = fakeWorld();
  const governor = sandbox.MDRPerformance.attach(world, { targetFrameMs: 18, sampleWindow: 10 });
  for (let i = 0; i < 150; i++) governor.update(0.04);
  assert.ok(governor.stats().scale < 1, `expected scale below 1, got ${governor.stats().scale}`);
  assert.ok(world.engine.pixelRatioCap < 2);
  governor.dispose();
  assert.equal(world.engine.pixelRatioCap, 2);
  assert.equal(world.renderer.pixelRatio, 2);
  assert.equal(world.renderer.shadowMap.enabled, true);
  assert.equal(world.engine.renderSystems.length, 0);
});

test('manual full quality disables automatic changes and restores maximum scale', () => {
  const { sandbox } = makeSandbox();
  const world = fakeWorld();
  const governor = sandbox.MDRPerformance.attach(world, { minScale: 0.5 });
  governor.setScale(0.6, 'test');
  assert.equal(governor.setEnabled(false), false);
  assert.equal(governor.stats().scale, 1);
  for (let i = 0; i < 200; i++) governor.update(0.05);
  assert.equal(governor.stats().scale, 1);
});

test('SceneBudget culls far registered objects and restores visibility on unregister', () => {
  const { sandbox } = makeSandbox();
  const camera = {
    position: { x: 0, y: 0, z: 0, clone() { return { x: this.x, y: this.y, z: this.z, copy(v) { this.x=v.x;this.y=v.y;this.z=v.z;return this; } }; },
      distanceTo(p) { return Math.hypot(this.x-p.x, this.y-p.y, this.z-p.z); } }
  };
  const world = fakeWorld(); world.camera = camera;
  const governor = sandbox.MDRPerformance.attach(world);
  const obj = {
    visible: true, castShadow: true, receiveShadow: true,
    position: { x: 500, y: 0, z: 0 }, parent: {},
    getWorldPosition(target) { return target.copy(this.position); }
  };
  governor.registerDistanceObject(obj, { maxDistance: 100, shadowDistance: 50 });
  governor.update(0.3);
  assert.equal(obj.visible, false);
  assert.equal(obj.castShadow, false);
  assert.equal(governor.unregisterDistanceObject(obj), true);
  assert.equal(obj.visible, true);
  assert.equal(obj.castShadow, true);
  governor.dispose();
});

test('SmartScale ignores invalid worlds and rejects invalid scene budget entries', () => {
  const { sandbox } = makeSandbox();
  assert.throws(() => sandbox.MDRPerformance.attach(null), /world instance/);
  assert.throws(() => sandbox.MDRPerformance.attach({}), /live MDR world renderer/);
  const world = fakeWorld();
  const governor = sandbox.MDRPerformance.attach(world);
  assert.throws(() => governor.registerDistanceObject(null), /Object3D/);
  assert.throws(() => governor.registerDistanceObject({}, { maxDistance: 0 }), /greater than zero/);
  governor.dispose();
});

test('world-ready and world-destroy lifecycle auto attach and clean up', () => {
  const { sandbox, handlers } = makeSandbox();
  const world = fakeWorld();
  handlers.get('mdr2:world-ready')({ detail: world });
  assert.ok(sandbox.MDRPerformance.get(world));
  handlers.get('mdr2:world-destroy')({ detail: world });
  assert.equal(sandbox.MDRPerformance.get(world), null);
  assert.equal(world.engine.renderSystems.length, 0);
});
