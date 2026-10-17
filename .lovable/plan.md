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

## Country-default language expansion (revised investigation)
**There is no universally correct default for multilingual countries.** The matrix below proposes one explicit VIP Life UI default per country, favoring a national written language or shared public-service lingua franca. These are reviewable product choices, not a declaration that other languages are invalid. All 195 options, flags, search, ordering, popup structure and persistence remain unchanged.

- Keep the country catalog and translation registry separate. Every country must point to a complete bundled dictionary; do not silently substitute an unrelated supported language.
- Extend `LangCode`, `LANGUAGES` and central dictionaries while preserving every existing code, including `zh` for Simplified Chinese. `fa-AF` requires Dari-specific review; Montenegrin and Serbian require separate identity/script decisions. Do not collapse distinct languages merely to reduce work.
- Country locale also selects formatting conventions (for example `pt-BR` versus `pt-PT`), without changing the saved language contract. Keep current English initialization, saved-choice restoration and LTR document behavior.
- The recommended matrix uses **92 translation targets**, including language/script/regional variants: all existing 17 plus **75 additional targets**. This number depends on the reviewed multilingual defaults; it is not “195 languages.” All targets need a complete UI translation, not just their current 25 keys.
- Rare-language translation quality and browser `Intl` availability must be checked (for example Nauruan, Palauan, Gilbertese, Tuvaluan, Montenegrin). Do not promise AI output or browser locale support is complete; use qualified reviewers and bundled formatting fallbacks when required.
- Maintain the explicit country mapping in one central source (proposed `src/lib/country-languages.ts`), initially preserving the exact catalog. Selecting a row keeps calling the existing `setLang` with the reviewed target; no new selector, package or persistence key is necessary.
- Where multiple languages are listed, the unchanged single-country selection cannot honor every user's mother tongue. This limitation remains explicit; a separate language preference would need separate approval, not a popup redesign.

### Sources and confidence
Unicode CLDR [territory-language data](https://unicode.org/cldr/charts/latest/supplemental/language_territory_information.html), [likely-subtag methodology](https://cldr.unicode.org/development/updating-codes/likelysubtags-and-default-content), and [BCP 47 equivalences](https://cldr.unicode.org/index/cldr-spec/language-tag-equivalences) support locale/country research, not a mandatory default. CLDR is heuristic and some official-status labels are outdated; legal status must not be copied blindly. Recent Sahel changes distinguish national/official from working languages: [AFP/franceinfo, Niger charter and Mali/Burkina changes](https://www.franceinfo.fr/culture/patrimoine/le-francais-n-est-plus-la-langue-officielle-du-niger_7179918.html). Country-specific multilingual caveats below supersede simplistic CLDR inference. This is a proposed mapping requiring product/native-speaker review, not a legally exhaustive registry of all minority languages.

### Required complete translations
Each target needs the same full set of common/navigation, selector instructions, auth/recovery, account/profile/About, feed/posts/comments/sharing/privacy, messages/attachments/recording, notifications, search/upload/video/editor, Marriage/forms/options, admin/moderation, information/legal/error UI, accessibility, loading/empty/error/success states, plural templates, and locale formatting. User content stays unchanged. Country names, flags and search values in this Home popup stay as they are.

**Additional translation targets (beyond the retained 17):**
`am` Amharic; `az` Azerbaijani; `be` Belarusian; `bg` Bulgarian; `bi` Bislama; `bm` Bambara; `bs` Bosnian; `ca` Catalan; `cnr-Latn` Montenegrin (Latin); `crs` Seychellois Creole; `cs` Czech; `da` Danish; `dv` Dhivehi; `dz` Dzongkha; `el` Greek; `et` Estonian; `fa` Persian; `fa-AF` Dari; `fi` Finnish; `fil` Filipino; `gil` Gilbertese; `ha` Hausa; `he` Hebrew; `hr` Croatian; `ht` Haitian Creole; `hu` Hungarian; `hy` Armenian; `is` Icelandic; `ka` Georgian; `kk` Kazakh; `km` Khmer; `ky` Kyrgyz; `lb` Luxembourgish; `lo` Lao; `lt` Lithuanian; `lv` Latvian; `mfe` Mauritian Creole; `mg` Malagasy; `mh` Marshallese; `mk` Macedonian; `mn` Mongolian (Cyrillic); `mos` Mooré; `ms` Malay; `mt` Maltese; `my` Burmese; `na` Nauruan; `nb` Norwegian Bokmål; `ne` Nepali; `nl` Dutch; `pau` Palauan; `pl` Polish; `rn` Kirundi; `ro` Romanian; `rw` Kinyarwanda; `sg` Sango; `si` Sinhala; `sk` Slovak; `sl` Slovenian; `sm` Samoan; `so` Somali; `sq` Albanian; `sr-Cyrl` Serbian (Cyrillic); `st` Sesotho; `sv` Swedish; `tet` Tetum; `tg` Tajik; `th` Thai; `ti` Tigrinya; `tk` Turkmen; `to` Tongan; `tpi` Tok Pisin; `tvl` Tuvaluan; `uk` Ukrainian; `uz` Uzbek (Latin); `vi` Vietnamese.

### All 195 country recommendations

A dash means no special multilingual selection caveat is recorded here, not that the country is monolingual. Other-language notes are illustrative, not exhaustive. Codes specify dictionary targets; formatting locale is a separate country-aware concern.

| # | Existing country (ISO) | Proposed UI default | Multilingual/default-choice note |
|---|---|---|---|
| 1 | Afghanistan (AF) | Dari `fa-AF` | Pashto also official; Dari is a proposed lingua-franca default. |
| 2 | Albania (AL) | Albanian `sq` | — |
| 3 | Algeria (DZ) | Arabic `ar` | Tamazight also official; French widely used (not official). |
| 4 | Andorra (AD) | Catalan `ca` | — |
| 5 | Angola (AO) | Portuguese `pt` | — |
| 6 | Antigua and Barbuda (AG) | English `en` | — |
| 7 | Argentina (AR) | Spanish `es` | — |
| 8 | Armenia (AM) | Armenian `hy` | — |
| 9 | Australia (AU) | English `en` | — |
| 10 | Austria (AT) | German `de` | — |
| 11 | Azerbaijan (AZ) | Azerbaijani `az` | — |
| 12 | Bahamas (BS) | English `en` | — |
| 13 | Bahrain (BH) | Arabic `ar` | — |
| 14 | Bangladesh (BD) | Bengali `bn` | — |
| 15 | Barbados (BB) | English `en` | — |
| 16 | Belarus (BY) | Belarusian `be` | Russian also official and more widely used; Belarusian is a national-language product choice. |
| 17 | Belgium (BE) | Dutch `nl` | French and German also official; regional preference matters. |
| 18 | Belize (BZ) | English `en` | — |
| 19 | Benin (BJ) | French `fr` | — |
| 20 | Bhutan (BT) | Dzongkha `dz` | — |
| 21 | Bolivia (BO) | Spanish `es` | Quechua, Aymara and many other Indigenous official languages. |
| 22 | Bosnia and Herzegovina (BA) | Bosnian `bs` | Croatian and Serbian also official; no neutral universal default. |
| 23 | Botswana (BW) | English `en` | Setswana national; English chosen for shared public UI. |
| 24 | Brazil (BR) | Portuguese `pt` | — |
| 25 | Brunei (BN) | Malay `ms` | — |
| 26 | Bulgaria (BG) | Bulgarian `bg` | — |
| 27 | Burkina Faso (BF) | Mooré `mos` | National languages official; French working language. Mooré is a local-language proposal, not the only official language. |
| 28 | Burundi (BI) | Kirundi `rn` | French and English also official; Swahili widely used. |
| 29 | Cabo Verde (CV) | Portuguese `pt` | — |
| 30 | Cambodia (KH) | Khmer `km` | — |
| 31 | Cameroon (CM) | French `fr` | English also official; Anglophone regions need alternatives. |
| 32 | Canada (CA) | English `en` | French also official; Quebec commonly prefers French. |
| 33 | Central African Republic (CF) | Sango `sg` | French also official. |
| 34 | Chad (TD) | French `fr` | Arabic also official; French chosen as public-service default. |
| 35 | Chile (CL) | Spanish `es` | — |
| 36 | China (CN) | Chinese (Simplified) `zh` | Simplified written Chinese; retain existing zh code. Regional spoken languages differ. |
| 37 | Colombia (CO) | Spanish `es` | — |
| 38 | Comoros (KM) | French `fr` | Comorian and Arabic also official; Comorian needs dialect/script review, not a generic swb substitute. |
| 39 | Congo (CG) | French `fr` | — |
| 40 | Costa Rica (CR) | Spanish `es` | — |
| 41 | Côte d’Ivoire (CI) | French `fr` | — |
| 42 | Croatia (HR) | Croatian `hr` | — |
| 43 | Cuba (CU) | Spanish `es` | — |
| 44 | Cyprus (CY) | Greek `el` | Turkish also official; community preference matters. |
| 45 | Czechia (CZ) | Czech `cs` | — |
| 46 | Democratic Republic of the Congo (CD) | French `fr` | Lingala, Swahili, Kikongo and Tshiluba are important national languages. |
| 47 | Denmark (DK) | Danish `da` | — |
| 48 | Djibouti (DJ) | French `fr` | Arabic also official; Somali and Afar widely spoken. |
| 49 | Dominica (DM) | English `en` | — |
| 50 | Dominican Republic (DO) | Spanish `es` | — |
| 51 | Ecuador (EC) | Spanish `es` | Kichwa and Shuar have recognized official intercultural roles. |
| 52 | Egypt (EG) | Arabic `ar` | — |
| 53 | El Salvador (SV) | Spanish `es` | — |
| 54 | Equatorial Guinea (GQ) | Spanish `es` | French and Portuguese also official. |
| 55 | Eritrea (ER) | Tigrinya `ti` | Arabic, English and other languages used; no sole official-language claim. |
| 56 | Estonia (EE) | Estonian `et` | — |
| 57 | Eswatini (SZ) | English `en` | English also official. |
| 58 | Ethiopia (ET) | Amharic `am` | Oromo, Somali, Tigrinya, Afar and other languages have federal/regional roles. |
| 59 | Fiji (FJ) | English `en` | Fijian and Fiji Hindi also recognized; English shared default. |
| 60 | Finland (FI) | Finnish `fi` | Swedish also official; Sámi regional rights. |
| 61 | France (FR) | French `fr` | — |
| 62 | Gabon (GA) | French `fr` | — |
| 63 | Gambia (GM) | English `en` | — |
| 64 | Georgia (GE) | Georgian `ka` | — |
| 65 | Germany (DE) | German `de` | — |
| 66 | Ghana (GH) | English `en` | Akan and many others spoken; English shared official UI. |
| 67 | Greece (GR) | Greek `el` | — |
| 68 | Grenada (GD) | English `en` | — |
| 69 | Guatemala (GT) | Spanish `es` | — |
| 70 | Guinea (GN) | French `fr` | — |
| 71 | Guinea-Bissau (GW) | Portuguese `pt` | — |
| 72 | Guyana (GY) | English `en` | — |
| 73 | Haiti (HT) | Haitian Creole `ht` | — |
| 74 | Honduras (HN) | Spanish `es` | — |
| 75 | Hungary (HU) | Hungarian `hu` | — |
| 76 | Iceland (IS) | Icelandic `is` | — |
| 77 | India (IN) | Hindi `hi` | Hindi/English Union roles; many state official languages. Hindi is not a sole national language. |
| 78 | Indonesia (ID) | Indonesian `id` | — |
| 79 | Iran (IR) | Persian `fa` | — |
| 80 | Iraq (IQ) | Arabic `ar` | Kurdish also official nationally. |
| 81 | Ireland (IE) | English `en` | Irish first official, English second; English practical shared default. |
| 82 | Israel (IL) | Hebrew `he` | Arabic has special status; Hebrew default. |
| 83 | Italy (IT) | Italian `it` | — |
| 84 | Jamaica (JM) | English `en` | — |
| 85 | Japan (JP) | Japanese `ja` | — |
| 86 | Jordan (JO) | Arabic `ar` | — |
| 87 | Kazakhstan (KZ) | Kazakh `kk` | Russian has official-use role; Kazakh state language. |
| 88 | Kenya (KE) | Swahili `sw` | English also official. |
| 89 | Kiribati (KI) | Gilbertese `gil` | English also used officially; Gilbertese locally oriented default. |
| 90 | Kuwait (KW) | Arabic `ar` | — |
| 91 | Kyrgyzstan (KG) | Kyrgyz `ky` | Russian also official. |
| 92 | Laos (LA) | Lao `lo` | — |
| 93 | Latvia (LV) | Latvian `lv` | — |
| 94 | Lebanon (LB) | Arabic `ar` | — |
| 95 | Lesotho (LS) | Sesotho `st` | English also official. |
| 96 | Liberia (LR) | English `en` | — |
| 97 | Libya (LY) | Arabic `ar` | — |
| 98 | Liechtenstein (LI) | German `de` | — |
| 99 | Lithuania (LT) | Lithuanian `lt` | — |
| 100 | Luxembourg (LU) | Luxembourgish `lb` | French and German also administrative/judicial languages; no universal default. |
| 101 | Madagascar (MG) | Malagasy `mg` | French also official. |
| 102 | Malawi (MW) | English `en` | Chichewa widely used/national; English shared public UI. |
| 103 | Malaysia (MY) | Malay `ms` | English, Chinese and Tamil widely used; Malay not Indonesian. |
| 104 | Maldives (MV) | Dhivehi `dv` | — |
| 105 | Mali (ML) | Bambara `bm` | Multiple national languages official; French working language; Bambara broad-reach proposal. |
| 106 | Malta (MT) | Maltese `mt` | English also official. |
| 107 | Marshall Islands (MH) | Marshallese `mh` | English also official. |
| 108 | Mauritania (MR) | Arabic `ar` | — |
| 109 | Mauritius (MU) | Mauritian Creole `mfe` | French widely used; English parliamentary role; no sole official-language claim. |
| 110 | Mexico (MX) | Spanish `es` | — |
| 111 | Micronesia (FM) | English `en` | — |
| 112 | Moldova (MD) | Romanian `ro` | — |
| 113 | Monaco (MC) | French `fr` | — |
| 114 | Mongolia (MN) | Mongolian (Cyrillic) `mn` | — |
| 115 | Montenegro (ME) | Montenegrin (Latin) `cnr-Latn` | Montenegrin official; Serbian, Bosnian, Albanian and Croatian in official use. Do not silently alias cnr to sr. |
| 116 | Morocco (MA) | Arabic `ar` | Amazigh also official; French widely used; Standard Arabic written UI. |
| 117 | Mozambique (MZ) | Portuguese `pt` | — |
| 118 | Myanmar (MM) | Burmese `my` | — |
| 119 | Namibia (NA) | English `en` | English official; Oshiwambo, Afrikaans and others widely spoken. |
| 120 | Nauru (NR) | Nauruan `na` | English also used in public administration. |
| 121 | Nepal (NP) | Nepali `ne` | — |
| 122 | Netherlands (NL) | Dutch `nl` | — |
| 123 | New Zealand (NZ) | English `en` | Māori and NZ Sign Language official; English practical default. |
| 124 | Nicaragua (NI) | Spanish `es` | — |
| 125 | Niger (NE) | Hausa `ha` | Hausa national under 2025 charter; English/French working languages. |
| 126 | Nigeria (NG) | English `en` | English shared federal UI; Hausa, Yoruba, Igbo and many others. |
| 127 | North Korea (KP) | Korean `ko` | — |
| 128 | North Macedonia (MK) | Macedonian `mk` | Albanian also has official-use status. |
| 129 | Norway (NO) | Norwegian Bokmål `nb` | Nynorsk also written standard; Sámi regional rights. |
| 130 | Oman (OM) | Arabic `ar` | — |
| 131 | Pakistan (PK) | Urdu `ur` | English official-use role; Punjabi, Pashto, Sindhi etc. widely spoken. |
| 132 | Palau (PW) | Palauan `pau` | English also official; state-specific languages vary. |
| 133 | Palestine (PS) | Arabic `ar` | — |
| 134 | Panama (PA) | Spanish `es` | — |
| 135 | Papua New Guinea (PG) | Tok Pisin `tpi` | English and Hiri Motu also official; sign language recognized. |
| 136 | Paraguay (PY) | Spanish `es` | Guaraní also official and widely spoken; Spanish public-UI proposal. |
| 137 | Peru (PE) | Spanish `es` | Quechua, Aymara and other Indigenous languages official where predominant. |
| 138 | Philippines (PH) | Filipino `fil` | English also official; many regional languages. |
| 139 | Poland (PL) | Polish `pl` | — |
| 140 | Portugal (PT) | Portuguese `pt` | — |
| 141 | Qatar (QA) | Arabic `ar` | — |
| 142 | Romania (RO) | Romanian `ro` | — |
| 143 | Russia (RU) | Russian `ru` | — |
| 144 | Rwanda (RW) | Kinyarwanda `rw` | English, French and Swahili also official. |
| 145 | Saint Kitts and Nevis (KN) | English `en` | — |
| 146 | Saint Lucia (LC) | English `en` | — |
| 147 | Saint Vincent and the Grenadines (VC) | English `en` | — |
| 148 | Samoa (WS) | Samoan `sm` | English also official. |
| 149 | San Marino (SM) | Italian `it` | — |
| 150 | Sao Tome and Principe (ST) | Portuguese `pt` | — |
| 151 | Saudi Arabia (SA) | Arabic `ar` | — |
| 152 | Senegal (SN) | French `fr` | French official; Wolof and other national languages widely used. |
| 153 | Serbia (RS) | Serbian (Cyrillic) `sr-Cyrl` | Latin script widely used; Cyrillic default must be reviewed. |
| 154 | Seychelles (SC) | Seychellois Creole `crs` | English and French also official. |
| 155 | Sierra Leone (SL) | English `en` | — |
| 156 | Singapore (SG) | English `en` | Malay, Mandarin and Tamil also official; English shared UI. |
| 157 | Slovakia (SK) | Slovak `sk` | — |
| 158 | Slovenia (SI) | Slovenian `sl` | — |
| 159 | Solomon Islands (SB) | English `en` | — |
| 160 | Somalia (SO) | Somali `so` | Arabic also official. |
| 161 | South Africa (ZA) | English `en` | 12 official languages including sign language; English shared UI, not majority mother tongue. |
| 162 | South Korea (KR) | Korean `ko` | — |
| 163 | South Sudan (SS) | English `en` | English official; Juba Arabic and many local languages spoken. |
| 164 | Spain (ES) | Spanish `es` | Catalan/Valencian, Galician and Basque co-official regionally. |
| 165 | Sri Lanka (LK) | Sinhala `si` | Tamil also official; English link language. Hindi is not a default. |
| 166 | Sudan (SD) | Arabic `ar` | Arabic/English public-language roles; constitutional status needs current legal review. |
| 167 | Suriname (SR) | Dutch `nl` | Sranan Tongo and Sarnami widely used. |
| 168 | Sweden (SE) | Swedish `sv` | — |
| 169 | Switzerland (CH) | German `de` | French, Italian and Romansh national languages; official roles differ, especially Romansh. |
| 170 | Syria (SY) | Arabic `ar` | — |
| 171 | Tajikistan (TJ) | Tajik `tg` | Russian interethnic-use role. |
| 172 | Tanzania (TZ) | Swahili `sw` | English also important public/administrative role. |
| 173 | Thailand (TH) | Thai `th` | — |
| 174 | Timor-Leste (TL) | Tetum `tet` | Portuguese also official; Indonesian/English working languages. Tetum preferred proposal. |
| 175 | Togo (TG) | French `fr` | — |
| 176 | Tonga (TO) | Tongan `to` | English also official. |
| 177 | Trinidad and Tobago (TT) | English `en` | — |
| 178 | Tunisia (TN) | Arabic `ar` | — |
| 179 | Türkiye (TR) | Turkish `tr` | — |
| 180 | Turkmenistan (TM) | Turkmen `tk` | — |
| 181 | Tuvalu (TV) | Tuvaluan `tvl` | English also official. |
| 182 | Uganda (UG) | English `en` | Swahili also official; English shared public UI. |
| 183 | Ukraine (UA) | Ukrainian `uk` | Ukrainian official; do not use Russian as country-default substitute. |
| 184 | United Arab Emirates (AE) | Arabic `ar` | — |
| 185 | United Kingdom (GB) | English `en` | Welsh, Gaelic and Irish recognized/official by jurisdiction. |
| 186 | United States (US) | English `en` | English federal official language since 2025 executive order; Spanish widely used. |
| 187 | Uruguay (UY) | Spanish `es` | — |
| 188 | Uzbekistan (UZ) | Uzbek (Latin) `uz` | — |
| 189 | Vanuatu (VU) | Bislama `bi` | English/French also official; Bislama national lingua franca. |
| 190 | Vatican City (VA) | Italian `it` | Latin ecclesiastical/Holy See roles; Italian practical public UI. |
| 191 | Venezuela (VE) | Spanish `es` | — |
| 192 | Vietnam (VN) | Vietnamese `vi` | — |
| 193 | Yemen (YE) | Arabic `ar` | — |
| 194 | Zambia (ZM) | English `en` | — |
| 195 | Zimbabwe (ZW) | English `en` | 16 official languages; Shona/Ndebele widely spoken; English shared UI. |

### Exact additional files to audit
The route/component groups above remain required. Also include `src/components/ui/pagination.tsx`, `calendar.tsx`, `dialog.tsx`, `carousel.tsx`; `MediaActions.tsx`, `FullscreenVideoPlayer.tsx`, `FullscreenVideoEditor.tsx`, `TextPostCard.tsx`, `AppMessageNotifications.tsx`, `OnlineUsers.tsx`, `PostPrivacySettings.tsx`, `VideoThumbnailPicker.tsx`; `src/lib/picker-options.ts`, `error-page.ts`, `native-share.ts`, `resumable-upload.ts`, `moderation-bridge.ts`; and surfaced text in `src/hooks/use-auth.tsx`. Translate display labels only, preserving stored business values.

Proposed new modules: `src/lib/country-languages.ts` (complete mapping), `src/lib/locales/<code>.ts` (full dictionary per target), and `src/lib/i18n-format.ts` (locale/plural/relative-time helpers). These do not exist yet and are proposals only. Keep `src/lib/auto-translate.tsx` untouched/inactive; `src/lib/translate.functions.ts` is not needed for bundled UI translation. No native Android files, generated clients, schemas, permissions or notification-delivery behavior need modification for this plan. Legal body localization still requires approved copy/source decisions before claiming complete coverage.

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