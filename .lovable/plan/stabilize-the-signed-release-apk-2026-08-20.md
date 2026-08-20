# Stabilize the signed Release APK

## APK evidence
- The Debug and Release APKs contain identical Capacitor configuration, plugins, web assets, and native libraries.
- The Release APK uniquely contains compiled baseline-profile files (`assets/dexopt/baseline.prof` and `.profm`).
- Release also repackages 12 Debug DEX files into 2 DEX files and applies release resource packaging, despite code shrinking already being disabled.
- These are the meaningful build-time differences; the tested WebView/keyboard source fix is already shared by both APKs.

## Changes
1. Make the `release` build type inherit the stable Debug build defaults, then override only what must remain Release-specific: release signing, non-debuggable status, and release version identity.
2. Explicitly disable code minification, resource shrinking, ZIP/resource optimization, baseline/ART profile packaging, and release-only dependency fallback behavior where Android Gradle supports it.
3. Keep the current UI, web code, auth, native WebView/IME fix, permissions, package name, and signing workflow unchanged.
4. Bump the Android version for a clean install/update and preserve the existing signed Release AAB, Release APK, and Debug APK workflow artifacts.
5. Run the local Release/Debug build verification available in this environment, inspect the resulting APK to confirm profiles are absent and contents align more closely, and report any signing/workflow limitation honestly.

## Technical note
The Release APK must remain `debuggable false`; enabling Android debugging would make it closer to Debug but would weaken production security and is not an acceptable Play release configuration.
