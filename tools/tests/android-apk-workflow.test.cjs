const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

test('prepared Android workflow builds and uploads one APK', () => {
  const workflow = fs.readFileSync(path.join(root, 'ci/android-apk.yml'), 'utf8');
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /app\/build\/outputs\/apk\/debug\/app-debug\.apk/);
  assert.match(workflow, /MDR-Platform-3\.2\.0-Android-APK/);
  assert.doesNotMatch(workflow, /assembleStandard|assemblePro|app-standard|app-pro/);
});
