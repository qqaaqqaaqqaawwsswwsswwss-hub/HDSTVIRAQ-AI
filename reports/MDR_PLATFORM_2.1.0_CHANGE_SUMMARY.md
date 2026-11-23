# MDR Platform 2.1.0 — change summary

## Baseline
MDR Platform 2.0.0 Android source. Existing game world, Android WebView host, ZIP validation and App Factory were retained.

## Important defect found and fixed
The previous MDR Studio runtime read `window.__THREE__` as if it were the Three.js API. In the bundled app it is assigned the Three.js revision string (`169`), so the runtime returned early and the editor did not mount. The engine now exposes a limited primitive creation bridge from the in-bundle world class, and the external editor calls that bridge.

## Editor fixes
- Uses the live world scene and bundled constructors.
- Tracks editor objects independently; the old runtime expected a `sceneObjects` array that the world class did not provide.
- Selection through a dropdown list; transform, scale, rotation and delete actions.
- Save/load and JSON import/export use the tracked object list.
- Adds directional lights; migrates schema v1 `pointLight` entries to schema v2 `directionalLight`.

## Verification
See `MDR_PLATFORM_2.1.0_QA.md`. 21 Node tests and source verification pass. Android APK build and on-device tests remain unverified.
