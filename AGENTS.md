# Native Android layout

- Keep keyboard/system-bar sizing owned by `KeyboardInsets`: Android 11+ uses explicit native insets, older Android uses decor `adjustResize`, and the Capacitor parent listener is replaced rather than stacked; this prevents duplicate keyboard space without changing shared web messaging code.

# Global localization

- Keep the approved country catalog and target registry in `src/lib/country-languages.ts`, separate from the live selector until the all-target release gate passes; this prevents incomplete country defaults from reaching users.
- Stage bundled dictionaries in `src/lib/locales/` with explicit review status and use `scripts/audit-localization.mjs` to inventory source text and check readiness; missing keys, unreviewed content, and English fallback never constitute completed translation.
- Keep interpolation, plural selection, and formatter capability checks in browser-safe pure localization helpers; no DOM scanning or language-switch network requests are permitted because native/mobile safety behavior must remain unchanged.
- Validate release readiness against staged dictionary contents as well as review flags; absent dictionaries and unreviewed English-identical strings must remain blockers, and the generated review pack must trace keys to source locations.
- Record dynamic translation-key patterns separately in the source inventory and expand them in the review pack; preset IDs must remain unchanged and every permitted key domain still requires explicit verification.