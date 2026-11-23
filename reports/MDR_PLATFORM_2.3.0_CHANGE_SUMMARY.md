# MDR Platform 2.3.0 — Change Summary

## Added
- Import of self-contained GLB 2.0 models into the live Three.js scene.
- Static mesh hierarchy, transforms, triangle geometry, PBR factors and embedded PNG/JPEG/WebP textures.
- IndexedDB asset storage for offline project restoration.
- Selected GLB asset download and scene JSON export with asset references.
- Direct AI-generated GLB import when the provider permits CORS.
- Scene schema v3 and automatic migration from schema v1/v2.
- 50 MB asset limit plus header, chunk, buffer, accessor, vertex, node and texture validation; 1 million vertices, 2,048 primitives, 96 MB decoded-accessor and 16-megapixel aggregate image budgets.

## Limitations
- No `.gltf` JSON/external resource import, Draco or Meshopt decoding, skins, animation playback, morph targets or physics.
- Scene JSON does not include binary GLB files. Export the selected GLB files separately when moving a project to another device.
- Android APK and physical-device testing are separate release checks; a successful source test run is not proof of an APK build or device compatibility.
