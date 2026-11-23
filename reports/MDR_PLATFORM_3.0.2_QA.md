# MDR Platform 3.0.2 — QA Report

## Scope
Build-configuration maintenance release based on MDR Platform 3.0.1.

## Changes
- Added `gradle.properties` and enabled AndroidX.
- Enabled BuildConfig generation explicitly for the app module.
- Updated Android label, `versionName` to 3.0.2, and `versionCode` to 14.
- Added regression checks for these settings and for the documented Gradle bootstrap behavior.
- Updated the factory-generated Android project template too: it now emits `gradle.properties` with AndroidX enabled and explicitly enables BuildConfig in the generated app module.

## Automated verification
- `python3 tools/verify_source.py`: see `reports/verify-output-3.0.2.txt`.
- `node --test tools/tests/*.test.cjs`: PASS — 86 tests, 0 failures (see `reports/verify-output-3.0.2.txt`).
- `./verify.sh`: PASS — `MDR VERIFY ALL: PASS` (see `reports/verify-output-3.0.2.txt`).

## Android build status
- `assembleDebug`: NOT RUN. No Android SDK / `ANDROID_HOME` / `ANDROID_SDK_ROOT` is installed in the build environment.
- Physical Android installation and runtime: NOT TESTED.
- Gradle distribution: the custom bootstrap launchers pin Gradle 8.14.8 and verify SHA-256 before extraction. The checksum matches the official Gradle checksum listing. This package does not include the standard Gradle Wrapper JAR.

## Remaining known risks
- Factory Code Console JavaScript still executes in page scope; it is not a security sandbox.
- The bundled engine remains a Three.js-based MVP, not a full Unity/Godot-equivalent engine.
- No multiplayer server, skeletal animation import/skinning, complete visual scripting editor, or full city/player physics integration is included.
