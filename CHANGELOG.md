# MDR Platform — Changelog

## 3.0.3 — Mobile and Web release

- Promoted Android/Web metadata to 3.0.3 / versionCode 15 and aligned the page title and release badge.
- Refined touch, safe-area, landscape and reduced-motion support for mobile browsers.
- Added dependency-free static web output and Vercel configuration.
- Prepared the release for an automated APK build; adding a GitHub Actions workflow is pending because the current GitHub connection lacks workflow-write permission.
- APK build/device verification is pending a JDK + Android SDK build environment and real-device testing.

## 3.0.2 — Android build configuration repair

- Added root `gradle.properties` with `android.useAndroidX=true`.
- Explicitly enabled `android.buildFeatures.buildConfig` because `AppActivity` reads `BuildConfig.DEBUG` and AGP 8 defaults BuildConfig generation to disabled.
- Updated the factory-generated Android project template to include AndroidX Gradle properties and enable BuildConfig.
- Updated Android app label and version metadata to 3.0.2 / versionCode 14.
- Added independent source checks for Android build configuration and metadata consistency; 86 automated tests pass.
- APK assembly remains NOT RUN: this environment has no Android SDK installed.


## 3.0.1 — 2026-11-23

- Fixed generated Android Activity Java string escaping to preserve `\n\n` in the emitted source.
- Escaped Windows path separators in the generated `gradlew.bat` template.
- Fixed factory Code Console examples to call `api.setAppName` and `api.setPackage`.
- Cleaned malformed/mixed-language UI copy and corrected generated README step numbering.
- Reclaimed replaced icon preview object URLs and reused day/night Color objects per world.
- Added regression coverage; `./verify.sh` passes with 78 tests.
- Bumped Android app version to 3.0.1 (versionCode 13).

## 3.0.0 — 2026-11-22
- Added MDR NextGen procedural world planner, renderer capability probe, AnimationMixer bridge, WebSocket multiplayer transport, safe visual graph runtime, bounded chunk streaming manager, and arcade vehicle dynamics helper.
- Added an in-app NextGen test panel and 10 automated tests for the new systems.
- Bumped Android app version to 3.0.0 (versionCode 12).
- Important scope: these are foundational/experimental systems. AI cloud generation, Vulkan renderer integration, full skeletal GLB import, multiplayer backend, full drag-and-drop graph editor, disk-backed world streaming, and production vehicle simulation remain future work.

## 2.5.0 — 2026-11-23
- Added MDR Quality Studio profiles including GPU-capped 4K real-time resolution.
- Added 4K PNG frame capture with framebuffer/texture-limit checks and aspect preservation.
- Added `.mdrgame` scene package export/import, including GLB assets, manifest validation, path checks and CRC verification.
- Added full Web + Android Studio source export with project bootstrap to restore exported scenes.
- Added responsive mobile workspace CSS, bottom navigation, touch-friendly controls and vertical game tooling layout.
- Advanced Android version metadata to 2.5.0 / versionCode 11.
- Added export, ZIP integrity, GPU quality and responsive UI verification coverage.

# MDR Platform Changelog

## 2.4.0 — 2026-11-23
- Added MDR Physics 0.1 rigid-body foundation (box/sphere, fixed-step integration, collisions, sensors, filters and events).
- Added MDR SmartScale adaptive WebGL resolution governor and distance-based Scene Budget.
- Added on-screen Auto/Full quality control and deterministic teardown of render hooks.
- Expanded verification coverage for physics and adaptive rendering.

# Changelog

## 1.1.0 — Engineering foundation update

- Hardened the Android WebView host with AndroidX WebViewAssetLoader and reduced direct file/content access.
- Added Android Storage Access Framework file selection to the app host and generated Android projects.
- Added WebView recovery handling and renderer teardown to reduce stale WebView instances.
- Added Three.js WebGL context loss/restoration handling, render error recovery, background pausing, bounded mobile pixel ratio, and deterministic resource cleanup.
- Added virtual touch joystick for coarse-pointer devices.
- Added bounded ZIP archive validation with path traversal, duplicate path, file count, size, compression ratio and portability checks.
- Changed Factory security messaging so a clean text scan is not presented as proof that an archive is safe.
- Added Node tests for ZIP validation and generated Android templates.
- Added local source verification and architecture/gap documentation.

## 1.0.2

- Baseline source supplied by the project owner.

## 2.0.0 — MDR Studio scene editing MVP

- Added an in-scene, touch-sized primitive editor for boxes, spheres, cylinders and point lights.
- Added object selection, X/Z nudging, Y rotation and deletion.
- Added local scene save/load and JSON import/export.
- Added a standalone scene data core with schema validation, object limits, transform bounds, duplicate-ID rejection and JSON size limits.
- Added world-ready/world-destroy lifecycle events so editor controls follow the scene lifecycle.
- Advanced Android version metadata to 2.0.0 / versionCode 6.
- Added four Node.js unit tests for the scene-project core.

### Known limitations
- This is an editor MVP, not a full professional level editor.
- GLB/GLTF import, skeletal animation, full physics, audio mixer and native Android project generation remain future work.
- User-entered JavaScript still executes in page scope and is not isolated.
- Android APK build and on-device testing have not been completed in this environment.


## 2.1.0 — Studio engine bridge repair

- Fixed the MDR Studio integration bug: the bundled `window.__THREE__` value is the Three.js revision marker, not the Three.js namespace.
- Exposed a narrow primitive-creation bridge on the live MDR world using the bundled Three.js constructors.
- Reworked object selection to use an editor list instead of an unavailable external Raycaster API.
- Fixed editor object tracking, transform synchronization, save/load, JSON import/export and disposal.
- Added directional-light support and schema v1 to v2 migration for legacy `pointLight` scenes.
- Added engine bridge regression tests and advanced Android metadata to 2.1.0 / versionCode 7.


## 2.2.0 — AI Image to 3D
- Added optional Meshy image-to-3D client integration in MDR Studio.
- Added image validation (JPG/PNG/WebP, 20 MB cap), local preview, task polling, progress/status, and GLB download link.
- API key remains in the active page only; it is not persisted in localStorage or scene exports.
- Added adapter tests for validation, task creation, GLB request settings, and polling.
- Limitation: generated GLB is downloadable but is not yet imported into the live scene. A private proxy is recommended for public distribution to protect API keys and handle CORS.


## 2.3.0 — GLB asset pipeline

- Added a bounded self-contained GLB 2.0 parser and static mesh scene importer using the constructors bundled with the engine.
- Added node hierarchy, TRS/matrix transforms, triangle lists/strips/fans, vertex/index attributes, PBR base-color/normal/emissive/metallic-roughness maps, and embedded PNG/JPEG/WebP textures.
- Added asset validation and limits: 50 MB per file, GLB 2.0 header/chunk checks, buffer/accessor bounds, finite vertex data, bounded node/material/image counts and texture dimensions; 1 million total vertices, 2,048 mesh primitives, 96 MB decoded-accessor data and 16 megapixels of aggregate embedded images.
- Added offline IndexedDB storage, GLB selection/import, selected-asset download, and local asset restoration when loading scene projects.
- Connected the AI-generated GLB result to the live scene when provider CORS permits; download-and-import remains the fallback.
- Advanced MDR scene schema to v3 with v1/v2 migration and Android version metadata to 2.3.0 / versionCode 9.
- Added unit tests for GLB parsing/loading, validation failures and memory budgets, local asset identifiers and scene migration.
- Scene loading now preflights all referenced GLB assets before clearing the current scene, protecting the open project from missing or malformed local assets.
