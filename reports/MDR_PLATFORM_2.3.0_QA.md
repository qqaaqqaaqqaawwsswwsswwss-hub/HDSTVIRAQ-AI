# MDR Platform 2.3.0 — QA Report

## Automated verification

- Node test suite: **36 passed, 0 failed** (includes GLB parser, invalid chunk/buffer checks, static scene import, project migration and prior Factory/ZIP tests).
- `node --check` for `mdr-glb-loader.js`, `mdr-asset-store.js` and `mdr-studio-runtime.js`: PASS.
- `python3 tools/verify_source.py`: PASS.
- Android manifest XML parse: PASS.
- Inline application bundle syntax check: PASS.

## GLB coverage

- Parses bounded, self-contained GLB 2.0 files.
- Validates magic, version, declared size, JSON/BIN chunks, buffer and accessor bounds, supported extension policy, finite vertex values, static mesh references and supported triangle modes.
- Enforces a 50 MB file cap, 1 million total vertices, 2,048 mesh primitives, a 96 MB decoded-accessor budget, and a 16-megapixel aggregate embedded-image budget.
- Builds static mesh objects using a mocked engine API in automated tests; actual bundled Three.js runtime rendering is not covered by this unit test.
- Embedded PNG/JPEG/WebP image decode and IndexedDB behavior require browser/WebView integration testing.

## Not verified in this environment

- No APK build was run because Android SDK environment variables/platform installation are not configured in this environment.
- Browser smoke testing was blocked by the execution environment (Chromium navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`).
- No physical Android device test, GPU/WebGL rendering check, live Meshy request or real texture-decoding test was performed.
