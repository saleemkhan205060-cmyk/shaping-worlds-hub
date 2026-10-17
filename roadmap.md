# VIP Life implementation roadmap

## Approved global translation implementation
- [ ] Capture and verify the unchanged 195-country baseline and all 92 approved targets.
- [ ] Inventory app-owned text across every route, component, and shared utility, including dynamic messages and hidden states.
- [ ] Build bundled translation, interpolation, plural, formatting, direction, and completeness safeguards without activating incomplete targets.
- [ ] Integrate every app-owned UI string and complete all 92 dictionaries; do not release a partial set.
- [ ] Obtain native-speaker review for all targets and approved localized legal copy/artwork (requires qualified reviewers and approved content).
- [ ] Run complete coverage and signed-in web regression checks; verify physical Android behavior (requires device access).
- [ ] Activate all approved country defaults together only after every release gate passes.

## Country-language investigation (no app changes)
- [x] Finalize and cross-check all 195 mappings against the complete 92-target registry (17 retained + 75 additional); identify confirmation choices and require full-target translation/testing before rollout. Await user review before any implementation.
- [x] Recommend a default UI language for each of the 195 existing countries, document multilingual alternatives, and list required translations/files; preserve selector and persistence. Mapping remains proposed for review, not applied.

## Android verification

- [x] Inspect message sizing, native window configuration, and Capacitor inset handling.
- [x] Obtain approval for the isolated Android keyboard/insets fix.
- [x] Implement one native inset owner with version-aware resizing; keep web and messaging logic unchanged.
- [x] Add focused inset calculation tests and run available verification (six JUnit tests passed; native helper compiled against Android/AndroidX; preview build OK).
- [x] Recover the existing Android build with Node 22.22.0, Java 21, and SDK 36; Capacitor build/sync/verification passed, custom native and authored web files unchanged, seven unit tests passed, and signed debug APK assembled at android/app/build/outputs/apk/debug/app-debug.apk. Release signing configuration untouched.
- [ ] Install the debug APK on a physical Android device (requires device access).
- [ ] Verify keyboard/composer alignment and existing messaging flows on physical Android devices (requires rebuilt APK and device testing).