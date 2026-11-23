'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const guard = require('../../app/src/main/assets/mdr-zip-guard.js');

test('accepts an ordinary ZIP upload under the byte limit', () => {
  assert.equal(guard.validateUploadFile({ name: 'game-assets.zip', size: 1024 }), true);
});

test('rejects unsupported extension, empty archive and oversized upload', () => {
  assert.throws(() => guard.validateUploadFile({ name: 'project.rar', size: 1024 }), /Only \.zip/);
  assert.throws(() => guard.validateUploadFile({ name: 'empty.zip', size: 0 }), /empty/);
  assert.throws(() => guard.validateUploadFile({ name: 'large.zip', size: 51 * 1024 * 1024 }), /50 MB/);
});

test('normalizes safe Windows separators and rejects traversal/absolute/NUL paths', () => {
  assert.equal(guard.validateZipPath('assets\\textures\\road.png'), 'assets/textures/road.png');
  for (const name of ['../escape.txt', 'a/../../escape.txt', '/etc/passwd', '\\\\server\\share', 'C:\\Windows\\system.ini', 'a\0b', 'a//b', 'a/./b', 'folder/bad?.txt', 'folder/name.']) {
    assert.throws(() => guard.validateZipPath(name));
  }
});

test('accepts entries that fit configured limits and reports totals', () => {
  const result = guard.validateZipEntries([
    { path: 'index.html', size: 2048, compressedSize: 900 },
    { path: 'assets/app.js', size: 4096, compressedSize: 1800 }
  ]);
  assert.deepEqual(result, { entries: 2, totalSize: 6144 });
});

test('rejects duplicate names case-insensitively', () => {
  assert.throws(() => guard.validateZipEntries([
    { path: 'Assets/logo.png', size: 10, compressedSize: 8 },
    { path: 'assets/LOGO.png', size: 12, compressedSize: 9 }
  ]), /Duplicate ZIP path/);
});

test('rejects too many files, an oversized entry and total expanded size', () => {
  assert.throws(() => guard.validateZipEntries([{ path: 'a', size: 1 }], { maxEntries: 0 }), /more than/);
  assert.throws(() => guard.validateZipEntries([{ path: 'big.bin', size: 40, compressedSize: 20 }], { maxEntryBytes: 32 }), /per-file/);
  assert.throws(() => guard.validateZipEntries([
    { path: 'a.bin', size: 70, compressedSize: 40 },
    { path: 'b.bin', size: 70, compressedSize: 40 }
  ], { maxTotalBytes: 100 }), /total limit/);
});

test('rejects non-empty ZIP entries with missing compressed data', () => {
  assert.throws(() => guard.validateZipEntries([
    { path: 'missing.bin', size: 1024 * 1024, compressedSize: 0 }
  ]), /invalid compressed size/);
});

test('rejects invalid negative or non-numeric compressed sizes', () => {
  assert.throws(() => guard.validateZipEntries([
    { path: 'negative.bin', size: 1024, compressedSize: -1 }
  ]), /invalid compressed size/);
  assert.throws(() => guard.validateZipEntries([
    { path: 'nan.bin', size: 1024, compressedSize: Number.NaN }
  ]), /invalid compressed size/);
});

test('rejects suspicious compression ratios', () => {
  assert.throws(() => guard.validateZipEntries([
    { path: 'payload.txt', size: 5 * 1024 * 1024, compressedSize: 100 }
  ]), /compression ratio/);
});
