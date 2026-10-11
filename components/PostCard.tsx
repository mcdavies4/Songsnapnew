import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { deletePost, songLink } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import { ago } from '../lib/time';
import type { Post } from '../lib/types';
import { confirm, errorMessage, notify } from '../lib/ui';
import { blockFlow, reportFlow } from '../lib/safety';
import { useAuth } from '../store/auth';
import { showSheet } from './ActionSheet';
import Avatar from './Avatar';
import MoodChip from './MoodChip';
import { ReactButton, ReactionPicker, ReactionSummary, useReaction } from './Reactions';
import Sleeve from './Sleeve';

type Props = {
  post: Post;
  onDeleted?: (id: string) => void;
  /** Called after the viewer blocks this post's author. */
  onBlocked?: (userId: string) => void;
  /** On the post page itself we don't link to it or show the comment preview. */
  standalone?: boolean;
};

export function openProfile(userId: string) {
  const me = useAuth.getState().session?.user.id;
  if (userId === me) router.push('/(tabs)/profile');
  else router.push(`/user/${userId}`);
}

export async function sharePost(post: Post) {
  const url = Platform.OS === 'web' ? `${window.location.origin}/post/${post.id}` : songLink(post.song_data);
  const message = `${post.song_data.title} by ${post.song_data.artist} on SongSnap`;
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) await navigator.share({ title: message, url });
      else {
        await navigator.clipboard.writeText(url);
        notify('Link copied');
      }
    } else {
      await Share.share({ message: `${message}\n${url}` });
    }
  } catch {
    /* user cancelled */
  }
}

function PostCard({ post, onDeleted, onBlocked, standalone = false }: Props) {
  const myId = useAuth((s) => s.session?.user.id);
  const [picking, setPicking] = useState(false);
  const r = useReaction(myId, post.id, {
    mine: post.my_reaction,
    counts: post.reaction_counts,
    total: post.likes_count,
  });

  const openPost = () => router.push(`/post/${post.id}`);

  const remove = async () => {
    if (!(await confirm('Delete this post?', 'The post and its discussion will be removed.', 'Delete', true))) return;
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch (e) {
      notify("Couldn't delete the post", errorMessage(e));
    }
  };

  const openMenu = () => {
    if (!myId) return;
    if (post.user_id === myId) {
      showSheet('Your post', [{ label: 'Delete post', destructive: true, onPress: remove }]);
      return;
    }
    const name = post.author?.name ?? 'this person';
    showSheet(`Post by ${name}`, [
      { label: 'Share post', onPress: () => sharePost(post) },
      { label: 'Report post', onPress: () => reportFlow(myId, 'post', { postId: post.id }, () => onDeleted?.(post.id)) },
      {
        label: `Block ${name}`,
        destructive: true,
        hint: "Hide everything they post. They won't be told.",
        onPress: () => blockFlow(myId, { id: post.user_id, name }, () => onBlocked?.(post.user_id)),
      },
    ]);
  };

  return (
    <View style={styles.item}>
      <View style={styles.head}>
        <Pressable onPress={() => openProfile(post.user_id)} accessibilityLabel={`${post.author?.name}'s profile`}>
          <Avatar uri={post.author?.profile_pic} name={post.author?.name} size={42} />
        </Pressable>
        <Pressable style={styles.who} onPress={() => openProfile(post.user_id)}>
          <Text style={styles.name} numberOfLines={1}>
            {post.author?.name}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{post.author?.username}
          </Text>
        </Pressable>
        <Text style={styles.time}>{ago(post.created_at)}</Text>
        <Pressable hitSlop={10} onPress={openMenu} accessibilityLabel="More options" style={{ marginLeft: 2 }}>
          <Ionicons name="ellipsis-horizontal" size={19} color={colors.dim} />
        </Pressable>
      </View>

      {!!post.content && (
        <Pressable onPress={standalone ? undefined : openPost} disabled={standalone}>
          <Text style={[styles.caption, standalone && styles.captionLarge]}>{post.content}</Text>
        </Pressable>
      )}

      <Sleeve song={post.song_data} playKey={post.id} />

      {!!post.mood && (
        <View style={styles.moodRow}>
          <MoodChip mood={post.mood} size="sm" onPress={() => router.push({ pathname: '/(tabs)', params: { mood: post.mood! } })} />
        </View>
      )}

      <View style={styles.bar}>
        <ReactButton mine={r.mine} onPress={() => setPicking((v) => !v)} />
        <Pressable
          style={styles.action}
          onPress={standalone ? undefined : openPost}
          disabled={standalone}
          hitSlop={6}
          accessibilityLabel={`${post.comments_count} comments`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.haze} />
          <Text style={styles.actionText}>{post.comments_count > 0 ? post.comments_count : 'Discuss'}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <ReactionSummary counts={r.counts} total={r.total} />
        <Pressable onPress={() => sharePost(post)} hitSlop={8} accessibilityLabel="Share" style={{ marginLeft: 14 }}>
          <Ionicons name="paper-plane-outline" size={19} color={colors.haze} />
        </Pressable>
      </View>

      {picking && (
        <ReactionPicker
          mine={r.mine}
          onPick={(k) => {
            r.apply(k);
            setPicking(false);
          }}
        />
      )}

      {!standalone && post.top_comment && (
        <Pressable style={styles.preview} onPress={openPost}>
          <Avatar uri={post.top_comment.author?.profile_pic} name={post.top_comment.author?.name} size={24} />
          <Text style={styles.previewText} numberOfLines={2}>
            <Text style={styles.previewName}>{post.top_comment.author?.name} </Text>
            {post.top_comment.content}
          </Text>
        </Pressable>
      )}
      {!standalone && post.comments_count > 1 && (
        <Pressable onPress={openPost} hitSlop={4}>
          <Text style={styles.more}>View all {post.comments_count} comments</Text>
        </Pressable>
      )}
    </View>
  );
}

export default memo(PostCard);

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  who: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 15.5, fontFamily: fonts.bodyBold },
  handle: { color: colors.dim, fontSize: 13, fontFamily: fonts.body, marginTop: 1 },
  time: { color: colors.dim, fontSize: 13, fontFamily: fonts.bodyMedium },
  caption: { color: colors.ink, fontSize: 16, lineHeight: 23, fontFamily: fonts.body, marginBottom: 12 },
  captionLarge: { fontSize: 18, lineHeight: 26 },
  moodRow: { marginTop: 10, marginLeft: -2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionText: { color: colors.haze, fontSize: 14, fontFamily: fonts.bodySemi },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  previewText: { flex: 1, color: colors.haze, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  previewName: { color: colors.ink, fontFamily: fonts.bodySemi },
  more: { color: colors.amber, fontSize: 13.5, fontFamily: fonts.bodySemi, marginTop: 8, marginLeft: 34 },
});
