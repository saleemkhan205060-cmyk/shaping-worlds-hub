create or replace function private.can_view_post(_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.posts p
    where p.id = _post_id
      and ((p.is_private = false and p.is_hidden is not true)
           or p.user_id = auth.uid()
           or private.is_moderator_or_admin())
  )
$$;

revoke all on function private.can_view_post(uuid) from public;
grant execute on function private.can_view_post(uuid) to authenticated;

drop policy if exists "Likes viewable by signed-in users" on public.post_likes;
create policy "Likes viewable by signed-in users"
on public.post_likes for select to authenticated
using (private.can_view_post(post_id));

drop policy if exists "Shares are viewable by all authenticated users" on public.post_shares;
create policy "Shares are viewable by all authenticated users"
on public.post_shares for select to authenticated
using (private.can_view_post(post_id));