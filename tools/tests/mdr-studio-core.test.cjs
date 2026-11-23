'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../app/src/main/assets/mdr-studio-core.js');

test('creates and round-trips a valid MDR scene project', () => {
  const project = Core.createProject('Test Scene');
  project.objects.push(Core.normalizeObject({ id:'box-1', type:'box', name:'Test Box', position:[1,2,3], color:'#abcdef' }));
  const decoded = Core.parse(Core.serialize(project));
  assert.equal(decoded.name, 'Test Scene');
  assert.equal(decoded.objects.length, 1);
  assert.deepEqual(decoded.objects[0].position, [1,2,3]);
});

test('rejects unsupported object types and malformed transform vectors', () => {
  assert.throws(() => Core.normalizeObject({ id:'x', type:'script' }), /Unsupported/);
  assert.throws(() => Core.normalizeObject({ id:'x', type:'box', position:[0, NaN, 0] }), /Invalid transform/);
});

test('clamps transform values and rejects duplicate IDs', () => {
  const item = Core.normalizeObject({ id:'box', type:'box', position:[9999,0,0], scale:[0,1,1] });
  assert.deepEqual(item.position, [500,0,0]);
  assert.deepEqual(item.scale, [.05,1,1]);
  const project = Core.createProject();
  project.objects = [item, item];
  assert.throws(() => Core.validateProject(project), /duplicate/);
});

test('scene projects persist bounded physics body settings safely', () => {
  const project = Core.createProject('Physics test');
  project.objects.push(Core.normalizeObject({ id:'ball', type:'sphere', physics:{ type:'dynamic', mass:2.5, friction:0.4, restitution:0.3 } }));
  const body = Core.parse(Core.serialize(project)).objects[0].physics;
  assert.deepEqual(body, { type:'dynamic', shape:'sphere', mass:2.5, friction:0.4, restitution:0.3 });
  const clamped = Core.normalizeObject({ id:'ground', type:'box', physics:{ type:'static', mass:0, friction:4, restitution:-1 } }).physics;
  assert.deepEqual(clamped, { type:'static', shape:'box', mass:0.001, friction:1, restitution:0 });
  assert.throws(() => Core.normalizeObject({ id:'bad', type:'box', physics:{ type:'ghost' } }), /physics body type/);
  assert.throws(() => Core.normalizeObject({ id:'bad-mass', type:'box', physics:{ type:'dynamic', mass:NaN } }), /finite/);
});

test('rejects too many objects and oversized or invalid JSON', () => {
  const project = Core.createProject();
  project.objects = Array.from({length: Core.MAX_OBJECTS + 1}, (_, i) => ({ id:`o${i}`, type:'box' }));
  assert.throws(() => Core.validateProject(project), /limit/);
  assert.throws(() => Core.parse('{bad json'), /valid JSON/);
  assert.throws(() => Core.parse(' '.repeat(2_000_001)), /too large/);
});


test('accepts directional lights and migrates legacy pointLight projects', () => {
  const modern = Core.createProject('Lighting');
  modern.objects.push(Core.normalizeObject({ id:'light-1', type:'directionalLight', color:'#ffd080' }));
  assert.equal(Core.parse(Core.serialize(modern)).objects[0].type, 'directionalLight');
  const legacy = { schema:'mdr-scene', version:1, name:'Legacy', objects:[{id:'old-light',type:'pointLight'}] };
  const migrated = Core.parse(JSON.stringify(legacy));
  assert.equal(migrated.version, Core.VERSION);
  assert.equal(migrated.objects[0].type, 'directionalLight');
});

test('scene version 3 stores GLB asset references without embedding binary data', () => {
  const project = Core.createProject('GLB scene');
  project.objects.push(Core.normalizeObject({ id:'model-1', type:'glb', name:'Robot', assetId:'asset-12345678-abcd', fileName:'robot.glb' }));
  const decoded = Core.parse(Core.serialize(project));
  assert.equal(decoded.version, 3);
  assert.equal(decoded.objects[0].type, 'glb');
  assert.equal(decoded.objects[0].assetId, 'asset-12345678-abcd');
  assert.throws(() => Core.normalizeObject({ id:'model-2', type:'glb', assetId:'../escape' }), /asset ID/);
});

test('migrates scene version 2 to version 3 while retaining primitive objects', () => {
  const legacy = { schema:'mdr-scene', version:2, name:'old', objects:[{ id:'box-1', type:'box' }] };
  const migrated = Core.parse(JSON.stringify(legacy));
  assert.equal(migrated.version, 3);
  assert.equal(migrated.objects[0].type, 'box');
});
