import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { deletePost, likePost, unlikePost } from '../lib/api';
import { subscribe, togglePreview } from '../lib/audio';
import { colors } from '../lib/theme';
import type { Post } from '../lib/types';
import { confirm, errorMessage, notify } from '../lib/ui';
import { useAuth } from '../store/auth';
import Avatar from './Avatar';
import SourceIcon from './SourceIcon';

type Props = {
  post: Post;
  onDeleted?: (id: string) => void;
  linkToComments?: boolean;
};

export function openProfile(userId: string) {
  const me = useAuth.getState().session?.user.id;
  if (userId === me) router.push('/(tabs)/profile');
  else router.push(`/user/${userId}`);
}

function externalUrl(post: Post) {
  const s = post.song_data;
  if (s.external_url) return s.external_url;
  return s.source === 'youtube'
    ? `https://www.youtube.com/watch?v=${s.track_id}`
    : `https://open.spotify.com/track/${s.track_id}`;
}

function PostCard({ post, onDeleted, linkToComments = true }: Props) {
  const myId = useAuth((s) => s.session?.user.id);
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setLiked(post.is_liked);
    setLikes(post.likes_count);
  }, [post.is_liked, post.likes_count]);

  useEffect(() => subscribe((key) => setPlaying(key === post.id)), [post.id]);

  const song = post.song_data;
  // Old YouTube posts stored the watch URL as preview_url; only real audio files are playable.
  const preview = song.source === 'spotify' && song.preview_url ? song.preview_url : null;

  const toggleLike = async () => {
    if (!myId || busy) return;
    const next = !liked;
    setBusy(true);
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      if (next) await likePost(myId, post.id);
      else await unlikePost(myId, post.id);
    } catch (e) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      notify('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm('Delete post', 'This cannot be undone.', 'Delete', true))) return;
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch (e) {
      notify('Error', errorMessage(e));
    }
  };

  const play = () => {
    if (preview) togglePreview(post.id, preview).catch(() => notify('Error', 'Could not play preview'));
    else Linking.openURL(externalUrl(post));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.author} onPress={() => openProfile(post.user_id)}>
          <Avatar uri={post.author?.profile_pic} name={post.author?.name} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {post.author?.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              @{post.author?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Text>
          </View>
        </Pressable>
        {post.user_id === myId && (
          <Pressable hitSlop={10} onPress={remove} accessibilityLabel="Delete post">
            <Ionicons name="trash-outline" size={20} color={colors.textFaint} />
          </Pressable>
        )}
      </View>

      {!!post.content && <Text style={styles.content}>{post.content}</Text>}

      <View style={styles.song}>
        <Image
          source={song.image_url ? { uri: song.image_url } : require('../assets/images/icon.png')}
          style={styles.art}
          contentFit="cover"
        />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist}
          </Text>
          {!!song.album && (
            <Text style={styles.songAlbum} numberOfLines={1}>
              {song.album}
            </Text>
          )}
          <Pressable
            onPress={() => Linking.openURL(externalUrl(post))}
            style={[styles.badge, song.source === 'youtube' && styles.badgeYt]}
          >
            <SourceIcon source={song.source} size={11} color="#fff" />
            <Text style={styles.badgeText}>{song.source === 'youtube' ? 'YouTube' : 'Spotify'}</Text>
          </Pressable>
        </View>
        <Pressable onPress={play} hitSlop={8} accessibilityLabel={preview ? 'Play preview' : 'Open song'}>
          <Ionicons
            name={preview ? (playing ? 'pause-circle' : 'play-circle') : 'open-outline'}
            size={preview ? 48 : 26}
            color={colors.accent}
          />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={toggleLike} hitSlop={6} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.danger : colors.text} />
          <Text style={styles.actionText}>{likes}</Text>
        </Pressable>
        <Pressable
          style={styles.action}
          hitSlop={6}
          onPress={linkToComments ? () => router.push(`/post/${post.id}`) : undefined}
          accessibilityLabel="Comments"
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default memo(PostCard);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, padding: 16, marginBottom: 12, borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  content: { color: colors.text, fontSize: 15, lineHeight: 21, marginBottom: 12 },
  song: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  art: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.bg },
  songInfo: { flex: 1, justifyContent: 'center' },
  songTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  songArtist: { color: colors.textMuted, fontSize: 14, marginBottom: 2 },
  songAlbum: { color: colors.textFaint, fontSize: 12, marginBottom: 4 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
  },
  badgeYt: { backgroundColor: colors.youtube },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 24 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.text, fontSize: 14 },
});
