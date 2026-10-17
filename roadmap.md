# VIP Life implementation roadmap

## Approved global translation implementation
- [x] Capture and verify the unchanged 195-country baseline and all 92 approved targets; keep revised defaults staged, not active.
- [x] Generate a repeatable full-app candidate inventory (3,389 records across 117 files); classify and approve records before key completion.
- [x] Extract all 17 existing dictionaries unchanged; add tested interpolation, text isolation, plural/formatter capability checks and all-target release readiness safeguards.
- [ ] Classify the candidate inventory and integrate every app-owned UI string with a complete English source dictionary (incomplete; implementation must continue).
  - [x] Connect password recovery, sharing, comments and post-privacy wording to 55 additional English templates; stage Urdu and Swedish drafts without activating partial languages.
  - [x] Verify release readiness against actual bundled dictionaries, missing keys, parameters and unreviewed English-identical text, not status flags alone.
  - [x] Generate an all-92-target review pack with source-key locations, including dynamic preset keys, explicit category maps and conditional keys; current 230-key source remains incomplete.
  - [ ] Continue source classification and translation wiring across remaining screens, dialogs, options, errors and formatting; unfinished implementation, not awaiting another scope approval.
  - [x] Connect text-post composer/editor and video-cover picker, including preset labels and known surfaced errors; preserve saved style IDs and original text.
  - [x] Connect sign-in/signup and account-settings wording without changing consent, authentication or stored values; stage draft translations only.
  - [x] Verify signed-in local video-cover capture and readback, account-settings links, public signup consent, all 37 preset source locations and 20 localization tests; preview build OK.
  - [x] Connect upload and media actions to 44 additional source templates, with staged Urdu/Swedish drafts; preserve canonical categories, moderation, sharing, reporting/deletion permissions and original captions/titles.
  - [x] Verify signed-in upload privacy/category controls, original title/caption preservation, video-cover save/readback and real feed action-menu open/cancel; 22 localization tests pass, all seven mapped upload keys trace to source, preview build OK and zero browser page errors. No posts, reports or deletions submitted during checks.
  - [ ] Next batch: remaining Home feed wording, capture/editor/player controls and account-edit; preserve permissions, moderation and user content.
- [ ] Complete all 92 dictionaries and reviewed plural/formatting data, including rare-language targets (incomplete; implementation and qualified translation review required); do not release a partial set.
  - [ ] Extend beyond the current 230-key English/Urdu/Swedish staged source and 15 legacy navigation-only dictionaries; 74 targets have no bundled draft yet. No language has completed full-app coverage or review; readiness reports 3,626 unmet checks against the expanded source.
- [ ] Obtain native-speaker review for all targets and approved localized legal copy/artwork (requires qualified reviewers and approved content).
- [ ] Run complete coverage and signed-in web regression checks; verify physical Android behavior (requires device access).
- [ ] Activate all approved country defaults together only after every release gate passes (blocked by full dictionaries, content review and regression/device evidence).

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