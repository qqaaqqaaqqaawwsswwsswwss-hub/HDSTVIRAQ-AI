# MDR Platform 2.2.0 — Change Summary

## Added
- AI Image → 3D panel in MDR Studio, powered by the Meshy Image-to-3D API.
- JPG/PNG/WebP upload validation, maximum 20 MB, and local preview.
- Textured GLB generation task creation and progress polling.
- GLB result download link when the provider reports `SUCCEEDED`.
- API key is memory-only and is not added to scene JSON or localStorage.

## Important limitations
- Requires internet, a Meshy API key, and provider credits/account access.
- Direct browser calls may encounter CORS restrictions. Public deployments should use a private backend proxy; never ship a shared API key in an APK.
- GLB is currently delivered as a downloadable asset. Importing arbitrary GLB into the live editor scene and animation/rigging are not implemented in this release.
- No Android APK build or physical-device test was performed in this environment.
