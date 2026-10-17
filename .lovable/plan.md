# VIP Life: complete global translation without changing the country selector

## Scope and non-negotiable safeguards
- Retain **all 195 existing Home country options**, including their names, ISO codes, flags, alphabetical ordering, search, selection interaction, and popup design. Do not replace the country list with a language list or remove countries.
- Preserve language persistence under `viplife.lang`, saved-choice restoration, and the current deterministic English startup behavior.
- Preserve Android/mobile translation safety guards, native keyboard/inset behavior, and the existing document-level LTR layout. Do not mount or reactivate the automatic DOM translator.
- This is investigation and planning only. No app code, database, permissions, or native configuration changes are authorized by this request. Implementation requires separate approval.

## Verified findings
1. **Country options and languages are separate.** `src/components/Layout.tsx:49–249` contains 195 unique country names and 195 unique ISO codes, each with one `lang` value. Those values cover all 17 currently supported languages. Country count does not imply 195 translation dictionaries.
2. `Layout.tsx:414–417` sorts the entire country array; the popup renders `sortedCountries` at lines 563–589. Selecting a country calls `setLang(c.lang)` at line 568. `sortedLangs` at lines 418–421 is not the list rendered by this popup.
3. Some country mappings are approximations rather than the country's language: Sweden → `en`, Iran → `ur`, Ukraine → `ru`, Malaysia → `id`, and Sri Lanka → `hi`. A country may have several languages; country alone cannot reliably identify a user's preferred language. Country selection is a UI-language default here, not proof of the user's spoken language.
4. `src/lib/i18n.tsx:3–25` defines 17 supported codes: `en`, `es`, `fr`, `pt`, `de`, `it`, `ar`, `ur`, `hi`, `bn`, `tr`, `ru`, `zh`, `ja`, `ko`, `id`, `sw`. Its dictionaries currently cover only 25 navigation/common keys per language. Lookup at lines 265–268 falls back to English and then the key. Literal page text never reaches that lookup.
5. `I18nProvider` wraps the app in `src/routes/__root.tsx`. Current content routes and feature components do not use `useI18n()`; the shared `Layout` translates only selected labels. This incomplete integration is the principal cause of mixed-language screens, not failed language persistence.
6. `src/lib/auto-translate.tsx:92–105,248–250,263` skips native apps and small-screen/coarse-pointer browsers to prevent freezes. It is not mounted. It also cannot comprehensively translate placeholders and accessibility labels. It is not the proposed solution.

Current country mapping distribution: English 76; Arabic 24; French 24; Spanish 21; Russian 16; Portuguese 7; German 4; Hindi 4; Indonesian 4; Italian 3; Urdu 3; Korean 2; Swahili 2; Turkish 2; Bengali, Chinese, and Japanese 1 each. Total: 195.

## Proposed complete solution

### 1. Establish one complete translation source
- Keep the existing provider, hook, and selected-language contract; extend the central translation system with organized dictionaries for common text and each feature.
- Define the English key inventory once. Every supported language must supply every required key; automated coverage checks should reject incomplete dictionaries rather than treating English fallback as successful translation.
- Support named placeholders, plural forms, and locale-aware dates, relative times, and numbers. Translate complete sentences, not English fragments joined around names.
- Keep the existing safe runtime fallback for unexpected failures, but track missing translations during development and prevent them from reaching a completed language release.
- Use reviewed, bundled translations for app-owned UI. No live AI calls or full-document scanning are needed when a user switches language, including in the Android app.

### 2. Connect all app-owned text to the selected language
Audit each route and its shared controls, including labels, buttons, placeholders, tooltips, accessibility text, validation, loading/empty/error states, confirmation dialogs, and success/failure notices. Reuse common keys rather than translating shared controls differently on each page.

Affected files/groups:
- Shared navigation and selector wording: `src/components/Layout.tsx` — change text only, not selector structure, styling, country names, flags, or options.
- Home/feed and shared interactions: `src/routes/index.tsx`, `src/components/HomeFeed.tsx`, `CommentsSheet.tsx`, `ShareSheet.tsx`, `EditPostDialog.tsx`, `TextPostComposer.tsx`, and other media/privacy/editor controls.
- Authentication and account: `src/routes/auth.tsx`, `reset-password.tsx`, `account-settings.tsx`, `account-edit.tsx`, `profile.tsx`, `u.$id.tsx`.
- Social/media pages: `src/routes/messages.tsx`, `notifications.tsx`, `search.tsx`, `upload.tsx`, `videos.tsx`.
- Marriage: `src/routes/marriage.*.tsx`, `src/components/MarriageAlbum.tsx`, and rendered form/picker controls.
- Administration: `src/routes/admin.*.tsx`, `src/components/admin/AdminLayout.tsx`, and admin controls. Full-app coverage includes these screens without changing permissions or moderation behavior.
- Information and errors: `src/routes/about.tsx`, `privacy.tsx`, `terms.tsx`, and error/not-found text in `src/routes/__root.tsx`.

Shared picker display labels should be translated while preserving stored values. Known backend errors should map to localized messages; do not alter backend behavior or expose private error details.

### 3. Handle content that is not ordinary interface text
- Keep usernames, private messages, posts, comments, uploaded media text, and other user-authored content unchanged. “Entire app translates” means app-owned UI, not silently rewriting users' content.
- Translate notification sentence templates while retaining actor names and user-authored comment excerpts. Respect the existing restriction against changing bell popup design, badge, unread count, or behavior; any bell text changes require separately explicit authorization.
- Provide approved translated legal content selected by the current language. `privacy.tsx` and `terms.tsx` currently receive backend legal copy; translating controls alone will not translate those documents. Review the actual content source before choosing a storage change, and obtain separate approval for any backend change.
- Audit static banners for printed English. Use localized artwork or equivalent translated text without redesigning the page; do not claim ordinary dictionary translation changes image lettering.
- Hosted emails, push payloads, and other out-of-app service content require a separate language-delivery review and approval; they are not automatically translated by the browser provider.
- Use existing direction information for text-level readability where needed, while keeping `document.documentElement.dir = "ltr"` and navigation/layout orientation unchanged.

## Expansion beyond 17 languages, with all countries preserved
1. Keep the complete 195-country catalog independent from the supported-language registry and dictionaries. A country stays in the selector even when its local language is not yet supported.
2. Maintain an explicit, reviewed mapping from each country's ISO code to its default supported UI language. Preserve current mappings initially; present proposed corrections as a separate mapping review rather than silently changing what a country selects.
3. Add new languages in complete batches: register a stable language/locale code, English name, native name, text direction, full translations, plural/date support, and validation. Keep all existing codes valid so saved language choices continue to restore normally.
4. Examples of useful additions for current approximations: Persian (`fa`) for Iran, Swedish (`sv`) for Sweden, Ukrainian (`uk`) for Ukraine, Malay (`ms`) for Malaysia, Dutch (`nl`) for the Netherlands, and Thai (`th`) for Thailand. These are proposals, not approved mapping changes. Multiple-language countries require a reviewed default, not an assumption that one language covers everyone.
5. Publish a country-to-language mapping matrix covering all 195 rows. Change a country's default only when that target language is fully translated and verified. Countries awaiting support remain selectable with their documented existing fallback; never hide or remove them.
6. A registry entry alone does not make a language selectable. Every newly released language needs an explicit selection path. With this unchanged single-choice country selector, that path is a country default mapping; verify reachability for both existing and new languages after every mapping update.
7. **Limitation:** an unchanged one-language-per-country selector cannot offer every co-official/minority language or let users independently choose country and language. Do not solve that by redesigning this popup. If independent choice is wanted later, propose a separately approved language preference outside the Home selector, using the same provider and persistence. Until then, release only languages reachable through reviewed country mappings.

## Technical implementation order — only after approval
1. Capture a baseline of all 195 country names/ISO codes and existing selection behavior; inventory required translation keys across every rendered route/component.
2. Extend central dictionaries and formatting helpers without changing persistence, startup, global direction, or Android guards.
3. Complete the existing 17 languages across shared UI, account/auth, social/media, Marriage, admin, and information/error pages; include hidden and failure states in each group.
4. Review legal/artwork needs and any separately authorized service-delivered text. Clearly identify untranslated content awaiting approved copy; do not mark full coverage complete while required content is outstanding.
5. Add further complete languages and review country mappings separately, preserving all 195 entries and existing languages.

## Acceptance and verification
- Automated checks assert exactly 195 unique countries and the unchanged baseline names/ISO codes; every mapping resolves to a supported complete dictionary; every released language is reachable by an approved selection path.
- Check required-key parity, placeholder parity, plural cases, valid language codes, and localized formatting. Audit remaining literal UI strings with explicit exceptions for user content, country names, logs, and API-only files.
- Verify every content screen and shared dialog in every supported language, including signed-in workflows, loading/empty/error states, and long text. English fallback is a safety behavior, not a passing translation test.
- Verify country selection, navigation, refresh/relaunch, existing saved-language restoration, and switching back to English. Confirm popup design, options, flags, and search remain unchanged.
- Check Android and web for Urdu/Arabic text readability, long translations, typing/composer alignment, and absence of freezes; preserve current global LTR layout. Actual physical-device checks require device access and cannot be replaced by a successful web build.

**Deliverable after separately approved implementation:** consistent app-owned UI translations for every released language, all 195 country options retained, documented default mappings, unchanged persistence and Android protections, and a coverage report identifying any approved-copy or device-testing blockers.