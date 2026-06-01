## Scope

Market section only. Replace the long-press / right-click menu on product images with exactly three actions: **Download Image**, **Report Product**, **Block User**. No other section (Home feed, Videos, Profile) is touched — the existing `MediaActions` component used elsewhere stays unchanged.

## Database changes (1 migration)

**`product_reports` table**
- `product_id` → references `market_products.id`
- `reporter_id` → user
- `reason` (`spam` | `fake_product` | `adult_content` | `copyright` | `scam_fraud` | `other`)
- `details` (optional free text)
- `created_at`
- Unique `(product_id, reporter_id)` — one report per user per product
- RLS: authenticated users INSERT/SELECT their own; service_role full access

**`user_blocks` table**
- `blocker_id`, `blocked_id`, `created_at`
- Unique `(blocker_id, blocked_id)`
- RLS: authenticated users INSERT/SELECT/DELETE their own rows (`blocker_id = auth.uid()`); service_role full access

Both tables get the standard `GRANT` block (authenticated + service_role; no anon).

## Frontend changes — `src/routes/market.tsx` only

1. **New `MarketMediaMenu` component** (inline in this file, NOT reusing `MediaActions.tsx` which Home/Videos depend on):
   - Wraps the product image in `ProductCard`.
   - Long-press (~450ms touch) and right-click open a bottom action sheet. The native browser image menu is suppressed.
   - Short tap continues to open the lightbox.
   - Three items only:
     - **Download Image** — fetches the image as a blob and triggers a download via a temporary `<a download>` link (works for Supabase Storage URLs).
     - **Report Product** — opens a modal with the 6 reasons as radio options + an optional details textarea, then inserts into `product_reports`. Toast on success / duplicate.
     - **Block User** — confirm prompt, inserts into `user_blocks`, prunes that user's products from local state, toast.
   - Cancel to dismiss.

2. **Load blocked users on mount** — fetch `user_blocks` rows for the current user, keep a `Set<blocked_id>` in state, filter `userProducts` against it. Adding a block updates the set so the feed reacts immediately.

3. **Surface `user_id`** on the mapped `Product` type (currently dropped) so block + filter logic has the owner id.

## Files touched

- `src/routes/market.tsx` — add `MarketMediaMenu` + report modal, blocked-users state + filter, expose `user_id` on Product, wire menu into `ProductCard`.
- New migration creating `product_reports` and `user_blocks` with grants and RLS.

## Out of scope

- `src/components/MediaActions.tsx` (Home/Videos) — untouched.
- Admin/moderation UI for reviewing reports.
- Unblock UI (block rows can be removed later from a settings page if requested).
