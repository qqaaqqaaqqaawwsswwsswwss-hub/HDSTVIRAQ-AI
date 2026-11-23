/* MDR Export 1.0 — portable scene packages, Web builds and Android Studio projects. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MDRExporter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  const encoder = new TextEncoder();
  const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
  const RUNTIME_FILES = [
    "mdr-zip-guard.js", "app-custom.js", "mdr-physics.js", "mdr-performance.js",
    "mdr-studio-core.js", "mdr-ai3d.js", "mdr-glb-loader.js", "mdr-asset-store.js",
    "mdr-studio-runtime.js", "mdr-quality-studio.js", "mdr-mobile-ui.js", "mdr-export.js",
    "mdr-mobile.css", "mdr-quality-studio.css", "mdr-quality-panel.js", "mdr-game-bootstrap.js"
  ];
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function safePath(path) {
    if (typeof path !== "string" || !path || path.length > 240 || path.startsWith("/") || path.includes("\\") || /[\u0000-\u001f]/.test(path))
      throw new Error("Invalid export path");
    const parts = path.split("/");
    if (parts.some(part => !part || part === "." || part === "..")) throw new Error("Unsafe export path");
    return path;
  }
  async function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (typeof Blob !== "undefined" && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
    if (typeof value === "string") return encoder.encode(value);
    throw new TypeError("Unsupported ZIP entry data");
  }
  function write16(view, offset, value) { view.setUint16(offset, value, true); }
  function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

  async function buildZip(entries) {
    if (!Array.isArray(entries) || entries.length > 4096) throw new Error("Export file count is invalid");
    const localParts = [], centralParts = [];
    let offset = 0, totalSize = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const seen = new Set();

    for (const entry of entries) {
      const path = safePath(entry.path);
      if (seen.has(path)) throw new Error("Duplicate export path: " + path);
      seen.add(path);
      const name = encoder.encode(path);
      const data = await toBytes(entry.data);
      totalSize += data.byteLength;
      if (totalSize > MAX_ARCHIVE_BYTES || data.byteLength > 0xffffffff) throw new Error("Export package exceeds the 250MB safety limit");
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
      write16(localView, 8, 0); write16(localView, 10, dosTime); write16(localView, 12, dosDate);
      write32(localView, 14, crc); write32(localView, 18, data.length); write32(localView, 22, data.length);
      write16(localView, 26, name.length); write16(localView, 28, 0); local.set(name, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + name.length);
      const view = new DataView(central.buffer);
      write32(view, 0, 0x02014b50); write16(view, 4, 20); write16(view, 6, 20);
      write16(view, 8, 0x0800); write16(view, 10, 0); write16(view, 12, dosTime); write16(view, 14, dosDate);
      write32(view, 16, crc); write32(view, 20, data.length); write32(view, 24, data.length);
      write16(view, 28, name.length); write16(view, 30, 0); write16(view, 32, 0);
      write16(view, 34, 0); write16(view, 36, 0); write32(view, 38, 0); write32(view, 42, offset);
      central.set(name, 46); centralParts.push(central);
      offset += local.length + data.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    if (entries.length > 0xffff || offset > 0xffffffff || centralSize > 0xffffffff) throw new Error("ZIP64 export is not supported; reduce the project size");
    const end = new Uint8Array(22); const endView = new DataView(end.buffer);
    write32(endView, 0, 0x06054b50); write16(endView, 4, 0); write16(endView, 6, 0);
    write16(endView, 8, entries.length); write16(endView, 10, entries.length);
    write32(endView, 12, centralSize); write32(endView, 16, offset); write16(endView, 20, 0);
    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.style.display = "none";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function assetPath(id) { return "project/assets/" + encodeURIComponent(id) + ".glb"; }
  async function collectSnapshot() {
    if (!root.MDRStudio || typeof root.MDRStudio.packageSnapshot !== "function") throw new Error("محرر MDR غير جاهز؛ افتح مشهد اللعبة أولاً");
    const snapshot = await root.MDRStudio.packageSnapshot();
    if (!snapshot || !snapshot.project || !Array.isArray(snapshot.assets)) throw new Error("تعذر تجهيز بيانات المشروع");
    return snapshot;
  }
  function projectEntries(snapshot, base = "") {
    const entries = [{ path: base + "project/scene.json", data: JSON.stringify(snapshot.project, null, 2) }];
    const manifest = { schema: "mdr-game-package", version: 1, scene: "project/scene.json", assets: [] };
    for (const asset of snapshot.assets) {
      const path = assetPath(asset.id);
      entries.push({ path: base + path, data: asset.blob });
      manifest.assets.push({ id: asset.id, name: asset.name, path: path, size: asset.blob.size });
    }
    entries.push({ path: base + "project/manifest.json", data: JSON.stringify(manifest, null, 2) });
    return entries;
  }

  function readStoredZip(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const minEnd = Math.max(0, bytes.length - 65_557);
    let endOffset = -1;
    for (let offset = bytes.length - 22; offset >= minEnd; offset--) {
      if (view.getUint32(offset, true) === 0x06054b50) { endOffset = offset; break; }
    }
    if (endOffset < 0) throw new Error("ملف المشروع ليس ZIP صالحاً");
    const diskNumber = view.getUint16(endOffset + 4, true);
    const centralDisk = view.getUint16(endOffset + 6, true);
    const diskCount = view.getUint16(endOffset + 8, true);
    const count = view.getUint16(endOffset + 10, true);
    const centralSize = view.getUint32(endOffset + 12, true);
    const centralOffset = view.getUint32(endOffset + 16, true);
    const endCommentLength = view.getUint16(endOffset + 20, true);
    if (diskNumber !== 0 || centralDisk !== 0 || diskCount !== count || count > 4096 ||
        endOffset + 22 + endCommentLength !== bytes.length || centralOffset + centralSize !== endOffset) {
      throw new Error("فهرس ZIP يتجاوز الحدود المسموحة أو يستخدم أقراصاً متعددة");
    }
    const files = new Map();
    let cursor = centralOffset, total = 0;
    for (let index = 0; index < count; index++) {
      if (cursor + 46 > endOffset || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("فهرس ZIP غير مكتمل");
      const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
      const crc = view.getUint32(cursor + 16, true), compressed = view.getUint32(cursor + 20, true), size = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const nameStart = cursor + 46, next = nameStart + nameLength + extraLength + commentLength;
      if (next > endOffset || !(flags & 0x0800) || (flags & 1) || method !== 0 || compressed !== size) throw new Error("يدعم مستورد MDR حالياً ملفات ZIP المخزنة غير المشفرة فقط");
      const path = safePath(new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength)));
      if (files.has(path) || total + size > MAX_ARCHIVE_BYTES) throw new Error("ملفات المشروع مكررة أو تتجاوز حد الحجم");
      if (localOffset + 30 > centralOffset || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("رأس ملف ZIP غير صالح");
      const localFlags = view.getUint16(localOffset + 6, true), localMethod = view.getUint16(localOffset + 8, true);
      const localCrc = view.getUint32(localOffset + 14, true), localCompressed = view.getUint32(localOffset + 18, true), localSize = view.getUint32(localOffset + 22, true);
      const localNameLength = view.getUint16(localOffset + 26, true), localExtraLength = view.getUint16(localOffset + 28, true);
      const localNameStart = localOffset + 30, localNameEnd = localNameStart + localNameLength;
      const localName = new TextDecoder().decode(bytes.subarray(localNameStart, localNameEnd));
      if (localName !== path || localFlags !== flags || localMethod !== method || localCrc !== crc || localCompressed !== compressed || localSize !== size) throw new Error("رأس ZIP المحلي لا يطابق الفهرس");
      const dataStart = localOffset + 30 + localNameLength + localExtraLength, dataEnd = dataStart + size;
      if (dataEnd > centralOffset || dataEnd < dataStart) throw new Error("بيانات ZIP خارج حدود الملف");
      const data = bytes.slice(dataStart, dataEnd);
      if (crc32(data) !== crc) throw new Error("فشل التحقق من سلامة الملف: " + path);
      files.set(path, data); total += size; cursor = next;
    }
    if (cursor !== centralOffset + centralSize) throw new Error("حجم فهرس ZIP لا يطابق عدد الإدخالات");
    return files;
  }

  async function importProjectPackage(file) {
    if (!file || typeof file.arrayBuffer !== "function" || file.size > MAX_ARCHIVE_BYTES) throw new Error("ملف MDR غير صالح أو أكبر من 250MB");
    if (!root.MDRStudio || typeof root.MDRStudio.importPackage !== "function") throw new Error("افتح مشهد اللعبة قبل استيراد المشروع");
    const files = readStoredZip(await file.arrayBuffer());
    const sceneBytes = files.get("project/scene.json"), manifestBytes = files.get("project/manifest.json");
    if (!sceneBytes || !manifestBytes) throw new Error("هذا الملف ليس حزمة MDR .mdrgame");
    let project, manifest;
    try { project = JSON.parse(new TextDecoder().decode(sceneBytes)); manifest = JSON.parse(new TextDecoder().decode(manifestBytes)); }
    catch (_) { throw new Error("بيانات مشروع MDR غير صالحة"); }
    if (!manifest || manifest.schema !== "mdr-game-package" || !Array.isArray(manifest.assets) || manifest.assets.length > 500) throw new Error("ملف manifest غير مدعوم");
    const assets = manifest.assets.map(item => {
      if (!item || typeof item.id !== "string" || item.path !== assetPath(item.id)) throw new Error("مسار أصل غير مطابق لمعرفه");
      const bytes = files.get(safePath(item.path));
      if (!bytes || (item.size && item.size !== bytes.byteLength)) throw new Error("أصل مفقود أو بحجم غير متوقع: " + item.name);
      return { id: item.id, name: item.name, blob: new Blob([bytes], { type: "model/gltf-binary" }) };
    });
    return root.MDRStudio.importPackage(project, assets);
  }

  async function exportProjectPackage() {
    const snapshot = await collectSnapshot();
    const entries = projectEntries(snapshot);
    entries.push({ path: "README.txt", data: "MDR Project Package\n\nImport scene.json into MDR Studio, and keep the project/assets directory beside it. GLB assets are referenced by asset ID.\n" });
    const zip = await buildZip(entries);
    download(zip, "MDR-Project.mdrgame");
    return { files: entries.length, bytes: zip.size, objects: snapshot.project.objects.length, assets: snapshot.assets.length };
  }

  function androidFiles() {
    return [
      { path: "android/settings.gradle", data: "pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = 'MDRGame'\ninclude ':app'\n" },
      { path: "android/build.gradle", data: "plugins { id 'com.android.application' version '8.6.1' apply false }\n" },
      { path: "android/gradle.properties", data: "org.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n" },
      { path: "android/app/build.gradle", data: "plugins { id 'com.android.application' }\n\nandroid {\n    namespace 'com.mdr.game'\n    compileSdk 35\n    defaultConfig { applicationId 'com.mdr.game'; minSdk 26; targetSdk 35; versionCode 1; versionName '1.0.0' }\n    compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }\n}\n\ndependencies { implementation 'androidx.webkit:webkit:1.18.0' }\n" },
      { path: "android/app/src/main/AndroidManifest.xml", data: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"><uses-permission android:name=\"android.permission.INTERNET\"/><application android:theme=\"@android:style/Theme.Material.Light.NoActionBar\" android:label=\"MDR Game\" android:hardwareAccelerated=\"true\" android:usesCleartextTraffic=\"false\"><activity android:name=\".AppActivity\" android:exported=\"true\" android:screenOrientation=\"unspecified\" android:configChanges=\"orientation|screenSize|keyboardHidden|keyboard|screenLayout|smallestScreenSize\"><intent-filter><action android:name=\"android.intent.action.MAIN\"/><category android:name=\"android.intent.category.LAUNCHER\"/></intent-filter></activity></application></manifest>\n" },
      { path: "android/app/src/main/res/values/strings.xml", data: "<?xml version=\"1.0\" encoding=\"utf-8\"?><resources><string name=\"app_name\">MDR Game</string></resources>\n" },
      { path: "android/app/src/main/java/com/mdr/game/AppActivity.java", data: `package com.mdr.game;\n\nimport android.app.Activity;\nimport android.content.Intent;\nimport android.net.Uri;\nimport android.os.Bundle;\nimport android.view.View;\nimport android.webkit.ValueCallback;\nimport android.webkit.WebChromeClient;\nimport android.webkit.WebResourceRequest;\nimport android.webkit.WebSettings;\nimport android.webkit.WebView;\nimport android.webkit.WebViewClient;\nimport androidx.webkit.WebViewAssetLoader;\n\npublic final class AppActivity extends Activity {\n  private static final String HOST = "appassets.androidplatform.net";\n  private static final int PICK_FILE = 4102;\n  private WebView web; private ValueCallback<Uri[]> upload;\n  @Override public void onCreate(Bundle state) {\n    super.onCreate(state);\n    WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();\n    web = new WebView(this);\n    WebSettings settings = web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);\n    settings.setAllowFileAccess(false); settings.setAllowContentAccess(false); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);\n    settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true); settings.setMediaPlaybackRequiresUserGesture(true);\n    web.setLayerType(View.LAYER_TYPE_HARDWARE, null); web.setWebChromeClient(new WebChromeClient() {\n      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {\n        if (upload != null) upload.onReceiveValue(null); upload = callback;\n        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT); pick.addCategory(Intent.CATEGORY_OPENABLE); pick.setType("*/*");\n        pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"model/gltf-binary", "application/json", "application/octet-stream"});\n        pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);\n        try { startActivityForResult(pick, PICK_FILE); return true; } catch (Exception error) { upload = null; callback.onReceiveValue(null); return false; }\n      }\n    });\n    web.setWebViewClient(new WebViewClient() {\n      @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return loader.shouldInterceptRequest(r.getUrl()); }\n      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { Uri u=r.getUrl(); if ("https".equalsIgnoreCase(u.getScheme()) && HOST.equalsIgnoreCase(u.getHost())) return false; if ("https".equalsIgnoreCase(u.getScheme())) { try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch (Exception ignored) {} } return true; }\n    });\n    setContentView(web); web.loadUrl("https://" + HOST + "/assets/index.html");\n  }\n  @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) { super.onActivityResult(requestCode,resultCode,data); if (requestCode==PICK_FILE && upload!=null) { Uri uri=resultCode==RESULT_OK && data!=null ? data.getData() : null; upload.onReceiveValue(uri==null ? null : new Uri[]{uri}); upload=null; } }\n  @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }\n  @Override protected void onPause() { if (web != null) web.onPause(); super.onPause(); }\n  @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }\n  @Override protected void onDestroy() { if (upload != null) { upload.onReceiveValue(null); upload=null; } if (web != null) { web.stopLoading(); web.destroy(); web = null; } super.onDestroy(); }\n}\n` }
    ];
  }

  async function fetchRuntimeFiles() {
    const files = [];
    for (const path of ["index.html", ...RUNTIME_FILES]) {
      const response = await fetch(new URL(path, root.location.href).toString(), { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("تعذر قراءة ملف البناء " + path + " (HTTP " + response.status + ")");
      files.push({ path, data: await response.arrayBuffer() });
    }
    const indexEntry = files.find(item => item.path === "index.html");
    let html = new TextDecoder().decode(indexEntry.data);
    if (!html.includes("mdr-game-bootstrap.js")) html = html.replace(/<\/body>/i, '<script src="mdr-game-bootstrap.js"></script>\n</body>');
    indexEntry.data = html;
    return files;
  }

  async function exportGameBuild() {
    const snapshot = await collectSnapshot();
    const runtimeFiles = await fetchRuntimeFiles();
    const entries = [];
    const addBoth = (path, data) => {
      entries.push({ path: "web/" + path, data });
      entries.push({ path: "android/app/src/main/assets/" + path, data });
    };
    for (const file of runtimeFiles) addBoth(file.path, file.data);
    for (const file of projectEntries(snapshot)) addBoth(file.path, file.data);
    for (const file of androidFiles()) entries.push(file);
    entries.push({ path: "README.md", data: `# MDR Game Export

This archive contains:
- **web/**: the MDR game runtime and exported scene. Serve this directory over HTTP/HTTPS (do not rely on file:// for IndexedDB/GLB loading).
- **android/**: an Android Studio project that embeds the same web runtime and project files.

## Android build
1. Open the android/ directory in Android Studio.
2. Install JDK 17, Android SDK Platform 35 and Build Tools 35.0.0.
3. Build > Build Bundle(s) / APK(s) > Build APK(s), or run: **gradle assembleDebug**.
4. The APK output is android/app/build/outputs/apk/debug/app-debug.apk.

## 4K
Use Graphics > Export 4K frame in the running engine. Capture resolution is limited by the phone GPU's WebGL renderbuffer/texture limits.

Note: this is a buildable source project, not a precompiled or signed APK.
` });
    const zip = await buildZip(entries);
    download(zip, "MDR-Game-Web-Android-Export.zip");
    return { files: entries.length, bytes: zip.size, objects: snapshot.project.objects.length, assets: snapshot.assets.length };
  }

  return Object.freeze({ crc32, safePath, buildZip, readStoredZip, importProjectPackage, exportProjectPackage, exportGameBuild, PROFILES: RUNTIME_FILES });
});
