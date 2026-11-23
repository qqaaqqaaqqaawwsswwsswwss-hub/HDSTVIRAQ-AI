const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('AndroidX is explicitly enabled in root gradle.properties', () => {
  const props = read('gradle.properties');
  assert.match(props, /^android\.useAndroidX=true$/m);
});

test('BuildConfig generation is enabled for AppActivity BuildConfig.DEBUG', () => {
  const gradle = read('app/build.gradle');
  const activity = read('app/src/main/java/com/mdr/app/AppActivity.java');
  assert.match(activity, /BuildConfig\.DEBUG/);
  assert.match(gradle, /buildFeatures\s*\{[^}]*buildConfig\s+true/s);
});

test('Android app version and displayed label are consistent', () => {
  const gradle = read('app/build.gradle');
  const strings = read('app/src/main/res/values/strings.xml');
  assert.match(gradle, /versionName\s+"3\.1\.0"/);
  assert.match(gradle, /versionCode\s+16/);
  assert.match(strings, /MDR Platform 3\.1\.0/);
});

test('AndroidX WebKit dependency remains declared', () => {
  assert.match(read('app/build.gradle'), /androidx\.webkit:webkit:1\.18\.0/);
});

test('Gradle bootstrap uses the official 8.14.8 binary distribution checksum', () => {
  const sh = read('gradlew');
  const bat = read('gradlew.bat');
  const checksum = '94da89692fc3ca6d2d0ce6bb48548762ea0f1897ba444286f5c7f3759c7af651';
  assert.match(sh, /VERSION=8\.14\.8/);
  assert.ok(sh.includes(checksum));
  assert.match(bat, /set VERSION=8\.14\.8/);
  assert.ok(bat.includes(checksum));
});

test('README accurately identifies custom Gradle bootstrap launchers', () => {
  const readme = read('README.md');
  assert.match(readme, /bootstrap مخصص/);
  assert.match(readme, /ليس Gradle Wrapper القياسي/);
});

test('factory-generated Android project includes AndroidX gradle.properties', () => {
  const html = read('app/src/main/assets/index.html');
  assert.match(html, /path:"gradle\.properties",data:"android\.useAndroidX=true\\n/);
});

test('factory-generated Android module explicitly enables BuildConfig', () => {
  const html = read('app/src/main/assets/index.html');
  assert.match(html, /buildFeatures\s*\{\s*buildConfig true\s*\}/);
});


test('Web document title and in-app version badge match the Android release', () => {
  const html = read('app/src/main/assets/index.html');
  assert.match(html, /<title>MDR Platform 3\.1\.0/);
  assert.match(html, /MDR · v3\.1\.0/);
  assert.doesNotMatch(html, /3\.0\.[12]/);
});
