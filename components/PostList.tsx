import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { getFeed, type FeedScope } from '../lib/api';
import { stopPreview } from '../lib/audio';
import { colors } from '../lib/theme';
import type { Post } from '../lib/types';
import { errorMessage } from '../lib/ui';
import PostCard from './PostCard';
import { Empty } from './Screen';

const PAGE = 20;

type Props = {
  scope: FeedScope;
  userId?: string;
  emptyText: string;
  header?: ReactElement | null;
};

export default function PostList({ scope, userId, emptyText, header }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await getFeed({ scope, userId, limit: PAGE });
      if (id !== requestId.current) return;
      setPosts(data);
      setHasMore(data.length === PAGE);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e, 'Could not load posts'));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [scope, userId]);

  // Reload whenever the screen comes back into focus (e.g. after posting).
  useFocusEffect(
    useCallback(() => {
      loadFirst();
      return () => stopPreview();
    }, [loadFirst])
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const data = await getFeed({ scope, userId, limit: PAGE, before: posts[posts.length - 1].created_at });
      setPosts((prev) => [...prev, ...data.filter((p) => !prev.some((x) => x.id === p.id))]);
      setHasMore(data.length === PAGE);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  };

  const onDeleted = useCallback((id: string) => setPosts((prev) => prev.filter((p) => p.id !== id)), []);

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} onDeleted={onDeleted} />}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadFirst();
          }}
          tintColor={colors.accent}
        />
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <Empty icon={error ? 'cloud-offline-outline' : 'musical-notes-outline'} text={error ?? emptyText} />
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, flexGrow: 1 },
  loading: { padding: 60, alignItems: 'center' },
});
