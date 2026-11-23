# MDR Platform 3.2.0 — Change Summary

- Added Standard and Pro Android APK variants, configured as separate outputs in the prepared workflow template at `ci/android-apk.yml`.
- Integrated the pinned MIT-licensed Cannon-es 0.20.0 package as an optional Pro physics backend.
- Added collision notifications, body state/impulse APIs, bounded body count, fixed-step simulation and Three.js transform binding.
- Kept the base engine and app factory intact; Cannon code is loaded only when the Pro tool is invoked.
- Updated release metadata to 3.2.0 / versionCode 17.
