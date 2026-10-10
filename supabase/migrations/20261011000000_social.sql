-- SongSnap social upgrade: moods, music reactions, threaded replies,
-- comment previews in the feed, trending songs, song pages, song search.
-- Run AFTER 20261010000000_init.sql. Safe to run on a database that already has posts.

-- ============ MOODS ============

alter table public.posts
  add column if not exists mood text
  check (mood is null or mood in ('late_night','on_repeat','gym','commute','heartbreak','party','focus','throwback','sunday','discovery'));

create index if not exists posts_mood_idx on public.posts (mood, created_at desc);
create index if not exists posts_track_idx on public.posts ((song_data->>'source'), (song_data->>'track_id'), created_at desc);

-- ============ REACTIONS (one per person per post, switchable) ============

alter table public.likes
  add column if not exists kind text not null default 'love'
  check (kind in ('love','fire','repeat','feels','vibe'));

alter table public.posts
  add column if not exists reaction_counts jsonb not null default '{}'::jsonb;

-- Backfill counts for existing likes
update public.posts p
   set reaction_counts = coalesce((
     select jsonb_object_agg(kind, n) from (
       select kind, count(*)::int n from public.likes l where l.post_id = p.id group by kind
     ) s), '{}'::jsonb);

create or replace function public.bump_like_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts
       set likes_count = likes_count + 1,
           reaction_counts = jsonb_set(reaction_counts, array[new.kind],
             to_jsonb(coalesce((reaction_counts->>new.kind)::int, 0) + 1))
     where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts
       set likes_count = greatest(likes_count - 1, 0),
           reaction_counts = jsonb_set(reaction_counts, array[old.kind],
             to_jsonb(greatest(coalesce((reaction_counts->>old.kind)::int, 0) - 1, 0)))
     where id = old.post_id;
  elsif tg_op = 'UPDATE' and new.kind <> old.kind then
    update posts
       set reaction_counts = jsonb_set(
             jsonb_set(reaction_counts, array[old.kind],
               to_jsonb(greatest(coalesce((reaction_counts->>old.kind)::int, 0) - 1, 0))),
             array[new.kind],
             to_jsonb(coalesce((reaction_counts->>new.kind)::int, 0) + 1))
     where id = new.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists likes_count_trg on public.likes;
create trigger likes_count_trg after insert or delete or update of kind on public.likes
  for each row execute function public.bump_like_counts();

drop policy if exists "change own reaction" on public.likes;
create policy "change own reaction" on public.likes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.likes from authenticated, anon;
grant update (kind) on public.likes to authenticated;

-- ============ THREADED REPLIES ============

alter table public.comments
  add column if not exists parent_id uuid references public.comments (id) on delete cascade;
create index if not exists comments_parent_idx on public.comments (parent_id);

-- Replies must be to a top-level comment on the same post (one level deep)
create or replace function public.check_comment_parent()
returns trigger language plpgsql set search_path = public as $$
declare p record;
begin
  if new.parent_id is null then return new; end if;
  select post_id, parent_id into p from comments where id = new.parent_id;
  if not found or p.post_id <> new.post_id then
    raise exception 'Reply must belong to the same post';
  end if;
  if p.parent_id is not null then
    new.parent_id := p.parent_id; -- flatten: reply-to-reply joins the same thread
  end if;
  return new;
end; $$;

drop trigger if exists comments_parent_trg on public.comments;
create trigger comments_parent_trg before insert on public.comments
  for each row execute function public.check_comment_parent();

-- ============ FEED (replaces v1) ============

drop function if exists public.get_feed(text, uuid, int, timestamptz);

create or replace function public.get_feed(
  p_scope text default 'all',          -- 'all' | 'following' | 'user' | 'track'
  p_user_id uuid default null,          -- for 'user'
  p_limit int default 20,
  p_before timestamptz default null,    -- cursor
  p_mood text default null,             -- optional mood filter
  p_source text default null,           -- for 'track'
  p_track_id text default null          -- for 'track'
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
      order by c.created_at desc limit 1) as top_comment
  from posts p
  join profiles pr on pr.id = p.user_id
  where (p_before is null or p.created_at < p_before)
    and (p_mood is null or p.mood = p_mood)
    and case p_scope
          when 'following' then p.user_id in (select following_id from follows where follower_id = auth.uid())
          when 'user' then p.user_id = p_user_id
          when 'track' then p.song_data->>'source' = p_source and p.song_data->>'track_id' = p_track_id
          else true
        end
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.get_feed(text, uuid, int, timestamptz, text, text, text) to authenticated;

-- ============ SONGS: trending + search + song page header ============

create or replace function public.trending_tracks(p_days int default 7, p_limit int default 12)
returns table (source text, track_id text, song_data jsonb, post_count int, people int, last_posted timestamptz)
language sql stable security invoker set search_path = public
as $$
  select s.source, s.track_id,
         (select p2.song_data from posts p2
           where p2.song_data->>'source' = s.source and p2.song_data->>'track_id' = s.track_id
           order by p2.created_at desc limit 1) as song_data,
         s.post_count, s.people, s.last_posted
  from (
    select p.song_data->>'source' as source, p.song_data->>'track_id' as track_id,
           count(*)::int as post_count, count(distinct p.user_id)::int as people, max(p.created_at) as last_posted
    from posts p
    where p.created_at > now() - make_interval(days => greatest(p_days, 1))
    group by 1, 2
  ) s
  order by s.people desc, s.post_count desc, s.last_posted desc
  limit least(greatest(p_limit, 1), 30);
$$;
grant execute on function public.trending_tracks(int, int) to authenticated;

create or replace function public.search_tracks(p_q text, p_limit int default 20)
returns table (source text, track_id text, song_data jsonb, post_count int, people int, last_posted timestamptz)
language sql stable security invoker set search_path = public
as $$
  select s.source, s.track_id,
         (select p2.song_data from posts p2
           where p2.song_data->>'source' = s.source and p2.song_data->>'track_id' = s.track_id
           order by p2.created_at desc limit 1),
         s.post_count, s.people, s.last_posted
  from (
    select p.song_data->>'source' as source, p.song_data->>'track_id' as track_id,
           count(*)::int as post_count, count(distinct p.user_id)::int as people, max(p.created_at) as last_posted
    from posts p
    where char_length(trim(p_q)) >= 2
      and (p.song_data->>'title' ilike '%' || trim(p_q) || '%' or p.song_data->>'artist' ilike '%' || trim(p_q) || '%')
    group by 1, 2
  ) s
  order by s.people desc, s.last_posted desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.search_tracks(text, int) to authenticated;

create or replace function public.track_summary(p_source text, p_track_id text)
returns table (song_data jsonb, post_count int, people int, top_mood text)
language sql stable security invoker set search_path = public
as $$
  select
    (select p2.song_data from posts p2
      where p2.song_data->>'source' = p_source and p2.song_data->>'track_id' = p_track_id
      order by p2.created_at desc limit 1),
    count(*)::int,
    count(distinct p.user_id)::int,
    (select p3.mood from posts p3
      where p3.song_data->>'source' = p_source and p3.song_data->>'track_id' = p_track_id and p3.mood is not null
      group by p3.mood order by count(*) desc limit 1)
  from posts p
  where p.song_data->>'source' = p_source and p.song_data->>'track_id' = p_track_id;
$$;
grant execute on function public.track_summary(text, text) to authenticated;

-- Make the API pick up the new functions immediately
notify pgrst, 'reload schema';
