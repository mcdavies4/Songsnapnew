import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PostList from '../../components/PostList';
import { Header, Screen } from '../../components/Screen';
import { colors } from '../../lib/theme';

type Tab = 'all' | 'following';

export default function FeedScreen() {
  const [tab, setTab] = useState<Tab>('all');

  return (
    <Screen>
      <Header title="SongSnap">
        <View style={styles.tabs}>
        {(['all', 'following'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'all' ? 'All' : 'Following'}</Text>
          </Pressable>
        ))}
        </View>
      </Header>
      <PostList
        key={tab}
        scope={tab}
        emptyText={tab === 'following' ? 'Follow people to see their posts here' : 'No posts yet. Be the first to share!'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceAlt },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textFaint, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.bg },
});
