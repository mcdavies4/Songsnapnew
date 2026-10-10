import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Avatar from '../../components/Avatar';
import { openProfile } from '../../components/PostCard';
import { Empty, Header, Screen } from '../../components/Screen';
import { searchUsers } from '../../lib/api';
import { colors } from '../../lib/theme';
import type { Profile } from '../../lib/types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++latest.current;
    const t = setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        if (id === latest.current) {
          setUsers(res);
          setError(null);
        }
      } catch (e) {
        if (id === latest.current) setError('Search failed. Try again.');
      } finally {
        if (id === latest.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Screen>
      <Header title="Search">
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textFaint} />
          <TextInput
            style={styles.input}
            placeholder="Search people…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </Header>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openProfile(item.id)}>
            <Avatar uri={item.profile_pic} name={item.name} size={50} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.stats}>
                {item.posts_count} posts · {item.followers_count} followers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : error ? (
            <Empty icon="cloud-offline-outline" text={error} />
          ) : query.trim().length >= 2 ? (
            <Empty text="No users found" />
          ) : (
            <Empty icon="search" text="Search for people by name or username" />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, height: '100%' },
  list: { padding: 16, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  username: { color: colors.textFaint, fontSize: 14, marginTop: 1 },
  stats: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
