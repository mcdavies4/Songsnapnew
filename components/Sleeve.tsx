import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { songLink } from '../lib/api';
import { subscribe, togglePreview } from '../lib/audio';
import { colors, fonts } from '../lib/theme';
import type { SongData } from '../lib/types';
import { notify } from '../lib/ui';
import Equalizer from './Equalizer';
import SourceIcon from './SourceIcon';

export function trackHref(song: Pick<SongData, 'source' | 'track_id'>) {
  return `/track/${song.source}/${encodeURIComponent(song.track_id)}` as const;
}

export function openTrack(song: SongData) {
  router.push(trackHref(song));
}

export function usePreview(key: string, song: SongData) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => subscribe((k) => setPlaying(k === key)), [key]);
  // Old YouTube posts stored the watch URL as preview_url; only Spotify previews are audio.
  const preview = song.source === 'spotify' && song.preview_url ? song.preview_url : null;
  const toggle = () => {
    if (preview) togglePreview(key, preview).catch(() => notify("Couldn't play the preview"));
    else Linking.openURL(songLink(song));
  };
  return { playing, hasPreview: !!preview, toggle };
}

/** Background of blurred album art; the colour of every song panel comes from its own cover. */
export function ArtGlow({ uri, children, style }: { uri?: string | null; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.glow, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={36} transition={200} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.riser }]} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
      {children}
    </View>
  );
}

type Props = {
  song: SongData;
  playKey: string;
  variant?: 'feed' | 'compact';
  linkToTrack?: boolean;
  right?: ReactNode;
};

export default function Sleeve({ song, playKey, variant = 'feed', linkToTrack = true, right }: Props) {
  const { playing, hasPreview, toggle } = usePreview(playKey, song);
  const art = variant === 'feed' ? 92 : 56;

  return (
    <ArtGlow uri={song.image_url} style={variant === 'compact' ? styles.compact : styles.feed}>
      <View style={styles.row}>
        <Pressable
          onPress={linkToTrack ? () => openTrack(song) : undefined}
          disabled={!linkToTrack}
          accessibilityLabel={`${song.title} by ${song.artist}`}
        >
          <Image
            source={song.image_url ? { uri: song.image_url } : require('../assets/images/icon.png')}
            style={[styles.art, { width: art, height: art, borderRadius: variant === 'feed' ? 10 : 8 }]}
            contentFit="cover"
          />
        </Pressable>

        <Pressable
          style={styles.info}
          onPress={linkToTrack ? () => openTrack(song) : undefined}
          disabled={!linkToTrack}
        >
          <Text style={[styles.title, variant === 'compact' && styles.titleCompact]} numberOfLines={2}>
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
          {variant === 'feed' && (
            <Pressable onPress={() => Linking.openURL(songLink(song))} style={styles.source} hitSlop={6}>
              <SourceIcon source={song.source} size={13} color={song.source === 'youtube' ? colors.youtube : colors.spotify} />
              <Text style={styles.sourceText}>{song.source === 'youtube' ? 'Watch on YouTube' : 'Open in Spotify'}</Text>
            </Pressable>
          )}
        </Pressable>

        {right ?? (
          <Pressable
            onPress={toggle}
            style={[styles.play, playing && styles.playOn]}
            accessibilityLabel={hasPreview ? (playing ? 'Stop preview' : 'Play preview') : 'Open song'}
            hitSlop={6}
          >
            {playing ? (
              <Equalizer playing color={colors.amberInk} size={18} />
            ) : (
              <Ionicons
                name={hasPreview ? 'play' : 'open-outline'}
                size={hasPreview ? 22 : 18}
                color={colors.stage}
                style={hasPreview ? { marginLeft: 3 } : undefined}
              />
            )}
          </Pressable>
        )}
      </View>
    </ArtGlow>
  );
}

const styles = StyleSheet.create({
  glow: { overflow: 'hidden', borderRadius: 16 },
  feed: { padding: 12 },
  compact: { padding: 10, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  art: { backgroundColor: colors.stage },
  info: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 17, fontFamily: fonts.bodyBold, lineHeight: 22 },
  titleCompact: { fontSize: 15, lineHeight: 20 },
  artist: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontFamily: fonts.bodyMedium, marginTop: 2 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  sourceText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: fonts.bodySemi },
  play: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOn: { backgroundColor: colors.amber },
});
