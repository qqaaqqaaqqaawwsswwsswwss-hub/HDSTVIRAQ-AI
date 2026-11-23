'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const GLB = require('../../app/src/main/assets/mdr-glb-loader.js');
const Store = require('../../app/src/main/assets/mdr-asset-store.js');

function makeGLB({ jsonOverrides = {}, binary = new Float32Array([0,0,0, 1,0,0, 0,1,0]).buffer } = {}) {
  const json = {
    asset: { version: '2.0', generator: 'MDR tests' },
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.byteLength }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0,0,0], max: [1,1,0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
    ...jsonOverrides
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const binBytes = new Uint8Array(binary);
  const binLength = Math.ceil(binBytes.length / 4) * 4;
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const output = new ArrayBuffer(total);
  const view = new DataView(output);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(output, 20, jsonBytes.length).set(jsonBytes);
  new Uint8Array(output, 20 + jsonBytes.length, jsonLength - jsonBytes.length).fill(0x20);
  const binHeader = 20 + jsonLength;
  view.setUint32(binHeader, binLength, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  new Uint8Array(output, binHeader + 8, binBytes.length).set(binBytes);
  return output;
}

test('parses a minimal self-contained GLB 2.0 file', () => {
  const parsed = GLB.parseGLB(makeGLB());
  assert.equal(parsed.json.asset.version, '2.0');
  assert.equal(parsed.json.meshes.length, 1);
  assert.equal(parsed.bin.byteLength, 36);
});

test('rejects invalid magic, unsupported version and inconsistent declared lengths', () => {
  const badMagic = makeGLB(); new DataView(badMagic).setUint32(0, 0, true);
  assert.throws(() => GLB.parseGLB(badMagic), /ليس GLB/);
  const oldVersion = makeGLB(); new DataView(oldVersion).setUint32(4, 1, true);
  assert.throws(() => GLB.parseGLB(oldVersion), /2.0/);
  const badLength = makeGLB(); new DataView(badLength).setUint32(8, badLength.byteLength - 4, true);
  assert.throws(() => GLB.parseGLB(badLength), /طول GLB/);
});

test('rejects external buffers, unsupported skinning and invalid buffer views', () => {
  assert.throws(() => GLB.parseGLB(makeGLB({ jsonOverrides: { buffers: [{ byteLength: 36, uri: 'mesh.bin' }] } })), /ذاتياً/);
  assert.throws(() => GLB.parseGLB(makeGLB({ jsonOverrides: { skins: [{ joints: [0] }] } })), /العظام/);
  const badView = makeGLB({ jsonOverrides: { bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 999 }] } });
  assert.throws(() => GLB.parseGLB(badView), /buffer/i);
});

test('validates GLB filenames and bounded upload sizes', () => {
  assert.equal(GLB.validateFile({ name: 'robot.glb', size: 1024 }), true);
  assert.throws(() => GLB.validateFile({ name: 'robot.gltf', size: 1024 }), /GLB فقط/);
  assert.throws(() => GLB.validateFile({ name: 'robot.glb', size: GLB.MAX_BYTES + 1 }), /50MB/);
});

test('asset store rejects malformed asset identifiers', () => {
  assert.equal(Store.validId('asset-12345678-abcd'), true);
  assert.equal(Store.validId('../asset-file'), false);
});


test('loads GLB mesh primitives into the active MDR scene using the narrow engine API', async () => {
  class Vec3 {
    constructor() { this.values = [0, 0, 0]; }
    set(x, y, z) { this.values = [x, y, z]; }
  }
  class Euler { constructor() { this.values = [0,0,0]; } }
  class Quaternion { set(x,y,z,w) { this.values = [x,y,z,w]; } }
  class Group {
    constructor() { this.children = []; this.userData = {}; this.position = new Vec3(); this.rotation = new Euler(); this.quaternion = new Quaternion(); this.scale = new Vec3(); this.scale.set(1,1,1); }
    add(child) { this.children.push(child); child.parent = this; }
    applyMatrix4() {}
  }
  class Geometry {
    constructor() { this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    setIndex(value) { this.index = value; }
    computeVertexNormals() { this.normalsComputed = true; }
    computeBoundingSphere() {}
  }
  class Attribute { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; } }
  class Color { setRGB(r,g,b) { this.values = [r,g,b]; return this; } }
  class Material { constructor(values) { Object.assign(this, values); this.emissive = { setRGB() {} }; } }
  class Mesh extends Group { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
  class Matrix4 { fromArray(values) { this.values = values; return this; } }
  const api = { Group, Mesh, BufferGeometry: Geometry, Float32BufferAttribute: Attribute, MeshStandardMaterial: Material, Texture: class {}, Color, Matrix4 };
  const world = { scene: new Group(), destroyed: false, _mdrEditorObjects: [], editorThreeAPI: () => api };
  const object = await GLB.loadGLB(world, makeGLB(), { id: 'model-test', assetId: 'asset-12345678-abcd', name: 'Triangle' });
  assert.equal(object.name, 'Triangle');
  assert.equal(object.userData.mdrType, 'glb');
  assert.equal(world.scene.children.length, 1);
  assert.equal(world._mdrEditorObjects[0], object);
  assert.equal(object.children[0].children[0].geometry.attributes.position.array.length, 9);
});


test('rejects non-finite mesh positions before attaching them to the world', async () => {
  const buffer = makeGLB({ binary: new Float32Array([0,0,0, Infinity,0,0, 0,1,0]).buffer });
  class Group { constructor(){this.children=[];this.userData={};this.position={set(){}};this.rotation={};this.quaternion={set(){}};this.scale={set(){}};} add(child){this.children.push(child);} applyMatrix4(){} }
  class Geometry { setAttribute(){} getAttribute(){return null;} setIndex(){} computeVertexNormals(){} computeBoundingSphere(){} }
  class Attribute {}
  class Material { constructor(){this.emissive={setRGB(){}};} }
  class Color { setRGB(){return this;} }
  class Mesh extends Group { constructor(){super();} }
  class Matrix4 { fromArray(){return this;} }
  const api = { Group, Mesh, BufferGeometry:Geometry, Float32BufferAttribute:Attribute, MeshStandardMaterial:Material, Texture:class{}, Color, Matrix4 };
  const world = { scene: { add(){} }, destroyed: false, editorThreeAPI: () => api };
  await assert.rejects(() => GLB.loadGLB(world, buffer), /غير منتهية/);
});

test('enforces safe accessor, primitive and mobile texture budgets', () => {
  const manyVertices = makeGLB({ jsonOverrides: { accessors: [{ bufferView: 0, componentType: 5126, count: 1_000_001, type: 'VEC3' }] } });
  assert.throws(() => GLB.parseGLB(manyVertices), /حد العناصر/);
  const manyPrimitives = makeGLB({ jsonOverrides: { meshes: [{ primitives: Array.from({ length: 2049 }, () => ({ attributes: { POSITION: 0 } })) }] } });
  assert.throws(() => GLB.parseGLB(manyPrimitives), /أجزاء المجسم/);
  const manyImages = makeGLB({ jsonOverrides: { images: Array.from({ length: 9 }, () => ({ bufferView: 0, mimeType: 'image/png' })) } });
  assert.throws(() => GLB.parseGLB(manyImages), /عدداً كبيراً/);
});
