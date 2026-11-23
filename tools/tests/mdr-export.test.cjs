'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Exporter = require('../../app/src/main/assets/mdr-export.js');

test('CRC32 matches the ZIP reference check value', () => {
  assert.equal(Exporter.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('ZIP writer emits a valid local header, UTF-8 name and end directory', async () => {
  const blob = await Exporter.buildZip([
    { path: 'project/scene.json', data: '{"objects":[]}' },
    { path: 'مستندات/readme.txt', data: 'MDR export' }
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(6, true), 0x0800);
  let foundEnd = false;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { foundEnd = true; break; }
  }
  assert.equal(foundEnd, true);
  assert.equal(blob.type, 'application/zip');
});

test('ZIP writer rejects path traversal, duplicate paths and unsupported input data', async () => {
  assert.throws(() => Exporter.safePath('../escape.txt'), /Unsafe/);
  assert.throws(() => Exporter.safePath('/root.txt'), /Invalid/);
  await assert.rejects(() => Exporter.buildZip([{ path: 'same.txt', data: 'a' }, { path: 'same.txt', data: 'b' }]), /Duplicate/);
  await assert.rejects(() => Exporter.buildZip([{ path: 'bad.txt', data: 123 }]), /Unsupported/);
});

test('stored ZIP reader round-trips project files and rejects CRC tampering', async () => {
  const blob = await Exporter.buildZip([
    { path: 'project/scene.json', data: '{"schema":"mdr-scene"}' },
    { path: 'project/assets/asset-12345678.glb', data: new Uint8Array([1, 2, 3, 4]) }
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const files = Exporter.readStoredZip(bytes);
  assert.equal(new TextDecoder().decode(files.get('project/scene.json')), '{"schema":"mdr-scene"}');
  assert.deepEqual([...files.get('project/assets/asset-12345678.glb')], [1, 2, 3, 4]);
  const localHeaderDamaged = bytes.slice(); localHeaderDamaged[35] ^= 0x40;
  assert.throws(() => Exporter.readStoredZip(localHeaderDamaged), /رأس ZIP المحلي/);
  const dataDamaged = bytes.slice(); dataDamaged[48] ^= 0x40;
  assert.throws(() => Exporter.readStoredZip(dataDamaged), /سلامة|CRC/i);
});

test('project package import requires the full MDR scene and asset manifest', async () => {
  const valid = await Exporter.buildZip([{ path: 'README.txt', data: 'not an MDR project' }]);
  const fakeStudio = { importPackage: async () => ({ objects: 0, assets: 0 }) };
  const previous = globalThis.MDRStudio;
  globalThis.MDRStudio = fakeStudio;
  try {
    await assert.rejects(() => Exporter.importProjectPackage(valid), /not a MDR|حزمة MDR/);
  } finally {
    if (previous === undefined) delete globalThis.MDRStudio;
    else globalThis.MDRStudio = previous;
  }
});


test('valid project archive passes its scene and manifest to MDR Studio', async () => {
  const project = { schema: 'mdr-scene', version: 3, name: 'Unit Scene', objects: [] };
  const manifest = { schema: 'mdr-game-package', version: 1, scene: 'project/scene.json', assets: [] };
  const blob = await Exporter.buildZip([
    { path: 'project/scene.json', data: JSON.stringify(project) },
    { path: 'project/manifest.json', data: JSON.stringify(manifest) }
  ]);
  const previous = globalThis.MDRStudio;
  let received;
  globalThis.MDRStudio = { importPackage: async (scene, assets) => { received = { scene, assets }; return { objects: scene.objects.length, assets: assets.length }; } };
  try {
    const result = await Exporter.importProjectPackage(blob);
    assert.deepEqual(result, { objects: 0, assets: 0 });
    assert.equal(received.scene.name, 'Unit Scene');
    assert.deepEqual(received.assets, []);
  } finally {
    if (previous === undefined) delete globalThis.MDRStudio;
    else globalThis.MDRStudio = previous;
  }
});


test('stored ZIP reader rejects multi-disk and inconsistent end-directory records', async () => {
  const blob = await Exporter.buildZip([{ path: 'a.txt', data: 'a' }]);
  const original = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(original.buffer);
  const eocd = original.length - 22;
  const multiDisk = original.slice();
  new DataView(multiDisk.buffer).setUint16(eocd + 4, 1, true);
  assert.throws(() => Exporter.readStoredZip(multiDisk), /أقراصاً متعددة|الحدود/);
  const inconsistentCount = original.slice();
  new DataView(inconsistentCount.buffer).setUint16(eocd + 8, 2, true);
  assert.throws(() => Exporter.readStoredZip(inconsistentCount), /أقراصاً متعددة|الحدود/);
  const inconsistentCentralSize = original.slice();
  new DataView(inconsistentCentralSize.buffer).setUint32(eocd + 12, view.getUint32(eocd + 12, true) + 1, true);
  assert.throws(() => Exporter.readStoredZip(inconsistentCentralSize), /الحدود|فهرس ZIP/);
});
