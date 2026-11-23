# MDR Platform 2.4.0 — QA Report

## Automated verification

- `./verify.sh`: **PASS**.
- Node test suite: **50 passed, 0 failed**. This includes six SmartScale/Scene Budget tests, eight physics tests, GLB parser/loader tests, editor/project migration tests, and Factory/ZIP validation tests.
- `node --check` for physics, SmartScale, GLB, asset store, AI 3D, Studio core/runtime and the inline application bundle: PASS.
- `python3 tools/verify_source.py`: PASS.
- Android Manifest XML parse: PASS.

## Runtime integration

- SmartScale loads after the physics module and listens for `mdr2:world-ready` / `mdr2:world-destroy`.
- SmartScale adjusts `renderer.setPixelRatio()` and the engine's `pixelRatioCap`; renderer pixel ratio and shadow enablement are restored during teardown.
- The Scene Budget is opt-in and only manages registered objects.
- The physics module is integrated into the bundled game world through its fixed-step update and `api.world.physics` code API.

## Not verified in this environment

- No Android APK was produced; Android SDK Platform 35 / Build Tools were not configured for this run.
- No physical Android device, GPU/WebGL browser smoke test, frame-time benchmark, thermal behavior, or long-session memory test was performed.
- Automated tests use mocked renderer/scene objects for SmartScale and physics logic; they do not prove visual correctness on device.
