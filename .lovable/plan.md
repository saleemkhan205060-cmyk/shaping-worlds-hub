# Fix Android keyboard spacing

## Investigation result

The strongest explanation is overlapping native keyboard/inset handling, not extra padding below the message input:

- The screenshot shows a white strip below the green chat boundary and above the keyboard.
- The message footer has only its normal small vertical spacing; it has no keyboard-height padding. The bottom navigation and its safe-area padding are hidden in an active conversation.
- Android requests `adjustResize`, while Capacitor 8.3.4's automatically registered SystemBars plugin also adds keyboard padding to the WebView parent. Its behavior changes with Android and System WebView versions.
- MainActivity has no active policy reconciling these mechanisms. Its old fullscreen method is disabled.
- Chrome does not run that native plugin, which explains why the same messaging screen can behave differently there.

This identifies a concrete conflicting code path. The exact path and numeric inset on the affected phone remain unconfirmed without device measurements; a screenshot alone cannot establish those values.

## Requested changes

Use one Android-only owner for keyboard and system-bar spacing. Measure the actual reported insets rather than using fixed keyboard heights or phone-specific offsets.

Keep the web version, message sending, attachments, voice recording, authentication, and message appearance unchanged. Do not add a second keyboard-resizing plugin or re-enable the legacy fullscreen method.

## Technical implementation

1. Add a small native inset policy/helper and install it from `MainActivity.onCreate()` after Capacitor has initialized its WebView. Replace the existing parent inset listener rather than stacking another listener on it.
2. On Android 11 and newer, use explicit edge-to-edge layout and app-owned inset application, with automatic platform IME resizing disabled for this path. Apply system-bar/cutout insets and the keyboard bottom inset once to the parent. Use the larger applicable bottom inset, never keyboard height plus navigation-bar height. Dispatch consumed inset values to the WebView so it cannot subtract those same spaces again.
3. On Android 10 and older, retain platform-managed `adjustResize` and fitted system windows, without adding keyboard padding to the already-resized WebView parent. This avoids relying on newer keyboard-inset APIs on older phones.
4. Reapply from inset delivery, including keyboard open/close and window-size changes; avoid repeated fullscreen/focus callbacks or DOM polling. Preserve system-bar appearance and existing native login/plugin setup.
5. Keep the manifest's existing `adjustResize` as the older-Android default; select the newer policy at runtime. No changes to shared React messaging or web viewport settings.
6. Add native unit tests for inset selection and modern/legacy behavior; record the single-owner rule in project architecture guidance.

Setting `SystemBars.insetsHandling = "disable"` alone is not the fix: in the installed version, it disables CSS injection but still installs the listener and applies keyboard padding.

## Verification and limits

- Run inset policy tests and inspect the native integration for duplicate resizing.
- Build an Android debug package if the available SDK/toolchain permits; report missing tooling rather than claiming a build succeeded.
- Physical-device acceptance: composer bottom meets keyboard top; opening/closing the keyboard restores the layout; multiline typing, sending, attachments and voice recording still work.
- Test older and newer Android versions, gesture and three-button navigation, and different keyboard apps/heights. Floating keyboards should not force a docked-keyboard offset.
- Web files remain untouched. Coverage for every phone/keyboard cannot be claimed without that device matrix.

No application files or settings have been changed yet. Approval authorizes implementation, not a claim of device-confirmed resolution.