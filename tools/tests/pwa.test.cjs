const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const assets = path.join(root, 'app/src/main/assets');

test('hosted app has an Arabic RTL install manifest and matching app icon', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(assets, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.lang, 'ar');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.display, 'standalone');
  assert.ok(fs.existsSync(path.join(assets, 'mdr-icon.svg')));
});

test('offline cache and install prompt are local-only and are excluded from Android asset host', () => {
  const html = fs.readFileSync(path.join(assets, 'index.html'), 'utf8');
  const pwa = fs.readFileSync(path.join(assets, 'mdr-pwa.js'), 'utf8');
  const worker = fs.readFileSync(path.join(assets, 'sw.js'), 'utf8');
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /src="mdr-pwa\.js"/);
  assert.match(html, /MDR Platform — أدوات عربية لبناء العوالم ومشاريع التطبيقات/);
  assert.match(pwa, /appassets\.androidplatform\.net/);
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(worker, /mdr-platform-static-v3\.2\.0/);
  execFileSync(process.execPath, ['--check', path.join(assets, 'mdr-pwa.js')]);
  execFileSync(process.execPath, ['--check', path.join(assets, 'sw.js')]);
});

test('offline precache includes the Pro physics runtime and pinned Cannon-es module', () => {
  const worker = fs.readFileSync(path.join(assets, 'sw.js'), 'utf8');
  for (const file of ['mdr-cannon-loader.js', 'mdr-cannon-physics.mjs', 'cannon-es.mjs', 'mdr-edition.js']) {
    assert.ok(worker.includes(`'./${file}'`), `offline cache is missing ${file}`);
  }
});
