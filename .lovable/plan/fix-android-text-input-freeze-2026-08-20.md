# Fix Android text-input freeze

## Diagnosis

The leading root cause is a native Android window-insets conflict, not the individual React inputs:

- `AndroidManifest.xml` correctly uses `android:windowSoftInputMode="adjustResize"`, so opening the keyboard resizes the WebView.
- `MainActivity.applyCleanFullscreen()` applies the API 30+ `WindowInsetsController` path and then also applies deprecated `setSystemUiVisibility(...)` flags unconditionally.
- The project history confirms that repeatedly applying these same system-UI/insets flags during keyboard focus previously caused a WebView relayout loop. Removing the focus callback reduced that loop, but the mixed modern/legacy policy remains.
- A project-wide audit found no global `touchstart`, `touchmove`, or capture-phase input handler that cancels every text-field tap. The failure across unrelated inputs (upload title and messages) points to the shared Android IME/window path.

This is a strongly supported root-cause hypothesis, but it will not be called confirmed until a newly built debug APK is tested on the affected device.

## Changes

1. Update only `android/app/src/main/java/app/lovable/vip_life/twa/MainActivity.java`:
   - Keep the modern `WindowInsetsController` implementation on Android 11+.
   - Move deprecated `setSystemUiVisibility(...)` into an `else` branch for older Android versions so the two systems never compete.
   - Preserve the existing white system-bar appearance and all Google sign-in, Firebase, push, and WebView setup.
   - Add debug-build-only IME/insets diagnostics that log keyboard visibility and inset transitions without changing layout or intercepting touch events.

2. Keep `android:windowSoftInputMode="adjustResize"` unchanged. This is required for title/message fields to remain visible above the keyboard.

3. Do not change React UI, inputs, upload/message logic, auth, backend, Capacitor configuration, or the release AAB workflow.

## Verification

- Build the debug APK (`assembleDebug`) and verify the merged debug manifest still contains `adjustResize`.
- Verify source/build checks pass and the debug artifact is produced.
- Device confirmation requires tapping and typing in at least the upload Title field and message input, opening/closing the keyboard repeatedly, and checking that IME diagnostics show bounded transitions rather than continuous relayout events.
- Until that affected-device test passes, report the patch as implemented and build-verified, not as a confirmed freeze fix.
