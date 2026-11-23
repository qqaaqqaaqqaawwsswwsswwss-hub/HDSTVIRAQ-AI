'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const assets = path.join(__dirname, '../../app/src/main/assets');
const html = fs.readFileSync(path.join(assets, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(assets, 'mdr-studio-runtime.js'), 'utf8');

test('bundled MDR world exposes primitive editor bridge using bundled Three constructors', () => {
  assert.match(html, /editorAddPrimitive\(type,spec=\{\}\)/);
  assert.match(html, /new Kn\(1\.5,1\.5,1\.5\)/);
  assert.match(html, /new Al\(\.8,24,16\)/);
  assert.match(html, /new Yl\(\.65,\.65,1\.5,20\)/);
});

test('studio runtime does not mistake the Three.js revision string for its API', () => {
  assert.doesNotMatch(runtime, /window\.__THREE__/);
  assert.match(runtime, /active\.editorAddPrimitive/);
  assert.match(runtime, /data-add="directionalLight"/);
});

test('editor bridge persists and disposes only its own scene objects', () => {
  assert.match(runtime, /localStorage\.setItem/);
  assert.match(runtime, /Core\.parse/);
  assert.match(runtime, /geometries\.forEach\(geometry => geometry\.dispose/);
  assert.match(runtime, /objects = objects\.filter/);
});

test('bundled engine exposes only the constructors needed by the GLB adapter', () => {
  assert.match(html, /editorThreeAPI\(\)\{return \{Group:ss,Mesh:ut,BufferGeometry:gn,Float32BufferAttribute:Gt,MeshStandardMaterial:Sn,Texture:qt,Color:je,Matrix4:ht\}\}/);
  assert.match(runtime, /MDRGLB\.loadGLB/);
  assert.match(runtime, /data-action="import-glb"/);
  assert.match(runtime, /exportSelectedGLB/);
});
