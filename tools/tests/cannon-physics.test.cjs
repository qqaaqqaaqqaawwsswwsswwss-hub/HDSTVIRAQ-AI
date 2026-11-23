const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const apiPromise = import('../../app/src/main/assets/mdr-cannon-physics.mjs');

test('Pro Cannon-es world settles a dynamic sphere on a static floor', async () => {
  const { createCannonWorld } = await apiPromise;
  const sim = createCannonWorld();
  sim.createBox({ id: 'floor', halfExtents: [5, .5, 5], position: [0, -.5, 0], mass: 0 });
  sim.createSphere({ id: 'ball', radius: .5, position: [0, 5, 0], mass: 1 });
  for (let i = 0; i < 240; i++) sim.step(1 / 60);
  const state = sim.getState('ball');
  assert.ok(Math.abs(state.position[1] - .5) < .02);
  assert.equal(state.type, 'dynamic');
  assert.equal(sim.stats().bodies, 2);
  assert.equal(sim.stats().engine, 'Cannon-es 0.20.0');
  sim.dispose();
});

test('Cannon-es adapter validates identifiers, shapes and dynamic impulses', async () => {
  const { createCannonWorld } = await apiPromise;
  const sim = createCannonWorld();
  sim.createBox({ id: 'block', mass: 2 });
  assert.throws(() => sim.createSphere({ id: 'block' }), /invalid or already/);
  assert.throws(() => sim.createSphere({ id: 'bad id' }), /invalid or already/);
  assert.throws(() => sim.createBox({ id: 'invalid', halfExtents: [1, NaN, 1] }), /finite/);
  assert.throws(() => sim.applyImpulse('missing', [1, 0, 0]), /Unknown/);
  sim.applyImpulse('block', [1, 2, 0]);
  sim.step(1 / 60);
  assert.ok(sim.getState('block').velocity[0] > 0);
  assert.equal(sim.removeBody('block'), true);
  sim.dispose();
  assert.throws(() => sim.step(1 / 60), /disposed/);
});

test('Cannon-es binds Three-style transforms and emits contact notifications', async () => {
  const { createCannonWorld } = await apiPromise;
  const sim = createCannonWorld();
  const seen = [];
  sim.onCollision(event => seen.push(event));
  sim.createBox({ id: 'floor', halfExtents: [2, .5, 2], position: [0, -.5, 0], mass: 0 });
  sim.createSphere({ id: 'ball', radius: .5, position: [0, .4, 0], mass: 1 });
  const mesh = { position: { set(x, y, z) { this.x=x; this.y=y; this.z=z; } }, quaternion: { set(x, y, z, w) { this.x=x; this.y=y; this.z=z; this.w=w; } } };
  sim.bindMesh('ball', mesh);
  for (let i = 0; i < 10; i++) sim.step(1 / 60);
  assert.ok(Number.isFinite(mesh.position.y));
  assert.ok(seen.some(event => event.type === 'begin' && [event.bodyA,event.bodyB].includes('ball')));
  sim.dispose();
});

test('vendored Pro physics records the pinned MIT source and license', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const license = fs.readFileSync(path.join(root, 'third_party/CANNON-ES-LICENSE'), 'utf8');
  assert.equal(pkg.dependencies['cannon-es'], '0.20.0');
  assert.match(license, /Permission is hereby granted, free of charge/);
  assert.ok(fs.existsSync(path.join(root, 'app/src/main/assets/cannon-es.mjs')));
  assert.ok(fs.existsSync(path.join(root, 'app/src/main/assets/mdr-cannon-physics.mjs')));
});

test('two Android APK flavors are distinct and Pro is the only variant enabling Cannon physics', () => {
  const gradle = fs.readFileSync(path.join(root, 'app/build.gradle'), 'utf8');
  const standard = fs.readFileSync(path.join(root, 'app/src/standard/assets/mdr-edition.js'), 'utf8');
  const pro = fs.readFileSync(path.join(root, 'app/src/pro/assets/mdr-edition.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'app/src/main/assets/index.html'), 'utf8');
  assert.match(gradle, /standard\s*\{[\s\S]*?applicationIdSuffix '\.standard'/);
  assert.match(gradle, /pro\s*\{[\s\S]*?applicationIdSuffix '\.pro'/);
  assert.match(standard, /MDR_EDITION = "standard"/);
  assert.match(pro, /MDR_EDITION = "pro"/);
  assert.match(html, /src="mdr-cannon-loader\.js"/);
});
