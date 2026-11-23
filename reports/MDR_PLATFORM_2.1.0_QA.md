# MDR Platform 2.1.0 — QA report

## Scope
Source-level regression repair on top of MDR Platform 2.0.0. This update fixes the MDR Studio runtime/engine bridge integration defect and corrects editor object tracking. It is not a completed Android device release test.

## Defect fixed
In the 2.0.0 bundled application, `window.__THREE__` is assigned the Three.js revision marker (`169`), not the Three.js namespace. The previous Studio runtime treated it as a namespace and returned early, so the editor could not mount. The previous runtime also expected `world.sceneObjects`, while the actual world class did not provide that collection.

2.1.0 adds a narrow `editorAddPrimitive` method to the bundled world class, using constructors already bundled in the application. The external runtime no longer accesses `window.__THREE__`; it tracks editor-created objects in its own collection and selects them using a list.

## Executed checks

| Check | Result |
|---|---|
| `python3 tools/verify_source.py` | PASS |
| Node test suites | PASS — 21 tests, 0 failures |
| Factory template tests | PASS — 4 |
| Scene core tests | PASS — 5 |
| ZIP guard tests | PASS — 9 |
| Engine bridge regression tests | PASS — 3 |
| `node --check` scene core | PASS |
| `node --check` Studio runtime | PASS |
| Bundled inline JavaScript syntax | PASS |
| Android Manifest XML parse | PASS |
| Gradle launcher shell syntax | PASS |
| ZIP archive integrity | PASS |

## What was verified
- Bundled engine contains the primitive editor bridge.
- Bridge uses bundled BoxGeometry, SphereGeometry, CylinderGeometry, MeshStandardMaterial and DirectionalLight constructors.
- Runtime no longer mistakes `window.__THREE__` revision string for the Three.js API.
- Runtime calls `active.editorAddPrimitive`.
- Scene serialization, validation, object limits, transform bounds, duplicate IDs and v1-to-v2 migration are covered by unit tests.
- Source verification checks Android WebView restrictions, file chooser, lifecycle markers, app version and engine bridge.

## Not executed
- Android `assembleDebug` build was not run; Android SDK is not configured in this execution environment.
- No APK was generated.
- No emulator or physical Android device test was run.
- Actual WebGL rendering, touch interaction, scene save/load through Android WebView, and file import/export require device/browser runtime testing.
- No GLB/GLTF importer, skeletal animation, complete physics engine, audio mixer or isolated JavaScript sandbox was added.

## Release decision
**2.1.0 source update — automated source checks pass; Android runtime remains unverified.** Do not publish as a production APK until building with Android SDK Platform 35 and testing on at least one physical Android device.
