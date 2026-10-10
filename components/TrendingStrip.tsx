import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getTrending } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import type { TrackStat } from '../lib/types';
import { openTrack } from './Sleeve';

/** "Spinning this week": the songs most people posted about in the last 7 days. */
export default function TrendingStrip({ refreshKey }: { refreshKey: number }) {
  const [tracks, setTracks] = useState<TrackStat[]>([]);

  const load = useCallback(() => {
    getTrending(7, 12)
      .then(setTracks)
      .catch(() => setTracks([]));
  }, []);

  useEffect(load, [load, refreshKey]);

  if (tracks.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} accessibilityRole="header">
        Spinning this week
      </Text>
      <FlatList
        horizontal
        data={tracks}
        keyExtractor={(t) => `${t.source}:${t.track_id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.item}
            onPress={() => openTrack(item.song_data)}
            accessibilityLabel={`${item.song_data.title} by ${item.song_data.artist}, ${item.people} people`}
          >
            <View>
              <Image
                source={item.song_data.image_url ? { uri: item.song_data.image_url } : require('../assets/images/icon.png')}
                style={styles.cover}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.song_data.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.people === 1 ? '1 person' : `${item.people} people`}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const COVER = 128;

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  heading: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 15, paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 10 },
  item: { width: COVER },
  cover: { width: COVER, height: COVER, borderRadius: 12, backgroundColor: colors.riser },
  rank: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.amberInk, fontFamily: fonts.display, fontSize: 12 },
  title: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 13.5, marginTop: 8 },
  meta: { color: colors.dim, fontFamily: fonts.body, fontSize: 12, marginTop: 1 },
});
