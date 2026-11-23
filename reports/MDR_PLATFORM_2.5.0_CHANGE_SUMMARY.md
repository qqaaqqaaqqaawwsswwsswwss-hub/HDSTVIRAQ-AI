# MDR Platform 2.5.0 — Change Summary

## Quality and rendering
- Added Performance, Balanced, High, Ultra and 4K GPU-capped rendering profiles.
- 4K profile can exceed native device DPR when the GPU limit and 8.3-megapixel budget permit it; SmartScale lowers scale when frame time is over budget.
- Added real Three.js frame capture at up to a 3840-pixel long edge while restoring the active renderer/camera state after capture.

## Export workflow
- Added `.mdrgame` project ZIP containing validated scene JSON, GLB files and manifest.
- Added import support for `.mdrgame` archives. The importer rejects unsafe paths, duplicate entries, encrypted/compressed ZIP methods it does not support, local/central header mismatches and CRC mismatches.
- Added full Web runtime + Android Studio source project export. The export bootstrap stores bundled GLBs locally and restores the scene after the game world is ready.
- The Android export is source code for Android Studio, not a precompiled or signed APK.

## Mobile interface
- Added bottom navigation, compact header, stacked editor/game tools, scrollable content cards, safe-area padding, and larger touch controls.
- Moved MDR Studio editor into a smaller bottom sheet on phone-sized screens.

## Known limits
- Actual 4K output is hardware-dependent. The GPU may cap the long edge below 3840; the UI reports actual dimensions.
- The real-time 4K profile may reduce frame rate and is bounded to 8.3 megapixels and the GPU's reported WebGL limits.
- Game export captures MDR Studio project objects and GLB assets. Demo city content remains part of the bundled MDR runtime; code-console scripts and transient physics bodies are not serialized into the editor scene.
- Browser Web export should run through HTTP/HTTPS; `file://` can block IndexedDB and asset fetches.
- No Android SDK was available for compiling an APK, and no physical Android device/GPU test was performed.
