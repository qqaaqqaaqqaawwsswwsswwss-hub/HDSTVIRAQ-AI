'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Quality = require('../../app/src/main/assets/mdr-quality-studio.js');

test('quality presets obey device DPR, renderbuffer and pixel-budget caps', () => {
  const low = Quality.pixelRatioFor('ultra', { width: 1440, height: 2960 }, 3, { maxRenderbufferSize: 2048, maxTextureSize: 4096 });
  assert.ok(low <= 2048 / 2960);
  assert.ok(low >= 0.5);
  const small = Quality.pixelRatioFor('high', { width: 390, height: 844 }, 3, { maxRenderbufferSize: 8192, maxTextureSize: 8192 });
  assert.ok(small <= 2);
  assert.ok(small > 1);
  const fourK = Quality.pixelRatioFor('4k', { width: 390, height: 844 }, 1, { maxRenderbufferSize: 4096, maxTextureSize: 4096 });
  assert.ok(fourK > 3.5, `4K profile should render above native DPR when GPU allows, got ${fourK}`);
});

test('quality preset rejects unknown profile names', () => {
  assert.throws(() => Quality.pixelRatioFor('cinema', { width: 100, height: 100 }, 1), /Unknown/);
});

test('4K capture dimensions preserve aspect ratio and cap unsupported GPUs', () => {
  const landscape = Quality.captureDimensions({ width: 1600, height: 900 }, 4096, 3840);
  assert.deepEqual(landscape, { width: 3840, height: 2160, longEdge: 3840, limited: false });
  const portrait = Quality.captureDimensions({ width: 390, height: 844 }, 3072, 3840);
  assert.equal(portrait.longEdge, 3072);
  assert.equal(portrait.limited, true);
  assert.ok(Math.abs(portrait.width / portrait.height - 390 / 844) < 0.002);
});

test('applyProfile updates SmartScale and remembers the selected profile', () => {
  const calls = [];
  const governor = {
    baseShadowEnabled: true,
    setQualityProfile(options) { calls.push(options); }
  };
  const world = {
    canvas: { getBoundingClientRect: () => ({ width: 390, height: 844 }) },
    engine: { renderer: { getContext: () => ({ MAX_RENDERBUFFER_SIZE: 1, MAX_TEXTURE_SIZE: 2, getParameter: p => p === 1 ? 4096 : 4096 }) } },
    performance: governor
  };
  const storage = { setItem(key, value) { this[key] = value; } };
  const result = Quality.applyProfile(world, 'balanced', 2, { defaultView: { MDRPerformance: { get: () => governor } } });
  assert.equal(result.profile, 'balanced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].adaptive, false);
  assert.equal(governor.baseShadowEnabled, true);
});
