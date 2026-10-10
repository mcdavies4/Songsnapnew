import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import MoodChip from '../../components/MoodChip';
import PostList from '../../components/PostList';
import { Empty, Header, Screen } from '../../components/Screen';
import TrendingStrip from '../../components/TrendingStrip';
import { colors, fonts, moodOf, MOODS, type MoodKey } from '../../lib/theme';

type Scope = 'all' | 'following';

export default function FeedScreen() {
  const params = useLocalSearchParams<{ mood?: string }>();
  const [scope, setScope] = useState<Scope>('all');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tapping a mood tag on any post lands here with ?mood=...
  useEffect(() => {
    if (params.mood && moodOf(params.mood)) setMood(params.mood as MoodKey);
  }, [params.mood]);

  const pickMood = (m: MoodKey | null) => {
    setMood(m);
    router.setParams({ mood: m ?? undefined });
  };

  const m = moodOf(mood);

  const empty =
    scope === 'following' ? (
      <Empty
        emoji="👥"
        title="Nobody to hear from yet"
        text="Follow people from Discover or from any post, and what they're playing shows up here."
      />
    ) : m ? (
      <Empty emoji={m.emoji} title={`No ${m.label.toLowerCase()} posts yet`} text="Share a song for this moment and start it off." />
    ) : (
      <Empty
        emoji="🎶"
        title="The stage is empty"
        text="Share the song you can't stop playing and start the conversation."
        action={<Button title="Share a song" onPress={() => router.navigate('/(tabs)/create')} style={{ marginTop: 10 }} />}
      />
    );

  return (
    <Screen>
      <Header title="SongSnap" wordmark>
        <View style={styles.scopes}>
          {(['all', 'following'] as Scope[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              style={styles.scope}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === s }}
            >
              <Text style={[styles.scopeText, scope === s && styles.scopeOn]}>{s === 'all' ? 'Everyone' : 'Following'}</Text>
              <View style={[styles.underline, scope === s && styles.underlineOn]} />
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moods}>
          <MoodChip label="All moods" active={!mood} onPress={() => pickMood(null)} />
          {MOODS.map((x) => (
            <MoodChip key={x.key} mood={x.key} active={mood === x.key} onPress={() => pickMood(mood === x.key ? null : x.key)} />
          ))}
        </ScrollView>
      </Header>

      <PostList
        key={`${scope}:${mood ?? ''}`}
        query={{ scope, mood }}
        empty={empty}
        header={scope === 'all' && !mood ? <TrendingStrip refreshKey={refreshKey} /> : null}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scopes: { flexDirection: 'row', gap: 22, paddingHorizontal: 16, marginBottom: 10 },
  scope: { paddingTop: 2 },
  scopeText: { color: colors.dim, fontSize: 15, fontFamily: fonts.bodySemi },
  scopeOn: { color: colors.ink },
  underline: { height: 3, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.amber },
  moods: { gap: 8, paddingHorizontal: 16 },
});
