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

export interface Post {
  id: string;
  user_id: string;
  content: string;
  song_data: SongData;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
  author: Author;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
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
