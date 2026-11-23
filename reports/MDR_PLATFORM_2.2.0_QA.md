# MDR Platform 2.2.0 — QA Report

## Automated verification

- `./verify.sh`: PASS
- Node tests: **25 passed, 0 failed**
- AI image-to-3D adapter tests: 4 passed
- Studio engine bridge tests: 3 passed
- Scene core tests: 5 passed
- Factory template tests: 4 passed
- ZIP guard tests: 9 passed
- `node --check` for `mdr-ai3d.js`, `mdr-studio-core.js`, and `mdr-studio-runtime.js`: PASS
- Inline application bundle syntax check: PASS
- Android manifest XML parse: PASS
- Gradle launcher shell syntax: PASS

## AI Image → 3D implementation

The Studio UI accepts JPG/PNG/WebP images up to 20 MB, previews the selected image, accepts a Meshy API key for the current page session, creates a textured `meshy-7.1` image-to-3D task, polls the task status, and exposes the GLB result URL when the provider reports success. The key is not persisted to localStorage or included in scene JSON.

The adapter tests use mocked HTTP responses. **No live Meshy API request was made**, no credits were consumed, and no real GLB was generated in QA.

## Known limitations

- Requires internet, a Meshy API key, and provider credits/account access.
- Direct browser calls may be blocked by CORS; public deployment should use a private backend proxy.
- Do not embed a shared API key in a distributed APK.
- GLB output is currently offered as a download/open link; arbitrary GLB import into the live editor scene is not implemented yet.
- Skeletal animation/rigging is not implemented.
- Android APK build and physical Android device/WebView test were not run in this environment; Android SDK environment variables are not configured.
