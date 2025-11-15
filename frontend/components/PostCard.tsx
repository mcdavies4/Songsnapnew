import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { Audio } from 'expo-av';

interface PostCardProps {
  post: Post;
  onLikeToggle?: () => void;
  onComment?: () => void;
}

export default function PostCard({ post, onLikeToggle, onComment }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await api.delete(`/posts/${post.id}/like`);
        setIsLiked(false);
        setLikesCount(likesCount - 1);
      } else {
        await api.post(`/posts/${post.id}/like`);
        setIsLiked(true);
        setLikesCount(likesCount + 1);
      }
      onLikeToggle?.();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to like post');
    }
  };

  const playPreview = async () => {
    try {
      if (!post.song_data.preview_url) {
        Alert.alert('No Preview', 'This track does not have a preview available');
        return;
      }

      if (isPlaying && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: post.song_data.preview_url },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setSound(null);
          }
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to play preview');
      setIsPlaying(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <View style={styles.container}>
      {/* User Info */}
      <View style={styles.header}>
        <Image
          source={
            post.user?.profile_pic
              ? { uri: post.user.profile_pic }
              : require('../assets/images/icon.png')
          }
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{post.user?.name}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
      </View>

      {/* Post Content */}
      {post.content && <Text style={styles.content}>{post.content}</Text>}

      {/* Song Card */}
      <View style={styles.songCard}>
        <Image
          source={
            post.song_data.image_url
              ? { uri: post.song_data.image_url }
              : require('../assets/images/icon.png')
          }
          style={styles.albumArt}
        />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {post.song_data.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {post.song_data.artist}
          </Text>
          {post.song_data.album && (
            <Text style={styles.songAlbum} numberOfLines={1}>
              {post.song_data.album}
            </Text>
          )}
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>
              {post.song_data.source === 'spotify' ? 'Spotify' : 'YouTube'}
            </Text>
          </View>
        </View>
        {post.song_data.preview_url && (
          <TouchableOpacity style={styles.playButton} onPress={playPreview}>
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={48}
              color="#1DB954"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#ff3b30' : '#fff'}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  songCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 2,
  },
  songAlbum: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 6,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1DB954',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  playButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
  },
});
