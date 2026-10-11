import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Avatar from '../../components/Avatar';
import PostCard, { openProfile } from '../../components/PostCard';
import { Empty, Header, Loading, Screen } from '../../components/Screen';
import { addComment, deleteComment, getComments, getPost } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';
import { ago } from '../../lib/time';
import type { Comment, Post } from '../../lib/types';
import { confirm, errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';
import { showSheet } from '../../components/ActionSheet';
import { blockFlow, getBlockedIds, reportFlow } from '../../lib/safety';

const MAX = 300;

type Thread = { root: Comment; replies: Comment[] };

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuth((s) => s.session);
  const myId = session?.user.id;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (!id || !session) return;
    let alive = true;
    Promise.all([getPost(id), getComments(id), getBlockedIds()])
      .then(([p, c, blocked]) => {
        if (!alive) return;
        if (!p) setError('This post was deleted');
        setPost(p);
        setComments(c.filter((x) => !blocked.has(x.user_id)));
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, session]);

  const threads = useMemo<Thread[]>(() => {
    const roots = comments.filter((c) => !c.parent_id);
    return roots.map((root) => ({ root, replies: comments.filter((c) => c.parent_id === root.id) }));
  }, [comments]);

  if (!session) return <Redirect href="/" />;

  const startReply = (c: Comment) => {
    setReplyTo(c);
    input.current?.focus();
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !myId || !post) return;
    setSending(true);
    try {
      const parent = replyTo ? (replyTo.parent_id ?? replyTo.id) : null;
      const c = await addComment(myId, post.id, body, parent);
      setComments((prev) => [...prev, c]);
      setPost({ ...post, comments_count: post.comments_count + 1 });
      setText('');
      setReplyTo(null);
    } catch (e) {
      notify("Couldn't post your comment", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const remove = async (c: Comment) => {
    const replies = comments.filter((x) => x.parent_id === c.id).length;
    const msg = replies > 0 ? `The ${replies} ${replies === 1 ? 'reply' : 'replies'} under it will go too.` : 'This can’t be undone.';
    if (!(await confirm('Delete comment?', msg, 'Delete', true))) return;
    try {
      await deleteComment(c.id);
      const gone = new Set([c.id, ...comments.filter((x) => x.parent_id === c.id).map((x) => x.id)]);
      setComments((prev) => prev.filter((x) => !gone.has(x.id)));
      setPost((p) => (p ? { ...p, comments_count: Math.max(0, p.comments_count - gone.size) } : p));
    } catch (e) {
      notify("Couldn't delete the comment", errorMessage(e));
    }
  };

  const hide = (ids: (c: Comment) => boolean) => setComments((prev) => prev.filter((x) => !ids(x)));

  const commentMenu = (c: Comment) => {
    if (!myId) return;
    if (c.user_id === myId) {
      showSheet('Your comment', [{ label: 'Delete comment', destructive: true, onPress: () => remove(c) }]);
      return;
    }
    const name = c.author?.name ?? 'this person';
    showSheet(`Comment by ${name}`, [
      { label: 'Report comment', onPress: () => reportFlow(myId, 'comment', { commentId: c.id }, () => hide((x) => x.id === c.id || x.parent_id === c.id)) },
      {
        label: `Block ${name}`,
        destructive: true,
        hint: "Hide everything they post. They won't be told.",
        onPress: () => blockFlow(myId, { id: c.user_id, name }, () => hide((x) => x.user_id === c.user_id)),
      },
    ]);
  };

  return (
    <Screen>
      <Header title="Discussion" back />
      {loading ? (
        <Loading />
      ) : error || !post ? (
        <Empty emoji="🫥" title="Post not found" text={error ?? 'It may have been deleted.'} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <FlatList
            data={threads}
            keyExtractor={(t) => t.root.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <PostCard post={post} standalone onDeleted={() => router.back()} />
                <Text style={styles.section}>
                  {comments.length === 0 ? 'Start the discussion' : comments.length === 1 ? '1 comment' : `${comments.length} comments`}
                </Text>
                {comments.length === 0 && (
                  <Text style={styles.prompt}>
                    What does this song mean to you? Got a favourite line, a memory, a better version?
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.thread}>
                <CommentRow c={item.root} onReply={startReply} onMore={commentMenu} />
                {item.replies.length > 0 && (
                  <View style={styles.replies}>
                    {item.replies.map((r) => (
                      <CommentRow key={r.id} c={r} onReply={startReply} onMore={commentMenu} small />
                    ))}
                  </View>
                )}
              </View>
            )}
          />

          <View style={styles.composerWrap}>
            {replyTo && (
              <View style={styles.replying}>
                <Text style={styles.replyingText} numberOfLines={1}>
                  Replying to <Text style={{ color: colors.ink }}>{replyTo.author?.name}</Text>
                </Text>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8} accessibilityLabel="Cancel reply">
                  <Ionicons name="close" size={18} color={colors.haze} />
                </Pressable>
              </View>
            )}
            <View style={styles.composer}>
              <TextInput
                ref={input}
                style={styles.input}
                placeholder={replyTo ? 'Write a reply' : 'Add to the discussion'}
                placeholderTextColor={colors.dim}
                value={text}
                onChangeText={(t) => setText(t.slice(0, MAX))}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              {sending ? (
                <ActivityIndicator color={colors.amber} />
              ) : (
                <Pressable
                  onPress={send}
                  disabled={!text.trim()}
                  hitSlop={8}
                  accessibilityLabel="Send"
                  style={[styles.send, !text.trim() && { opacity: 0.35 }]}
                >
                  <Ionicons name="arrow-up" size={20} color={colors.amberInk} />
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

function CommentRow({
  c,
  onReply,
  onMore,
  small,
}: {
  c: Comment;
  onReply: (c: Comment) => void;
  onMore: (c: Comment) => void;
  small?: boolean;
}) {
  return (
    <View style={styles.comment}>
      <Pressable onPress={() => openProfile(c.user_id)} accessibilityLabel={`${c.author?.name}'s profile`}>
        <Avatar uri={c.author?.profile_pic} name={c.author?.name} size={small ? 28 : 34} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.commentHead}>
          <Text style={styles.commentName} onPress={() => openProfile(c.user_id)} numberOfLines={1}>
            {c.author?.name}
          </Text>
          <Text style={styles.commentTime}>{ago(c.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{c.content}</Text>
        <View style={styles.commentActions}>
          <Pressable onPress={() => onReply(c)} hitSlop={6}>
            <Text style={styles.commentAction}>Reply</Text>
          </Pressable>
          <Pressable onPress={() => onMore(c)} hitSlop={6} accessibilityLabel="More options">
            <Text style={styles.commentAction}>More</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 15, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  prompt: { color: colors.haze, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, paddingHorizontal: 16 },
  thread: { paddingHorizontal: 16, paddingTop: 12 },
  replies: { marginLeft: 16, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: colors.line, marginTop: 2 },
  comment: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  commentHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  commentName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14.5, flexShrink: 1 },
  commentTime: { color: colors.dim, fontFamily: fonts.body, fontSize: 12.5 },
  commentText: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, marginTop: 2 },
  commentActions: { flexDirection: 'row', gap: 18, marginTop: 6 },
  commentAction: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 13 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.stage },
  replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10 },
  replyingText: { color: colors.haze, fontFamily: fonts.body, fontSize: 13, flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.body,
    backgroundColor: colors.booth,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
});
