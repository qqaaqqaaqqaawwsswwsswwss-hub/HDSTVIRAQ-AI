# MDR Platform 3.0.3 — Release QA

## Changes
- Promoted Android/Web app metadata to 3.0.3 / versionCode 15.
- Updated the web document title and in-app release badge to match Android metadata.
- Polished mobile safe-area, touch, focus-visible, reduced-motion and landscape behavior.
- Added a dependency-free static web build for Vercel.
- Added GitHub Actions APK build and artifact publishing workflow.

## Verification
- `npm run build:web`: local static asset copy build.
- `npm run verify`: source checks and Node test suite.
- Android `assembleDebug`: not run in this sandbox; no JDK or Android SDK is installed. GitHub Actions is configured to build it on push and upload a debug APK artifact.
- Physical device installation and runtime: not tested here.
