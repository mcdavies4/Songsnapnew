export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  profile_pic?: string;
  bio?: string;
  google_id: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  is_following?: boolean;
}

export interface SongData {
  title: string;
  artist: string;
  album?: string;
  image_url?: string;
  preview_url?: string;
  source: 'spotify' | 'youtube';
  track_id: string;
}

export interface Post {
  id: string;
  user_id: string;
  user?: User;
  content: string;
  song_data: SongData;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user?: User;
  content: string;
  created_at: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  image_url?: string;
  preview_url?: string;
  source: 'spotify' | 'youtube';
}
