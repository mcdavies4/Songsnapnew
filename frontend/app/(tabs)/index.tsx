import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard';
import { Post } from '../../types';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const loadPosts = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping load posts');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Loading posts from:', activeTab);
      const endpoint = activeTab === 'all' ? '/posts/feed' : '/posts/following';
      const response = await api.get(endpoint);
      console.log('Posts loaded:', response.data.length);
      setPosts(response.data);
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', 'Failed to load posts. Please try logging in again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    loadPosts();
  }, [activeTab, loadPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>SongSnap</Text>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text
            style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onLikeToggle={loadPosts} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DB954"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'following'
                ? 'Follow users to see their posts here'
                : 'No posts yet. Be the first to share!'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  activeTab: {
    backgroundColor: '#1DB954',
  },
  tabText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 16,
    textAlign: 'center',
  },
});
