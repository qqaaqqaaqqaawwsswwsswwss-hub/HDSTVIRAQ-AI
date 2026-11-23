# MDR Platform 3.1.0 — QA

## Changes
- Installable Arabic RTL web app with service-worker offline cache and mobile install/status prompt.
- Deterministic Baghdad brick-city generator; generated plans can be imported directly into MDR Studio after explicit confirmation.
- Android app version 3.1.0 / versionCode 16.
- No new third-party code was copied into the project. A regional Arabic engine candidate has no clear SPDX license, so its code was not reused.

## Verification
- `npm run build:web` and `npm run build:pages`.
- `npm run verify`: source validation and automated unit/integration tests.
- Android `assembleDebug` and physical-device/PWA installation need validation in an environment with JDK 17 and Android SDK.
