# MDR Platform 1.1.0 — QA Report

**Scope:** source archive update, static validation, JavaScript unit tests and generated-template checks.

## Passed checks

| Check | Result | Evidence |
|---|---|---|
| Main bundled JavaScript syntax | PASS | `node --check` through `tools/verify_source.py` |
| AndroidManifest.xml parsing | PASS | Python `xml.etree.ElementTree` |
| ZIP input extension/size validation | PASS | Node test suite |
| ZIP path traversal and absolute path rejection | PASS | Node test suite |
| ZIP duplicate path rejection | PASS | Node test suite |
| ZIP file-count, per-file and total-size limits | PASS | Node test suite |
| ZIP suspicious compression ratio and missing compressed size | PASS | Node test suite |
| Generated Android manifest template | PASS | Node test suite |
| Generated Android WebView file picker/security template | PASS | Node test suite |
| Generated Android Gradle template | PASS | Node test suite |
| Complete Factory-generated project file set and launcher script modes | PASS | Node test suite |
| Shell launcher syntax | PASS | `sh -n gradlew` |

## Test counts

- ZIP guard tests: 9 passed.
- Factory template tests: 4 passed.
- Total Node tests: 13 passed, 0 failed.

## Not run / not certified

- Gradle Android build: NOT RUN. No Android SDK or installed Gradle is present in the execution environment.
- APK installation / launch on physical hardware: NOT RUN.
- WebGL rendering on Android GPU: NOT RUN.
- Touch gesture behavior on a physical touchscreen: NOT RUN.
- Memory/thermal/FPS profiling: NOT RUN.
- Full security assessment or dynamic malware analysis: NOT RUN.
- Secure code-execution isolation: NOT IMPLEMENTED. `new Function` remains in the page runtime and is explicitly not a security sandbox.

## Release decision

**Source update ready for configured build and device QA; not certified for Play Store or production release.**

Run in a configured Android environment:

```sh
./gradlew assembleDebug
```

Then install and manually exercise:

1. Open MDR Engine and verify 3D scene creation, touch joystick, camera gesture, pause/resume and recovery after backgrounding.
2. In MDR Factory select a ZIP using the Android file picker; verify preview, file list, scan results and generated project archive.
3. Open the generated project in Android Studio or build it with its generated Gradle launcher.
4. Confirm APK startup, orientation changes, file selection and error recovery on Android 8.0+.
