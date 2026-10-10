-- SongSnap schema (replaces the FastAPI + MongoDB backend)
-- Run in Supabase: SQL Editor -> paste -> Run, or `supabase db push`.

create extension if not exists pgcrypto;

-- ============ TABLES ============

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text,
  name            text not null default 'Guest',
  username        text not null unique,
  profile_pic     text,
  bio             text not null default '',
  is_guest        boolean not null default false,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  posts_count     integer not null default 0,
  created_at      timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint bio_length check (char_length(bio) <= 160),
  constraint name_length check (char_length(name) between 1 and 50)
);

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  content        text not null check (char_length(content) between 1 and 500),
  song_data      jsonb not null,
  likes_count    integer not null default 0,
  comments_count integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint song_data_shape check (
    song_data ? 'title' and song_data ? 'artist' and song_data ? 'track_id'
    and song_data->>'source' in ('spotify', 'youtube')
  )
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_id_idx on public.posts (user_id, created_at desc);

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create table public.likes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index likes_post_idx on public.likes (post_id);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at desc);

-- ============ NEW USER -> PROFILE ============

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  guest boolean := coalesce(new.is_anonymous, false);
begin
  if guest then
    base_username := 'guest_' || substr(replace(new.id::text, '-', ''), 1, 8);
  else
    base_username := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    if char_length(base_username) < 3 then
      base_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
    end if;
    base_username := left(base_username, 23);
  end if;

  final_username := base_username;
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := left(base_username, 23) || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, email, name, username, profile_pic, is_guest)
  values (
    new.id,
    new.email,
    case when guest then 'Guest'
         else left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', final_username), 50) end,
    final_username,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    guest
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guest upgraded to Google account -> refresh profile details
create or replace function public.handle_user_upgraded()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(old.is_anonymous, false) and not coalesce(new.is_anonymous, false) then
    update public.profiles
       set email = new.email,
           is_guest = false,
           name = case when name = 'Guest'
                       then left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', name), 50)
                       else name end,
           profile_pic = coalesce(profile_pic, new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_upgraded
  after update on auth.users
  for each row execute function public.handle_user_upgraded();

-- ============ COUNTERS ============

create or replace function public.bump_post_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set posts_count = posts_count + 1 where id = new.user_id;
  else
    update profiles set posts_count = greatest(posts_count - 1, 0) where id = old.user_id;
  end if;
  return null;
end; $$;
create trigger posts_count_trg after insert or delete on public.posts
  for each row execute function public.bump_post_counts();

create or replace function public.bump_follow_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set followers_count = followers_count + 1 where id = new.following_id;
  else
    update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  end if;
  return null;
end; $$;
create trigger follows_count_trg after insert or delete on public.follows
  for each row execute function public.bump_follow_counts();

create or replace function public.bump_like_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
  else
    update posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
create trigger likes_count_trg after insert or delete on public.likes
  for each row execute function public.bump_like_counts();

create or replace function public.bump_comment_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
  else
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
create trigger comments_count_trg after insert or delete on public.comments
  for each row execute function public.bump_comment_counts();

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.follows  enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;

-- Signed-in users (Google or guest) can read everything
create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "read posts"    on public.posts    for select to authenticated using (true);
create policy "read follows"  on public.follows  for select to authenticated using (true);
create policy "read likes"    on public.likes    for select to authenticated using (true);
create policy "read comments" on public.comments for select to authenticated using (true);

-- Writes: only as yourself
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "create own post" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "delete own post" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "follow as self"   on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "unfollow as self" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "like as self"   on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike as self" on public.likes for delete to authenticated using (user_id = auth.uid());

create policy "comment as self"     on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "delete own comment"  on public.comments for delete to authenticated using (user_id = auth.uid());

-- Counters and identity fields are trigger-managed: users may only edit these columns
revoke update on public.profiles from authenticated, anon;
grant update (name, username, bio, profile_pic) on public.profiles to authenticated;

-- Hide emails from other users (profiles are world-readable to signed-in users)
revoke select on public.profiles from authenticated, anon;
grant select (id, name, username, profile_pic, bio, is_guest, followers_count, following_count, posts_count, created_at)
  on public.profiles to authenticated;

-- Counts on posts are trigger-managed too
revoke update on public.posts from authenticated, anon;

-- ============ FEED RPC ============
-- Returns posts with author + is_liked in one round trip.

create or replace function public.get_feed(
  p_scope text default 'all',          -- 'all' | 'following' | 'user'
  p_user_id uuid default null,          -- required when p_scope = 'user'
  p_limit int default 20,
  p_before timestamptz default null     -- cursor: created_at of last post seen
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  song_data jsonb,
  likes_count int,
  comments_count int,
  created_at timestamptz,
  is_liked boolean,
  author jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id, p.user_id, p.content, p.song_data, p.likes_count, p.comments_count, p.created_at,
    exists (select 1 from likes l where l.post_id = p.id and l.user_id = auth.uid()) as is_liked,
    jsonb_build_object(
      'id', pr.id, 'name', pr.name, 'username', pr.username, 'profile_pic', pr.profile_pic
    ) as author
  from posts p
  join profiles pr on pr.id = p.user_id
  where (p_before is null or p.created_at < p_before)
    and case p_scope
          when 'following' then p.user_id in (select following_id from follows where follower_id = auth.uid())
          when 'user' then p.user_id = p_user_id
          else true
        end
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.get_feed(text, uuid, int, timestamptz) to authenticated;

-- Own profile including email
create or replace function public.get_my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public
as $$ select * from profiles where id = auth.uid(); $$;
grant execute on function public.get_my_profile() to authenticated;
