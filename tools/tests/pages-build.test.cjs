const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

test('GitHub Pages snapshot mirrors the mobile web app and keeps architecture docs', () => {
  const html = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
  assert.match(html, /MDR Platform 3\.2\.0/);
  for (const file of ['mdr-mobile.css', 'mdr-mobile-ui.js', 'mdr-physics.js', 'mdr-game-bootstrap.js', 'mdr-pwa.js', 'manifest.webmanifest', 'sw.js', 'cannon-es.mjs', 'mdr-cannon-physics.mjs', 'mdr-cannon-loader.js', 'mdr-edition.js']) {
    assert.ok(fs.existsSync(path.join(root, 'docs', file)), `missing Pages asset: ${file}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'docs/ENGINE_AND_FACTORY_ARCHITECTURE.md')));
});
