const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'dist');

test('web build includes the current mobile-first app and its local runtime assets', () => {
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /MDR Platform 3\.0\.3/);
  assert.match(html, /href="mdr-mobile\.css"/);
  for (const file of ['mdr-mobile.css', 'mdr-mobile-ui.js', 'mdr-physics.js', 'mdr-game-bootstrap.js']) {
    assert.ok(fs.existsSync(path.join(output, file)), `missing deployed asset: ${file}`);
  }
});
