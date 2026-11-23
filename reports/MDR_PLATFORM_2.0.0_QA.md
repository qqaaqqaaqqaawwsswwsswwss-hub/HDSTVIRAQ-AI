# MDR Platform 2.0.0 — QA report

## Scope
Source-level verification of the 1.1.0 project with the 2.0.0 scene-editor MVP added. This is not a claim of a completed Android release test.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| Node test suites | PASS — 17 tests, 0 failures | `node --test tools/tests/*.test.cjs` |
| ZIP guard tests | PASS — 9 tests | `tools/tests/zip-guard.test.cjs` |
| Factory template tests | PASS — 4 tests | `tools/tests/factory-templates.test.cjs` |
| MDR Studio core tests | PASS — 4 tests | `tools/tests/mdr-studio-core.test.cjs` |
| Source verifier | PASS | `python3 tools/verify_source.py` |
| Android Manifest XML parse | PASS | source verifier |
| Bundled app JavaScript syntax | PASS | source verifier / Node `--check` |
| MDR Studio core syntax | PASS | `node --check` |
| MDR Studio runtime syntax | PASS | `node --check` |
| Gradle launcher shell syntax | PASS | `sh -n gradlew` |
| ZIP package integrity | PASS | `unzip -t` |

## Not executed

- `assembleDebug` was not run. The environment has JDK 21 but no Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT` unset) and no installed system Gradle.
- No APK was generated.
- No physical Android device or emulator test was run.
- Browser/WebGL runtime smoke test could not complete in this container because Chromium's EGL/SwiftShader initialization failed. This is an environment limitation, not a passing runtime test.
- Touch controls, raycast selection, scene import/export and WebView document picker still require manual device verification.

## Known risks / limitations

1. The scene editor is an MVP for primitive objects, not a full 3D editor.
2. GLB/GLTF import, skeletal animation, full physics and audio tools are not implemented.
3. The existing custom-code console still uses page-scope `new Function` and is not an isolated sandbox.
4. App Factory continues to generate WebView-based Android shells, not arbitrary native apps.

## Release decision

**Source MVP only — not ready to call a production APK.** The 17 automated Node tests and source checks pass. Build and on-device QA remain mandatory before release or publication.
