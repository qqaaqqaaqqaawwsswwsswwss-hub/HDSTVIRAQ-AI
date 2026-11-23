# MDR Platform 3.0.1 — QA Report

## Scope
Maintenance release based on the MDR Platform 3.0.0 working tree. This release addresses verified Android factory template defects and low-risk UI/runtime cleanup.

## Changes verified
- Generated `AppActivity.java` contains escaped Java newline sequences in the `TextView.setText` string.
- Generated `gradlew.bat` preserves `%USERPROFILE%\.gradle`, Gradle cache path separators, and `%CACHE%\bin\gradle.bat`; no Backspace control character is emitted.
- Code Console examples and placeholder use the `api` object supplied to the sandbox.
- Generated README build steps are numbered sequentially.
- Live preview function does not consume `customJs` or `customCss`; these remain injected only into exported project files.
- Icon preview object URLs are revoked when replaced and when the factory component unmounts.
- Day/night cycle reuses per-world Three.js Color instances instead of allocating new Color objects every fixed tick.
- Broken/mixed-language factory copy was cleaned.

## Automated verification
- `python tools/verify_source.py`: PASS
- `node --test tools/tests/*.test.cjs`: 78 passed, 0 failed
- `./verify.sh`: PASS (`MDR VERIFY ALL: PASS`)

## Not verified in this environment
- Android `assembleDebug` / `assembleRelease`: NOT RUN; Android SDK and Gradle installation are not available in this environment.
- Installation and runtime behavior on a physical Android device: NOT TESTED.
- Windows execution of the generated batch launcher: template output is regression-tested, but not executed on Windows.
- GPU performance, city draw-call profiling, and full physics integration between city colliders and player/rigid bodies: NOT TESTED / NOT IMPLEMENTED by this maintenance release.

## Version
- Android `versionName`: `3.0.1`
- Android `versionCode`: `13`
