# MDR Platform 2.5.0 — QA Report

## Automated verification
- `./verify.sh`: PASS
- Node tests: 61 passed, 0 failed.
- Python source verifier: PASS.
- Syntax checks: all MDR runtime, quality, export, bootstrap and mobile UI JavaScript modules pass `node --check`.
- Android manifest XML validation: PASS.
- Shell syntax for Gradle bootstrap launcher: PASS.

## Specific feature tests
- Quality profiles obey device DPR, WebGL framebuffer/texture caps and pixel budgets.
- 4K capture dimensions preserve viewport aspect ratio and downgrade honestly when a GPU's supported renderbuffer edge is below 3840.
- ZIP generation produces valid stored ZIP headers and central directory records.
- ZIP import validates UTF-8 paths, rejects traversal/duplicate paths, verifies local/central header consistency, rejects multi-disk or mismatched end-directory records, and validates CRC32.
- `.mdrgame` import/export API passes valid empty-scene round-trip path tests and rejects missing manifests.
- A simulated empty-scene Web + Android Studio export created a ZIP with 46 entries; Python `zipfile.testzip()` returned no corruption, and expected Web/Android source files were present.

## Not verified in this environment
- APK compilation: not run because Android SDK / `ANDROID_HOME` / `ANDROID_SDK_ROOT` are absent. JDK 21 is present; Gradle command is not installed.
- Physical Android touch layout, WebView file-picker behavior, thermal performance, live 4K rendering and hardware-specific GPU compatibility.
- A headless Chromium visual snapshot did not complete in the available environment; responsive layout is covered by source/CSS checks but needs real-device review.

## Result
Source-level verification and simulated package validation pass. APK build, real-device UI acceptance and GPU-specific 4K claims remain pending on Android hardware.
