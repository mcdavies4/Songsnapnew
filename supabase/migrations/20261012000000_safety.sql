-- SongSnap safety features required by the App Store and Google Play:
-- block users, report posts/comments, delete your own account.
-- Run AFTER 20261011000000_social.sql.

-- ============ BLOCKS ============

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

drop policy if exists "see own blocks" on public.blocks;
create policy "see own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "block as self" on public.blocks;
create policy "block as self" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "unblock as self" on public.blocks;
create policy "unblock as self" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- Blocking someone also unfollows in both directions
create or replace function public.on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from follows where (follower_id = new.blocker_id and following_id = new.blocked_id)
                         or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end; $$;
drop trigger if exists on_block_trg on public.blocks;
create trigger on_block_trg after insert on public.blocks for each row execute function public.on_block();

-- ============ REPORTS ============

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  reason      text not null check (reason in ('spam','harassment','hate','sexual','violence','other')),
  details     text check (details is null or char_length(details) <= 500),
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at  timestamptz not null default now(),
  constraint report_target check (num_nonnulls(post_id, comment_id) = 1)
);
create index if not exists reports_open_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

-- Users can file reports but not read them; review them in the Supabase dashboard (Table Editor -> reports).
drop policy if exists "file report" on public.reports;
create policy "file report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- ============ FEED: hide blocked people ============

create or replace function public.get_feed(
  p_scope text default 'all',
  p_user_id uuid default null,
  p_limit int default 20,
  p_before timestamptz default null,
  p_mood text default null,
  p_source text default null,
  p_track_id text default null
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  song_data jsonb,
  mood text,
  likes_count int,
  reaction_counts jsonb,
  comments_count int,
  created_at timestamptz,
  my_reaction text,
  author jsonb,
  top_comment jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id, p.user_id, p.content, p.song_data, p.mood,
    p.likes_count, p.reaction_counts, p.comments_count, p.created_at,
    (select l.kind from likes l where l.post_id = p.id and l.user_id = auth.uid()) as my_reaction,
    jsonb_build_object('id', pr.id, 'name', pr.name, 'username', pr.username, 'profile_pic', pr.profile_pic) as author,
    (select jsonb_build_object(
              'id', c.id, 'content', c.content, 'created_at', c.created_at,
              'author', jsonb_build_object('id', cp.id, 'name', cp.name, 'username', cp.username, 'profile_pic', cp.profile_pic))
       from comments c join profiles cp on cp.id = c.user_id
      where c.post_id = p.id and c.parent_id is null
        and not exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = c.user_id)
      order by c.created_at desc limit 1) as top_comment
  from posts p
  join profiles pr on pr.id = p.user_id
  where (p_before is null or p.created_at < p_before)
    and (p_mood is null or p.mood = p_mood)
    and not exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
    and case p_scope
          when 'following' then p.user_id in (select following_id from follows where follower_id = auth.uid())
          when 'user' then p.user_id = p_user_id
          when 'track' then p.song_data->>'source' = p_source and p.song_data->>'track_id' = p_track_id
          else true
        end
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ============ DELETE MY ACCOUNT ============
-- Deleting the auth user cascades to profile, posts, comments, likes, follows, blocks and reports.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
