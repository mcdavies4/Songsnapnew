import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Button from '../../../components/Button';
import Equalizer from '../../../components/Equalizer';
import MoodChip from '../../../components/MoodChip';
import PostList from '../../../components/PostList';
import { Empty, Header, Loading, Screen } from '../../../components/Screen';
import { ArtGlow, usePreview } from '../../../components/Sleeve';
import SourceIcon from '../../../components/SourceIcon';
import { getTrackSummary, songLink } from '../../../lib/api';
import { colors, fonts } from '../../../lib/theme';
import type { MusicSource, TrackSummary } from '../../../lib/types';
import { errorMessage } from '../../../lib/ui';
import { useAuth } from '../../../store/auth';
import { useDraft } from '../../../store/draft';

export default function TrackScreen() {
  const { source, id } = useLocalSearchParams<{ source: string; id: string }>();
  const session = useAuth((s) => s.session);
  const [summary, setSummary] = useState<TrackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackId = decodeURIComponent(id ?? '');
  const src = (source === 'youtube' ? 'youtube' : 'spotify') as MusicSource;

  useEffect(() => {
    if (!trackId || !session) return;
    let alive = true;
    getTrackSummary(src, trackId)
      .then((s) => alive && setSummary(s))
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [src, trackId, session]);

  if (!session) return <Redirect href="/" />;

  if (loading) {
    return (
      <Screen>
        <Header title="Song" back />
        <Loading />
      </Screen>
    );
  }
  if (error || !summary?.song_data) {
    return (
      <Screen>
        <Header title="Song" back />
        <Empty emoji="🎵" title="Nobody's talking about this yet" text={error ?? 'Posts about this song were removed.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={summary.song_data.title} back />
      <PostList
        query={{ scope: 'track', source: src, trackId }}
        empty={<Empty emoji="🎵" text="No posts about this song yet." />}
        header={<Hero summary={summary} />}
      />
    </Screen>
  );
}

function Hero({ summary }: { summary: TrackSummary }) {
  const song = summary.song_data!;
  const { playing, hasPreview, toggle } = usePreview(`track:${song.source}:${song.track_id}`, song);

  const shareTake = () => {
    useDraft.getState().setSong(song);
    router.navigate('/(tabs)/create');
  };

  return (
    <View>
      <ArtGlow uri={song.image_url} style={styles.glow}>
        <View style={styles.hero}>
          <Image
            source={song.image_url ? { uri: song.image_url } : require('../../../assets/images/icon.png')}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
          <Text style={styles.title} numberOfLines={3} accessibilityRole="header">
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={2}>
            {song.artist}
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statN}>{summary.people}</Text>
              <Text style={styles.statLabel}>{summary.people === 1 ? 'person sharing' : 'people sharing'}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statN}>{summary.post_count}</Text>
              <Text style={styles.statLabel}>{summary.post_count === 1 ? 'post' : 'posts'}</Text>
            </View>
          </View>

          {summary.top_mood && (
            <View style={styles.moodLine}>
              <Text style={styles.moodLabel}>Mostly played for</Text>
              <MoodChip mood={summary.top_mood} size="sm" />
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title={hasPreview ? (playing ? 'Playing' : 'Play preview') : song.source === 'youtube' ? 'Watch' : 'Listen'}
              variant="quiet"
              onPress={toggle}
              icon={
                playing ? (
                  <Equalizer playing color={colors.amber} size={16} />
                ) : (
                  <Ionicons name={hasPreview ? 'play' : 'open-outline'} size={18} color={colors.ink} />
                )
              }
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)' }}
            />
            <Button title="Share your take" onPress={shareTake} style={{ flex: 1 }} />
          </View>

          <Text style={styles.open} onPress={() => Linking.openURL(songLink(song))}>
            <SourceIcon source={song.source} size={13} color="rgba(255,255,255,0.7)" />
            {song.source === 'youtube' ? '  Open in YouTube' : '  Open in Spotify'}
          </Text>
        </View>
      </ArtGlow>
      <Text style={styles.section}>What people are saying</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { borderRadius: 0 },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22 },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 14,
    backgroundColor: colors.riser,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 24, lineHeight: 30, textAlign: 'center', marginTop: 22 },
  artist: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodySemi, fontSize: 16, marginTop: 6, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 32, marginTop: 18 },
  stat: { alignItems: 'center' },
  statN: { color: '#fff', fontFamily: fonts.display, fontSize: 20 },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  moodLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  moodLabel: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.body, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch', maxWidth: 440, width: '100%' },
  open: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 16 },
  section: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 15, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 4 },
});
