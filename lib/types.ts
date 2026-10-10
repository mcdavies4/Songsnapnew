import type { MoodKey, ReactionKey } from './theme';

export type MusicSource = 'spotify' | 'youtube';

export interface Author {
  id: string;
  name: string;
  username: string;
  profile_pic: string | null;
}

export interface Profile extends Author {
  bio: string;
  is_guest: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  email?: string | null;
}

export interface SongData {
  title: string;
  artist: string;
  album?: string;
  image_url?: string | null;
  preview_url?: string | null;
  external_url?: string | null;
  source: MusicSource;
  track_id: string;
}

export interface CommentPreview {
  id: string;
  content: string;
  created_at: string;
  author: Author;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  song_data: SongData;
  mood: MoodKey | null;
  likes_count: number;
  reaction_counts: Partial<Record<ReactionKey, number>>;
  comments_count: number;
  created_at: string;
  my_reaction: ReactionKey | null;
  author: Author;
  top_comment: CommentPreview | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: Author;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
  source: MusicSource;
}

export interface TrackStat {
  source: MusicSource;
  track_id: string;
  song_data: SongData;
  post_count: number;
  people: number;
  last_posted: string;
}

export interface TrackSummary {
  song_data: SongData | null;
  post_count: number;
  people: number;
  top_mood: MoodKey | null;
}
