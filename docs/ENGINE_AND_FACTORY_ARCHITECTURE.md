# MDR Platform 2.3.0 — Architecture and scope

## Android host
- `AppActivity.java` hosts the web UI using AndroidX `WebViewAssetLoader` at `https://appassets.androidplatform.net/assets/`.
- Direct file/content access and mixed content are disabled; file selection is delegated to Android's document picker.
- WebView renderer failure and main-frame load failure display a recovery surface.

## Web application
- `index.html` contains the bundled React UI, bundled Three.js engine and Android project factory.
- `mdr-zip-guard.js` validates uploaded archive metadata and limits before extraction.
- `mdr-studio-core.js` validates the versioned `mdr-scene` JSON schema, supported object types, vector values, IDs, object count and import size. It migrates schema v1 `pointLight` records to `directionalLight` and upgrades both schema v1/v2 projects to v3.
- `mdr-studio-runtime.js` attaches to the active Three.js city scene and provides a mobile editor for primitives and imported GLB assets.
- `mdr-glb-loader.js` validates self-contained GLB 2.0 chunks/accessors and builds static meshes using a narrow engine constructor API. It supports triangle primitives, node hierarchy, transforms, common vertex attributes, PBR materials and embedded PNG/JPEG/WebP textures.
- `mdr-asset-store.js` persists binary GLB files in IndexedDB; scene JSON stores asset IDs and object transforms, not the binary payload.

## Engine runtime
- `AT` is the internal Three.js renderer/game-loop host with fixed-step systems and render systems.
- `PT` is the city world and player/camera/input controller.
- MDR Studio lifecycle is connected through `mdr2:world-ready` and `mdr2:world-destroy` events.
- The `PT.editorAddPrimitive(type, spec)` bridge creates editor primitives using the bundled Three.js constructors. The 2.3.0 `PT.editorThreeAPI()` bridge exposes only Group, Mesh, BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, Texture, Color and Matrix4 constructors to the GLB adapter. This avoids exposing the full internal Three.js namespace.
- Editor objects supported: box, sphere, cylinder, directional light and GLB model roots. The runtime maintains its own collection rather than assuming the game world has a `sceneObjects` property.
- Object selection uses an editor dropdown; transforms include X/Z movement, Y rotation and uniform scale.

## Scene data format
A project is JSON with `schema: "mdr-scene"`, `version: 3`, `name`, and an `objects` array. Versions 1 and 2 migrate to version 3. Each object stores ID, type, name, position, rotation, scale and color; GLB objects also store a local asset ID and file name. The core rejects duplicate IDs, unsupported types, invalid vectors, more than 500 objects and scene JSON over 2 MB. Versions 1 and 2 migrate to version 3 during parsing.

## App Factory
- The existing factory remains a web-to-Android WebView project generator.
- It validates ZIP metadata and generates Android Gradle project files; it does not generate native Kotlin/Java application logic from arbitrary HTML.

## Security boundaries
- ZIP validation limits archive metadata and paths; it is not malware scanning.
- Custom JavaScript execution remains page-scoped via `new Function`; it is not isolated and must not be treated as a security sandbox.
- Scene JSON is data-only and validated before import; it is not executable code.

## GLB import limits
- Only self-contained GLB 2.0 files are accepted (up to 50 MB); `.gltf` JSON with external resources is not supported.
- Draco, Meshopt, sparse accessors, skins, skeletal animation, morph targets, cameras and non-triangle primitive modes are not implemented. Animation tracks are not played.
- Embedded PNG/JPEG/WebP textures are supported; external image URIs and KTX2/Basis textures are rejected. The importer caps a model at 1 million total vertices, 2,048 mesh primitives, 96 MB decoded accessor data and 16 megapixels across embedded images.
- Scene JSON contains references to locally stored GLB files. For transfer to another device, export each selected GLB separately and place it alongside the JSON; the files are not packed into one archive.

## Not included yet

- Skeletal rigging/animation editor.
- Full physics engine, rigid-body solver, joints or collision authoring.
- Audio mixer/spatial audio tools.
- WebGPU renderer, visual scripting, profiler and native build service.
- A full professional level editor comparable to Unity or Unreal.


## AI asset generation

The Studio runtime loads `mdr-ai3d.js`, a provider adapter for Meshy's asynchronous Image-to-3D API. It validates local image input, creates a textured GLB task, polls status, and presents the resulting GLB URL. This is a provider-backed generation path, not an on-device AI model. The generated GLB can now be added to the scene when CORS allows a direct fetch; otherwise download and import it manually. A production deployment should route requests through a private backend to protect API credentials and handle provider CORS.

## 3.1.0 hosted mobile additions
- The web distribution publishes a standalone-capable Arabic RTL manifest and an origin-scoped service worker. The cache is versioned and contains only this app's static files; user project data remains in browser storage.
- The Android WebView asset host explicitly skips PWA service-worker registration; the native host continues to use its local asset loader.
- MDR NextGen's seeded Baghdad theme produces bounded primitive scene data and can import it through the existing MDR Studio package bridge after the user confirms replacing the open scene.
- Regional open-source candidate review and license constraints are recorded in `OPEN_SOURCE_REVIEW.md`.


## 3.2.0 unified Android editor
- Android now ships one application ID and one APK. Game-scene editing, app factory and the advanced physics backend are parts of the same app.
- The unified app lazy-loads the MIT-licensed Cannon-es JavaScript physics runtime; the MIT notice is retained in the repository. The adapter caps bodies and simulation delta, exposes a fixed-step world, contacts, impulse helpers, and transforms bound to Three-style meshes.
- MDR retains its original lightweight physics path as a fallback. Cannon is available from the physics tool in the unified Android APK and hosted web build.
