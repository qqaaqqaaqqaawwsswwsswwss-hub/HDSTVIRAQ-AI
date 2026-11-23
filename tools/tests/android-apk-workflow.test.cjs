const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

test('prepared Android workflow builds and uploads Standard and Pro APKs separately', () => {
  const workflow = fs.readFileSync(path.join(root, 'ci/android-apk.yml'), 'utf8');
  assert.match(workflow, /assembleStandardDebug assembleProDebug/);
  assert.match(workflow, /app-standard-debug\.apk/);
  assert.match(workflow, /app-pro-debug\.apk/);
  assert.match(workflow, /MDR-Platform-3\.2\.0-Standard-APK/);
  assert.match(workflow, /MDR-Platform-3\.2\.0-Pro-APK/);
});
