import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Avatar from '../../components/Avatar';
import { openProfile } from '../../components/PostCard';
import { Empty, Header, Screen } from '../../components/Screen';
import { openTrack } from '../../components/Sleeve';
import { getTrending, searchSongsOnSongSnap, searchUsers } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';
import type { Profile, TrackStat } from '../../lib/types';

type Mode = 'songs' | 'people';

export default function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('songs');
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<TrackStat[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [trending, setTrending] = useState<TrackStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    getTrending(30, 20).then(setTrending).catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSongs([]);
      setPeople([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++latest.current;
    const t = setTimeout(async () => {
      try {
        if (mode === 'songs') {
          const res = await searchSongsOnSongSnap(q);
          if (id === latest.current) setSongs(res);
        } else {
          const res = await searchUsers(q);
          if (id === latest.current) setPeople(res);
        }
        if (id === latest.current) setError(null);
      } catch {
        if (id === latest.current) setError('Search failed. Check your connection and try again.');
      } finally {
        if (id === latest.current) setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, mode]);

  const searching = query.trim().length >= 2;

  return (
    <Screen>
      <Header title="Discover">
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.dim} />
          <TextInput
            style={styles.input}
            placeholder={mode === 'songs' ? 'Songs or artists people are talking about' : 'Find people by name or username'}
            placeholderTextColor={colors.dim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.amber} />
          ) : query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={19} color={colors.dim} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.modes}>
          {(['songs', 'people'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.mode, mode === m && styles.modeOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextOn]}>{m === 'songs' ? 'Songs' : 'People'}</Text>
            </Pressable>
          ))}
        </View>
      </Header>

      {mode === 'songs' ? (
        <FlatList
          data={searching ? songs : trending}
          keyExtractor={(t) => `${t.source}:${t.track_id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !searching && trending.length > 0 ? <Text style={styles.section}>Most talked about this month</Text> : null
          }
          renderItem={({ item, index }) => <SongRow item={item} rank={searching ? undefined : index + 1} />}
          ListEmptyComponent={
            loading ? null : error ? (
              <Empty emoji="📡" text={error} />
            ) : searching ? (
              <Empty
                emoji="🔎"
                title="Nobody's posted this yet"
                text="Be the first to share it."
                action={
                  <Pressable onPress={() => router.navigate('/(tabs)/create')}>
                    <Text style={styles.link}>Share a song</Text>
                  </Pressable>
                }
              />
            ) : (
              <Empty emoji="🎧" text="Songs people share will show up here." />
            )
          }
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openProfile(item.id)}>
              <Avatar uri={item.profile_pic} name={item.name} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
              <Text style={styles.count}>
                {item.posts_count} {item.posts_count === 1 ? 'song' : 'songs'}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? null : error ? (
              <Empty emoji="📡" text={error} />
            ) : searching ? (
              <Empty emoji="🤷" text="No one by that name yet." />
            ) : (
              <Empty emoji="👋" title="Find your people" text="Search for friends, then follow them to see what they're playing." />
            )
          }
        />
      )}
    </Screen>
  );
}

function SongRow({ item, rank }: { item: TrackStat; rank?: number }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openTrack(item.song_data)}>
      {rank !== undefined && <Text style={styles.rank}>{rank}</Text>}
      <Image
        source={item.song_data.image_url ? { uri: item.song_data.image_url } : require('../../assets/images/icon.png')}
        style={styles.cover}
        contentFit="cover"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.song_data.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.song_data.artist}
        </Text>
      </View>
      <View style={styles.talking}>
        <Ionicons name="chatbubbles-outline" size={14} color={colors.haze} />
        <Text style={styles.count}>{item.people}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.booth,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 16,
  },
  input: { flex: 1, color: colors.ink, fontSize: 15.5, fontFamily: fonts.body, height: '100%' },
  modes: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  mode: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  modeOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { color: colors.haze, fontFamily: fonts.bodySemi, fontSize: 14 },
  modeTextOn: { color: colors.stage },
  list: { paddingVertical: 8, flexGrow: 1 },
  section: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 15, paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  pressed: { backgroundColor: colors.booth },
  rank: { width: 22, color: colors.amber, fontFamily: fonts.display, fontSize: 14, textAlign: 'center' },
  cover: { width: 54, height: 54, borderRadius: 8, backgroundColor: colors.riser },
  name: { color: colors.ink, fontSize: 15.5, fontFamily: fonts.bodySemi },
  sub: { color: colors.haze, fontSize: 13.5, fontFamily: fonts.body, marginTop: 2 },
  talking: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { color: colors.haze, fontSize: 13, fontFamily: fonts.bodySemi },
  link: { color: colors.amber, fontFamily: fonts.bodyBold, fontSize: 15, marginTop: 6 },
});
