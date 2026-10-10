import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { getFeed, type FeedQuery } from '../lib/api';
import { stopPreview } from '../lib/audio';
import { colors } from '../lib/theme';
import type { Post } from '../lib/types';
import { errorMessage } from '../lib/ui';
import PostCard from './PostCard';
import { Empty } from './Screen';

const PAGE = 20;

type Props = {
  query: FeedQuery;
  empty: ReactElement;
  header?: ReactElement | null;
  /** Called after each refresh so headers (e.g. trending) can reload too. */
  onRefresh?: () => void;
  /** Receives the newest post after each load (null when there are none). */
  onFirstPost?: (p: Post | null) => void;
};

export default function PostList({ query, empty, header, onRefresh, onFirstPost }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const key = JSON.stringify(query);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await getFeed({ ...query, limit: PAGE });
      if (id !== requestId.current) return;
      setPosts(data);
      setHasMore(data.length === PAGE);
      setError(null);
      onFirstPost?.(data[0] ?? null);
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e, "Couldn't load posts"));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
      const data = await getFeed({ ...query, limit: PAGE, before: posts[posts.length - 1].created_at });
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
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadFirst();
            onRefresh?.();
          }}
          tintColor={colors.amber}
        />
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.amber} />
          </View>
        ) : error ? (
          <Empty emoji="📡" title="Couldn't load posts" text={`${error}. Pull down to try again.`} />
        ) : (
          empty
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.amber} style={{ margin: 20 }} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
  loading: { padding: 60, alignItems: 'center' },
});
