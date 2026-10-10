import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { colors } from '../../lib/theme';
import type { Comment, Post } from '../../lib/types';
import { confirm, errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';

const MAX = 300;

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

  useEffect(() => {
    if (!id || !session) return;
    let alive = true;
    Promise.all([getPost(id), getComments(id)])
      .then(([p, c]) => {
        if (!alive) return;
        if (!p) setError('This post was deleted');
        setPost(p);
        setComments(c);
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, session]);

  if (!session) return <Redirect href="/" />;

  const send = async () => {
    const body = text.trim();
    if (!body || !myId || !post) return;
    setSending(true);
    try {
      const c = await addComment(myId, post.id, body);
      setComments((prev) => [...prev, c]);
      setPost({ ...post, comments_count: post.comments_count + 1 });
      setText('');
    } catch (e) {
      notify('Could not comment', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const remove = async (c: Comment) => {
    if (!(await confirm('Delete comment?', 'This cannot be undone.', 'Delete', true))) return;
    try {
      await deleteComment(c.id);
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      setPost((p) => (p ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
    } catch (e) {
      notify('Error', errorMessage(e));
    }
  };

  return (
    <Screen>
      <Header title="Post" back />
      {loading ? (
        <Loading />
      ) : error || !post ? (
        <Empty icon="musical-notes-outline" text={error ?? 'Post not found'} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <PostCard post={post} linkToComments={false} onDeleted={() => router.back()} />
                <Text style={styles.section}>
                  {comments.length === 0 ? 'No comments yet' : `Comments (${comments.length})`}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Pressable onPress={() => openProfile(item.user_id)}>
                  <Avatar uri={item.author?.profile_pic} name={item.author?.name} size={34} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentMeta}>
                    <Text style={styles.commentName} onPress={() => openProfile(item.user_id)}>
                      {item.author?.name}
                    </Text>
                    {'  '}
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </Text>
                  <Text style={styles.commentText}>{item.content}</Text>
                </View>
                {item.user_id === myId && (
                  <Pressable onPress={() => remove(item)} hitSlop={8} accessibilityLabel="Delete comment">
                    <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                  </Pressable>
                )}
              </View>
            )}
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textFaint}
              value={text}
              onChangeText={(t) => setText(t.slice(0, MAX))}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline={false}
            />
            {sending ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Pressable onPress={send} disabled={!text.trim()} hitSlop={8} accessibilityLabel="Send comment">
                <Ionicons name="send" size={22} color={text.trim() ? colors.accent : colors.textFaint} />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  section: { color: colors.textFaint, fontWeight: '600', fontSize: 14, marginBottom: 12, marginTop: 4 },
  comment: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentMeta: { color: colors.textFaint, fontSize: 12 },
  commentName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  commentText: { color: colors.text, fontSize: 15, marginTop: 3, lineHeight: 20 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
