# Stabilization Pass — Shaping World Hub

A scan of the app surfaced several real bugs and rough edges. Below is what I found and what I'll fix. Scope stays inside the frontend (routes + Layout + styles); no schema or auth changes are needed.

## 1. Problems found

**Critical / broken**
- **Bottom navigation is disabled.** In `src/components/Layout.tsx` the entire mobile `<nav>` is inside a `{/* ... */}` block, so on mobile (currently 320px viewport) there is no Home/Videos/Upload/Profile tab bar at all. That's why nav feels missing on phones.
- **Videos feed is broken.** `src/routes/videos.tsx` renders each community post inside `<article className="h-screen w-full snap-start">` *outside* any snap container, then below it mounts a *second* `h-screen overflow-y-scroll snap-y` block for the mock videos. Result: posts blow out the layout, push the page meters tall, and the mock cards live in a nested scroller you can't really reach. Also videos use `autoPlay` without `muted`, which most mobile browsers silently block.
- **Page title is wrong.** `__root.tsx` head still says "Lovable App" instead of "Shaping World Hub".

**Bugs / dead UI**
- Profile **Settings** button only fires a `toast.info("coming soon")` — looks broken.
- Profile stats are hardcoded `0` with no source.
- Home "Top Businesses" *View All* and footer social icons (f / ig / x / yt) are non-interactive placeholders.
- `src/routes/index.tsx` uses inline `any` props on `FeatureCard`/`AppTile`/`Pill` — minor, but worth typing.
- Upload page Cancel returns to `/` even when the user came from `/profile` or `/videos`.

**Mobile / layout**
- Hero is fine but the "ONE WORLD, MANY POSSIBILITIES" pill overflows on 320px because it never wraps.
- Videos tab strip and category chips don't have safe horizontal padding on small screens.
- Header right-side cluster (search + bell + avatar + sign-out) is cramped on <360px.

**Out of scope of the user message but worth calling out**
- The brief mentions "business listings" and "matchmaking" sections — those routes don't exist yet (only `/`, `/videos`, `/profile`, `/upload`, `/auth`). I will *not* invent them here; I'll list them under "still needs improvement" so you can decide.
- Dark mode tokens exist in `styles.css` but there is no theme toggle wired up. Same — flagged, not built, unless you want it.

## 2. Fixes I'll ship

### Layout (`src/components/Layout.tsx`)
- Uncomment and rebuild the mobile bottom tab bar (4 items, active state, safe-area padding via `pb-[env(safe-area-inset-bottom)]`).
- Tighten header on small screens: hide the desktop "Sign out" pill on `<sm`, keep avatar + sign-in CTA only.
- Make the notifications dropdown close on outside click / route change.

### Video feed (`src/routes/videos.tsx`)
- Drop the `h-screen` per-article pattern and the nested `overflow-y-scroll snap-y` block.
- Render one unified responsive grid: community posts first, then featured mock cards, in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` of clean white cards (TikTok-style portrait thumbnails on mobile, card-style on desktop).
- Add `muted playsInline` to community `<video>` elements with click-to-unmute, and lazy-load with `preload="metadata"` for perf.
- Add an empty state and a loading skeleton while posts fetch.

### Profile (`src/routes/profile.tsx`)
- Compute real stats from `posts` (Videos = count where media_type=video; Posts/Likes = count + placeholder 0 with note).
- Replace the dead Settings button with a working dropdown: "Edit profile" (toast for now — honest), "Sign out".
- Make the "shapingworld.com" link a real `<a href>` instead of routing to `/`.
- Video thumbs in the grid: add `preload="metadata"` + poster fallback + tap-to-play overlay.

### Upload (`src/routes/upload.tsx`)
- Cancel returns to previous route (`history.back()` fallback to `/`).
- Show upload progress state and disable the file picker while uploading.
- Validate empty-file edge case.

### Home (`src/routes/index.tsx`)
- Make the "ONE WORLD, MANY POSSIBILITIES" badge wrap cleanly on 320px.
- Type the helper components (remove `any`).
- Wire the footer social spans as real `<a>` tags with `aria-label` (placeholder `#` href is fine — they were visually-only before; now at least accessible and not misleading).
- "Top Businesses" *View All* hidden until that page exists (no dead link).

### Root (`src/routes/__root.tsx`)
- Update `<title>` and og/twitter meta to "Shaping World Hub — Entertainment, Business & Relationships".

### Styling consistency
- Standardize card chrome to `bg-white rounded-2xl border border-slate-200` (already mostly there — clean up the few stragglers).
- Standardize primary CTA to `bg-indigo-600 hover:bg-indigo-700 text-white rounded-full`.

## 3. What still needs improvement (not in this pass)

These are real but outside what you described well enough to build correctly:

1. **Business listings page** (`/businesses`) — schema + UI for listings, categories, follow, ratings.
2. **Matchmaking** (`/match` or `/wed`) — needs its own data model (preferences, matches, messaging) and is a feature, not a fix.
3. **Dark mode toggle** — tokens are defined; needs a theme provider, toggle in header, and a quick audit of hardcoded `bg-white` / `text-slate-*` classes that ignore tokens.
4. **Likes / comments persistence** — currently in-memory only in the videos feed.
5. **Notifications** — the dropdown shows hardcoded items; would need a `notifications` table + realtime.
6. **SEO per-route `head()`** — each route should set its own title/description (currently only the root does).
7. **Video thumbnails / posters** — generating a poster frame server-side would noticeably speed up the feed.

If you want me to also tackle dark mode and the business/matchmaking pages, say the word and I'll plan those as separate passes.