import { supabase } from './supabase';
import type { Comment, Post, Profile, SongData, Track, MusicSource } from './types';

// Profiles hide `email` from other users, so always select these columns explicitly.
export const PROFILE_COLUMNS =
  'id, name, username, profile_pic, bio, is_guest, followers_count, following_count, posts_count, created_at';
const AUTHOR_COLUMNS = 'id, name, username, profile_pic';

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

// ---------- Profiles ----------

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) fail(error, 'Could not load your profile');
  return (data as Profile[] | null)?.[0] ?? null;
}

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).single();
  if (error) fail(error, 'User not found');
  return data as Profile;
}

export async function updateProfile(
  id: string,
  changes: Partial<Pick<Profile, 'name' | 'username' | 'bio' | 'profile_pic'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('That username is taken');
    if (error.code === '23514') throw new Error('Usernames are 3–30 characters: lowercase letters, numbers, underscores');
    fail(error, 'Could not update profile');
  }
  return data as Profile;
}

export async function searchUsers(q: string): Promise<Profile[]> {
  const term = q.trim().replace(/[%_\\,()]/g, '');
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .or(`name.ilike.%${term}%,username.ilike.%${term}%`)
    .eq('is_guest', false)
    .order('followers_count', { ascending: false })
    .limit(20);
  if (error) fail(error, 'Search failed');
  return data as Profile[];
}

// ---------- Follows ----------

export async function isFollowing(myId: string, targetId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', myId)
    .eq('following_id', targetId);
  if (error) fail(error, 'Could not check follow status');
  return (count ?? 0) > 0;
}

export async function follow(myId: string, targetId: string) {
  const { error } = await supabase.from('follows').insert({ follower_id: myId, following_id: targetId });
  if (error && error.code !== '23505') fail(error, 'Could not follow');
}

export async function unfollow(myId: string, targetId: string) {
  const { error } = await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', targetId);
  if (error) fail(error, 'Could not unfollow');
}

// ---------- Posts ----------

export type FeedScope = 'all' | 'following' | 'user';

export async function getFeed(opts: {
  scope: FeedScope;
  userId?: string;
  before?: string | null;
  limit?: number;
}): Promise<Post[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_scope: opts.scope,
    p_user_id: opts.userId ?? null,
    p_limit: opts.limit ?? 20,
    p_before: opts.before ?? null,
  });
  if (error) fail(error, 'Could not load posts');
  return data as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  // Reuse the feed RPC shape by fetching the post then its like status.
  const { data, error } = await supabase
    .from('posts')
    .select(`id, user_id, content, song_data, likes_count, comments_count, created_at, author:profiles(${AUTHOR_COLUMNS})`)
    .eq('id', id)
    .maybeSingle();
  if (error) fail(error, 'Could not load post');
  if (!data) return null;

  const { data: auth } = await supabase.auth.getUser();
  let is_liked = false;
  if (auth.user) {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id)
      .eq('user_id', auth.user.id);
    is_liked = (count ?? 0) > 0;
  }
  return { ...(data as unknown as Omit<Post, 'is_liked'>), is_liked };
}

export async function createPost(userId: string, content: string, song: SongData) {
  const { error } = await supabase.from('posts').insert({ user_id: userId, content, song_data: song });
  if (error) fail(error, 'Could not create post');
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) fail(error, 'Could not delete post');
}

export async function likePost(userId: string, postId: string) {
  const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: postId });
  if (error && error.code !== '23505') fail(error, 'Could not like post');
}

export async function unlikePost(userId: string, postId: string) {
  const { error } = await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', postId);
  if (error) fail(error, 'Could not unlike post');
}

// ---------- Comments ----------

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`id, post_id, user_id, content, created_at, author:profiles(${AUTHOR_COLUMNS})`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) fail(error, 'Could not load comments');
  return data as unknown as Comment[];
}

export async function addComment(userId: string, postId: string, content: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: userId, post_id: postId, content })
    .select(`id, post_id, user_id, content, created_at, author:profiles(${AUTHOR_COLUMNS})`)
    .single();
  if (error) fail(error, 'Could not post comment');
  return data as unknown as Comment;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) fail(error, 'Could not delete comment');
}

// ---------- Music search (Edge Function) ----------

export async function searchMusic(q: string, source: MusicSource): Promise<Track[]> {
  const { data, error } = await supabase.functions.invoke('music-search', { body: { q, source } });
  if (error) {
    let message = error.message;
    try {
      // FunctionsHttpError carries the JSON body from the function
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message || 'Music search failed');
  }
  return (data?.tracks ?? []) as Track[];
}
