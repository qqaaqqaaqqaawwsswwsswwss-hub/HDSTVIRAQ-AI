# MDR Platform 3.2.0 — Standard + Pro QA

## Changes
- Standard and Pro Android product flavors have separate application IDs and version suffixes.
- Pro adds optional Cannon-es 0.20.0 3D rigid-body physics: static/dynamic/kinematic box and sphere bodies, impulses, contacts, fixed-step stepping, Three-style mesh binding, cleanup and body limits.
- Cannon is lazy-loaded from the Pro dashboard and the MIT license is included in `third_party/`.
- Standard remains on the existing MDR physics implementation; the hosted web app uses the Pro edition by default.

## Verification
- Source and Node suites pass locally; Android build is delegated to GitHub Actions.
- The local sandbox has no JDK or Android SDK, so APK assembly cannot run here.
- Physical installation/performance on Android devices is not verified until the CI artifacts are installed and tested.
