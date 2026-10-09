# Android keyboard spacing

- [x] Inspect message sizing, native window configuration, and Capacitor inset handling.
- [x] Obtain approval for the isolated Android keyboard/insets fix.
- [x] Implement one native inset owner with version-aware resizing; keep web and messaging logic unchanged.
- [x] Add focused inset calculation tests and run available verification (six JUnit tests passed; native helper compiled against Android/AndroidX; preview build OK).
- [ ] Recover the existing Android build with Node 22+, Java 21, and SDK 36; build/sync/verify Capacitor, confirm native keyboard files unchanged, then run unit tests and assemble a debug APK without changing web or signing configuration.
- [ ] Install the debug APK on a physical Android device (requires device access).
- [ ] Verify keyboard/composer alignment and existing messaging flows on physical Android devices (requires rebuilt APK and device testing).