'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bundle = fs.readFileSync(path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
function loadTemplateFunction(name, nextName) {
  const start = bundle.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing ${name} template`);
  const end = nextName ? bundle.indexOf(`function ${nextName}(`, start + 1) : bundle.indexOf('\n', start);
  assert.notEqual(end, -1, `missing boundary after ${name}`);
  const source = bundle.slice(start, end);
  return new Function(`${source}; return ${name};`)();
}

const manifestTemplate = loadTemplateFunction('KT', 'ZT');
const activityTemplate = loadTemplateFunction('ZT', 'JT');
const gradleTemplate = loadTemplateFunction('qT', 'KT');

test('Factory generated Android manifest has safe baseline settings', () => {
  const xml = manifestTemplate();
  assert.match(xml, /usesCleartextTraffic="false"/);
  assert.match(xml, /allowBackup="false"/);
  assert.match(xml, /android:name="android\.permission\.INTERNET"/);
});

test('Factory generated Activity supports WebView file input via Android document picker', () => {
  const java = activityTemplate('com.example.generated');
  assert.match(java, /WebViewAssetLoader/);
  assert.match(java, /onShowFileChooser/);
  assert.match(java, /ACTION_OPEN_DOCUMENT/);
  assert.match(java, /onActivityResult/);
  assert.match(java, /setAllowFileAccess\(false\)/);
  assert.match(java, /setAllowContentAccess\(false\)/);
  assert.match(java, /MIXED_CONTENT_NEVER_ALLOW/);
});

test('Factory generated Gradle module includes AndroidX WebKit and API targets', () => {
  const gradle = gradleTemplate('com.example.generated', '1.0.0', 1);
  assert.match(gradle, /compileSdk 35/);
  assert.match(gradle, /minSdk 26/);
  assert.match(gradle, /targetSdk 35/);
  assert.match(gradle, /androidx\.webkit:webkit:1\.18\.0/);
});

test('Factory generator emits complete Gradle project scaffolding and a file-selectable WebView Activity', async () => {
  const start = bundle.indexOf('async function YT(');
  const end = bundle.indexOf('function QT(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const generatorSource = bundle.slice(start, end);
  const generator = new Function(
    'w0', 'jT', 'XT', 'HT', 'Vd', '$T', 'qT', 'KT', 'ZT', 'JT',
    `${generatorSource}; return YT;`
  )(
    value => String(value || 'M').slice(0, 1).toUpperCase(),
    async (_name) => '<!doctype html><html><head></head><body><input type="file" accept=".zip"></body></html>',
    () => 'application/octet-stream',
    async () => [],
    value => String(value),
    () => 'ROOT_GRADLE_TEMPLATE',
    () => 'APP_GRADLE_TEMPLATE minSdk 26 androidx.webkit:webkit:1.18.0',
    () => 'MANIFEST_TEMPLATE',
    () => 'ACTIVITY_TEMPLATE WebViewAssetLoader onShowFileChooser',
    () => 'README_TEMPLATE'
  );
  const fakeZip = {
    forEach(callback) { callback('index.html', { dir: false }); callback('assets/app.js', { dir: false }); },
    file(name) {
      if (name === 'index.html') return null; // jT supplies the HTML entry point.
      return { async: async () => new TextEncoder().encode('console.log("app")').buffer };
    }
  };
  const files = await generator(fakeZip, {
    appName: 'MDR Test App', packageId: 'com.example.mdrtest', version: '1.0.0', versionCode: 1,
    icon: { letter: 'M', color: '#222222', accent: '#ffffff' }, customJs: '', customCss: ''
  }, 'index.html');
  const byPath = new Map(files.map(file => [file.path, file]));
  for (const path of [
    'gradlew', 'gradlew.bat', 'settings.gradle', 'build.gradle', 'app/build.gradle',
    'app/src/main/AndroidManifest.xml',
    'app/src/main/java/com/example/mdrtest/AppActivity.java',
    'app/src/main/assets/index.html', 'README.md'
  ]) assert.ok(byPath.has(path), `generated project is missing ${path}`);
  assert.equal(byPath.get('gradlew').mode, 493);
  assert.match(byPath.get('gradlew').data, /sha256sum -c/);
  assert.match(byPath.get('gradlew.bat').data, /Get-FileHash/);
  assert.match(byPath.get('app/src/main/java/com/example/mdrtest/AppActivity.java').data, /onShowFileChooser/);
});

test('Generated Activity uses escaped Java newline sequences in string literals', () => {
  const java = activityTemplate('com.example.generated');
  assert.match(java, /notice\.setText\(message \+ "\\n\\nاضغط لإعادة التحميل"\);/);
  assert.doesNotMatch(java, /notice\.setText\(message \+ "\n\nاضغط/);
});

test('Generated Windows Gradle launcher preserves every required path separator', async () => {
  const start = bundle.indexOf('async function YT(');
  const end = bundle.indexOf('function QT(', start);
  const generatorSource = bundle.slice(start, end);
  const generator = new Function(
    'w0', 'jT', 'XT', 'HT', 'Vd', '$T', 'qT', 'KT', 'ZT', 'JT',
    `${generatorSource}; return YT;`
  )(
    value => String(value || 'M').slice(0, 1).toUpperCase(),
    async () => '<!doctype html><html><head></head><body></body></html>',
    () => 'application/octet-stream', async () => [], String,
    () => '', () => '', () => '', () => '', () => ''
  );
  const files = await generator({
    forEach(callback) { callback('index.html', { dir: false }); },
    file() { return null; }
  }, {
    appName: 'Test', packageId: 'com.example.test', version: '1.0.0', versionCode: 1,
    icon: { letter: 'T', color: '#222222', accent: '#ffffff' }, customJs: '', customCss: ''
  }, 'index.html');
  const bat = files.find(file => file.path === 'gradlew.bat').data;
  assert.match(bat, /%USERPROFILE%\\\.gradle/);
  assert.match(bat, /%GRADLE_USER_HOME%\\mdr-bootstrap\\gradle-%VERSION%/);
  assert.match(bat, /"%CACHE%\\bin\\gradle\.bat"/);
  assert.match(bat, /call "%CACHE%\\bin\\gradle\.bat" %\*/);
  assert.doesNotMatch(bat, /\u0008/);
});

test('Factory Code Console examples call methods through the provided api object', () => {
  assert.match(bundle, /placeholder:'api\.setAppName\("My Shop"\); api\.setPackage\("com\.myshop\.app"\);'/);
  assert.match(bundle, /code:'api\.setAppName\("My Shop"\); print\(api\.appName\(\)\);'/);
  assert.match(bundle, /code:'api\.setPackage\("com\.myshop\.app"\); print\(api\.getPackage\(\)\);'/);
  const start = bundle.indexOf('function e2(');
  const end = bundle.indexOf('const ym=', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const execute = new Function('QT', `${bundle.slice(start, end)}; return e2;`)(value => value === null ? 'null' : value === undefined ? 'undefined' : typeof value === 'object' ? JSON.stringify(value) : String(value));
  const state = { name: 'Old', packageId: 'com.old.app' };
  const result = execute({
    appName: () => state.name,
    getPackage: () => state.packageId,
    setAppName: value => (state.name = String(value)),
    setPackage: value => (state.packageId = String(value))
  }, 'api.setAppName("My Shop"); api.setPackage("com.myshop.app"); print(api.appName()); print(api.getPackage());');
  assert.equal(result.error, undefined);
  assert.deepEqual(result.logs, ['My Shop', 'com.myshop.app']);
});

test('Factory preview and exported project keep custom code separate', () => {
  const start = bundle.indexOf('async function OT(');
  const end = bundle.indexOf('async function zT(', start);
  const previewSource = bundle.slice(start, end);
  assert.match(previewSource, /async function OT\(n\)/);
  assert.doesNotMatch(previewSource, /customJs|customCss/);
  assert.match(bundle, /app-custom\.js/);
  assert.match(bundle, /app-custom\.css/);
});

test('Generated README has sequential build steps', () => {
  const start = bundle.indexOf('function JT(');
  const end = bundle.indexOf('function QT(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const readmeTemplate = new Function('Vd', `${bundle.slice(start, end)}; return JT;`)(value => String(value));
  const readme = readmeTemplate('Test App', 'com.example.test', '1.0.0', 1, 'M');
  const numbered = [...readme.matchAll(/^(\d+)\. /gm)].map(match => Number(match[1]));
  assert.deepEqual(numbered, [1, 2, 3, 4, 5]);
});

test('City day-night cycle reuses per-world Color instances instead of allocating every tick', () => {
  assert.match(bundle, /_dayColors",\{skyDay:new je\(724246\),skyNight:new je\(2902634\),skyMix:new je/);
  const start = bundle.indexOf('stepDayCycle(e,t){');
  const end = bundle.indexOf('stepRender(e,t){', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const method = bundle.slice(start, end);
  assert.doesNotMatch(method, /new je\(/);
  assert.match(method, /o\.skyMix\.lerpColors/);
  assert.match(method, /o\.materialDay,o\.materialNight/);
  assert.match(method, /o\.fogDay,o\.fogNight/);
});

test('Icon preview URL cleanup uses a dedicated ref and does not overwrite the upload-zone DOM ref', () => {
  assert.match(bundle, /_=We\.useRef\(null\),iconUrlRef=We\.useRef\(null\)/);
  assert.match(bundle, /ref:_,className:`dropzone/);
  assert.match(bundle, /iconUrlRef\.current&&URL\.revokeObjectURL\(iconUrlRef\.current\)/);
  assert.match(bundle, /iconUrlRef\.current=U,f\(U\)/);
});
