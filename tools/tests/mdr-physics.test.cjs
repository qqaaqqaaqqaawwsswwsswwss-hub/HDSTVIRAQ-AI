'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../../app/src/main/assets/mdr-physics.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const sandbox = { console, performance, setTimeout, clearTimeout };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'mdr-physics.js' });
const { World } = sandbox.MDRPhysics;

function simulate(world, frames, dt = 1 / 60) {
  for (let i = 0; i < frames; i++) world.step(dt);
}

test('dynamic rigid body falls under gravity and rests on a static floor', () => {
  const world = new World({ gravity: { x: 0, y: -9.81, z: 0 }, solverIterations: 8 });
  world.addBody({ type: 'static', shape: 'box', position: [0, -0.5, 0], size: [10, 1, 10] });
  const ball = world.addBody({ type: 'dynamic', shape: 'sphere', position: [0, 4, 0], radius: 0.5, restitution: 0 });
  simulate(world, 240);
  assert.ok(ball.position.y > 0.35 && ball.position.y < 0.65, `unexpected resting height ${ball.position.y}`);
  assert.ok(Math.abs(ball.velocity.y) < 0.2, `unexpected vertical velocity ${ball.velocity.y}`);
  assert.equal(world.getStats().bodies, 2);
  assert.ok(world.getStats().contacts >= 1);
});

test('sphere-sphere collision resolves overlap and emits start/stay/end events', () => {
  const world = new World({ gravity: { x: 0, y: 0, z: 0 }, solverIterations: 8 });
  const a = world.addBody({ shape: 'sphere', position: [-0.4, 0, 0], radius: 0.5, velocity: [1, 0, 0], restitution: 1 });
  const b = world.addBody({ shape: 'sphere', position: [0.4, 0, 0], radius: 0.5, type: 'static' });
  const events = [];
  world.on('collision-start', event => events.push(['start', event.a.id, event.b.id]));
  world.on('collision-stay', () => events.push(['stay']));
  world.on('collision-end', () => events.push(['end']));
  world.step(1 / 60);
  world.step(1 / 60);
  assert.ok(a.position.x < -0.4, 'dynamic sphere should be separated from static sphere');
  assert.ok(events.some(event => event[0] === 'start'));
  world.teleport(b.id, [4, 0, 0]);
  world.step(1 / 60);
  assert.ok(events.some(event => event[0] === 'end'));
});

test('box-box and sphere-box narrow phase produce stable contacts', () => {
  const world = new World({ gravity: { x: 0, y: 0, z: 0 }, solverIterations: 4 });
  world.addBody({ type: 'static', shape: 'box', position: [0, 0, 0], size: [2, 2, 2] });
  const sphere = world.addBody({ shape: 'sphere', position: [0.8, 0, 0], radius: 0.5 });
  world.step(1 / 60);
  assert.ok(sphere.position.x > 1.4, `sphere should be pushed out of box, got ${sphere.position.x}`);

  const other = world.addBody({ type: 'static', shape: 'box', position: [3, 0, 0], size: [2, 2, 2] });
  const moving = world.addBody({ shape: 'box', position: [3.6, 0, 0], size: [1, 1, 1] });
  world.step(1 / 60);
  assert.ok(moving.position.x > 3.9, 'overlapping boxes should be separated');
  assert.ok(other.id < moving.id);
});

test('sensor pairs emit trigger events without changing body velocity', () => {
  const world = new World({ gravity: { x: 0, y: 0, z: 0 } });
  world.addBody({ type: 'static', shape: 'box', size: [4, 4, 4], sensor: true });
  const ball = world.addBody({ shape: 'sphere', radius: 0.5, position: [0, 0, 0], velocity: [2, 0, 0], linearDamping: 0 });
  const events = [];
  world.on('trigger-enter', () => events.push('enter'));
  world.on('trigger-stay', () => events.push('stay'));
  world.step(1 / 60);
  const vx = ball.velocity.x;
  world.step(1 / 60);
  assert.ok(events.includes('enter'));
  assert.ok(events.includes('stay'));
  assert.equal(ball.velocity.x, vx);
});

test('forces, impulses, kinematic bodies and teleport are supported', () => {
  const world = new World({ gravity: { x: 0, y: 0, z: 0 } });
  const body = world.addBody({ mass: 2, position: [0, 0, 0] });
  assert.equal(world.applyForce(body.id, [8, 0, 0]), true);
  world.step(0.25);
  assert.ok(body.velocity.x > 0.9 && body.velocity.x < 1.1);
  world.applyImpulse(body.id, [2, 0, 0]);
  assert.ok(body.velocity.x > 1.9);
  assert.equal(world.teleport(body.id, [10, 2, 3]), true);
  assert.deepEqual({ ...body.position }, { x: 10, y: 2, z: 3 });

  const kinematic = world.addBody({ type: 'kinematic', velocity: [1, 0, 0] });
  world.step(0.25);
  assert.equal(kinematic.position.x, 0.25);
});

test('collision masks filter pairs and bodies are bounded', () => {
  const world = new World({ gravity: { x: 0, y: 0, z: 0 }, maxBodies: 2 });
  const a = world.addBody({ shape: 'sphere', position: [0, 0, 0], group: 1, mask: 1 });
  const b = world.addBody({ shape: 'sphere', position: [0.2, 0, 0], group: 2, mask: 2 });
  world.step(1 / 60);
  assert.equal(world.getStats().candidatePairs, 0);
  assert.throws(() => world.addBody({}), /limit/);
  assert.equal(world.removeBody(a.id), true);
  assert.equal(world.removeBody(a.id), false);
  assert.equal(world.getBody(b.id), b);
});

test('visual objects synchronize to the simulated transform', () => {
  const world = new World({ gravity: { x: 0, y: 0, z: 0 } });
  const visual = { position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
  const body = world.addBody({ object: visual, velocity: [3, 0, 0] });
  world.step(1 / 60);
  assert.equal(visual.position.x, body.position.x);
  assert.equal(visual.position.y, body.position.y);
  assert.equal(visual.position.z, body.position.z);
});

test('rejects invalid configuration and invalid time steps; dispose is terminal', () => {
  const world = new World();
  assert.throws(() => world.addBody({ type: 'ghost' }), /Body type/);
  assert.throws(() => world.addBody({ shape: 'mesh' }), /Collider shape/);
  assert.throws(() => world.step(0), /between 0 and 0.25/);
  assert.throws(() => world.step(0.3), /between 0 and 0.25/);
  world.dispose();
  assert.throws(() => world.addBody({}), /disposed/);
  assert.doesNotThrow(() => world.step(1 / 60));
});
