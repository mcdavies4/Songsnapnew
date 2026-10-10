import { supabase } from './supabase';
import type { MoodKey, ReactionKey } from './theme';
import type {
  Comment,
  MusicSource,
  Post,
  Profile,
  SongData,
  Track,
  TrackStat,
  TrackSummary,
} from './types';

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

export type FeedScope = 'all' | 'following' | 'user' | 'track';

export type FeedQuery = {
  scope: FeedScope;
  userId?: string;
  mood?: MoodKey | null;
  source?: MusicSource;
  trackId?: string;
};

function normalisePost(p: Post): Post {
  return { ...p, reaction_counts: p.reaction_counts ?? {}, my_reaction: p.my_reaction ?? null };
}

export async function getFeed(q: FeedQuery & { before?: string | null; limit?: number }): Promise<Post[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_scope: q.scope,
    p_user_id: q.userId ?? null,
    p_limit: q.limit ?? 20,
    p_before: q.before ?? null,
    p_mood: q.mood ?? null,
    p_source: q.source ?? null,
    p_track_id: q.trackId ?? null,
  });
  if (error) fail(error, 'Could not load posts');
  return (data as Post[]).map(normalisePost);
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, user_id, content, song_data, mood, likes_count, reaction_counts, comments_count, created_at, author:profiles(${AUTHOR_COLUMNS})`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) fail(error, 'Could not load post');
  if (!data) return null;

  const { data: auth } = await supabase.auth.getUser();
  let my_reaction: ReactionKey | null = null;
  if (auth.user) {
    const { data: like } = await supabase
      .from('likes')
      .select('kind')
      .eq('post_id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    my_reaction = (like?.kind as ReactionKey) ?? null;
  }
  return normalisePost({ ...(data as unknown as Post), my_reaction, top_comment: null });
}

export async function createPost(userId: string, content: string, song: SongData, mood: MoodKey | null) {
  const { error } = await supabase.from('posts').insert({ user_id: userId, content, song_data: song, mood });
  if (error) fail(error, 'Could not create post');
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) fail(error, 'Could not delete post');
}

// ---------- Reactions ----------

export async function setReaction(userId: string, postId: string, kind: ReactionKey, hadReaction: boolean) {
  if (hadReaction) {
    const { error } = await supabase.from('likes').update({ kind }).eq('user_id', userId).eq('post_id', postId);
    if (error) fail(error, 'Could not react');
  } else {
    const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: postId, kind });
    if (error && error.code === '23505') {
      const { error: e2 } = await supabase.from('likes').update({ kind }).eq('user_id', userId).eq('post_id', postId);
      if (e2) fail(e2, 'Could not react');
    } else if (error) fail(error, 'Could not react');
  }
}

export async function clearReaction(userId: string, postId: string) {
  const { error } = await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', postId);
  if (error) fail(error, 'Could not remove reaction');
}

// ---------- Comments ----------

const COMMENT_SELECT = `id, post_id, user_id, parent_id, content, created_at, author:profiles(${AUTHOR_COLUMNS})`;

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) fail(error, 'Could not load comments');
  return data as unknown as Comment[];
}

export async function addComment(
  userId: string,
  postId: string,
  content: string,
  parentId: string | null = null
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: userId, post_id: postId, content, parent_id: parentId })
    .select(COMMENT_SELECT)
    .single();
  if (error) fail(error, 'Could not post comment');
  return data as unknown as Comment;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) fail(error, 'Could not delete comment');
}

// ---------- Songs ----------

export async function getTrending(days = 7, limit = 12): Promise<TrackStat[]> {
  const { data, error } = await supabase.rpc('trending_tracks', { p_days: days, p_limit: limit });
  if (error) fail(error, 'Could not load trending songs');
  return (data as TrackStat[]).filter((t) => t.song_data);
}

export async function searchSongsOnSongSnap(q: string): Promise<TrackStat[]> {
  if (q.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_tracks', { p_q: q.trim(), p_limit: 20 });
  if (error) fail(error, 'Search failed');
  return (data as TrackStat[]).filter((t) => t.song_data);
}

export async function getTrackSummary(source: MusicSource, trackId: string): Promise<TrackSummary | null> {
  const { data, error } = await supabase.rpc('track_summary', { p_source: source, p_track_id: trackId });
  if (error) fail(error, 'Could not load song');
  const row = (data as TrackSummary[] | null)?.[0];
  return row && row.song_data ? row : null;
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

export function songLink(song: SongData): string {
  if (song.external_url) return song.external_url;
  return song.source === 'youtube'
    ? `https://www.youtube.com/watch?v=${song.track_id}`
    : `https://open.spotify.com/track/${song.track_id}`;
}

export function trackToSong(t: Track): SongData {
  return {
    title: t.title,
    artist: t.artist,
    album: t.album,
    image_url: t.image_url,
    preview_url: t.preview_url,
    external_url: t.external_url,
    source: t.source,
    track_id: t.id,
  };
}
