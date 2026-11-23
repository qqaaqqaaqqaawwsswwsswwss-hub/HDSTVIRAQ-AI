# MDR Platform 3.0.2 — Change Summary

- Added `gradle.properties` with AndroidX enabled.
- Enabled `buildFeatures { buildConfig true }` for the Android app module.
- Updated app label and version metadata to 3.0.2 / versionCode 14.
- Added Android build-configuration regression tests.
- Fixed the factory-generated Android project template to emit AndroidX Gradle properties and enable BuildConfig.
- Documented that `gradlew` and `gradlew.bat` are custom checksum-verifying bootstrap launchers, not the standard Gradle Wrapper.
- Android `assembleDebug` remains unverified because no Android SDK is installed in this environment.
