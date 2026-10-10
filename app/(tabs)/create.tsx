import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import MoodChip from '../../components/MoodChip';
import { Header, Screen } from '../../components/Screen';
import Sleeve from '../../components/Sleeve';
import SourceIcon from '../../components/SourceIcon';
import { createPost, searchMusic, trackToSong } from '../../lib/api';
import { colors, fonts, MAX_WIDTH, MOODS, type MoodKey } from '../../lib/theme';
import type { MusicSource, SongData, Track } from '../../lib/types';
import { errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';
import { useDraft } from '../../store/draft';

const MAX_CAPTION = 500;

export default function CreateScreen() {
  const userId = useAuth((s) => s.session?.user.id);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const [caption, setCaption] = useState('');
  const [song, setSong] = useState<SongData | null>(null);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [posting, setPosting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // "Share your take" on a song page hands the song over via the draft store.
  useFocusEffect(
    useCallback(() => {
      const draft = useDraft.getState().song;
      if (draft) {
        setSong(draft);
        useDraft.getState().setSong(null);
      }
    }, [])
  );

  const canPost = !!song && caption.trim().length > 0 && !posting;

  const submit = async () => {
    if (!userId || !song) return;
    setPosting(true);
    try {
      await createPost(userId, caption.trim(), song, mood);
      setCaption('');
      setSong(null);
      setMood(null);
      refreshProfile();
      router.navigate('/(tabs)');
    } catch (e) {
      notify("Couldn't share your post", errorMessage(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Screen>
      <Header title="Share a song" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>What are you playing?</Text>
          {song ? (
            <Sleeve
              song={song}
              playKey="draft"
              linkToTrack={false}
              right={
                <Pressable onPress={() => setPickerOpen(true)} style={styles.change} accessibilityLabel="Change song">
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              }
            />
          ) : (
            <Pressable style={styles.pick} onPress={() => setPickerOpen(true)}>
              <View style={styles.pickIcon}>
                <Ionicons name="musical-notes" size={26} color={colors.amberInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickTitle}>Find a song</Text>
                <Text style={styles.pickText}>Search Spotify or YouTube</Text>
              </View>
              <Ionicons name="search" size={20} color={colors.haze} />
            </Pressable>
          )}

          <Text style={[styles.label, styles.gap]}>What's the moment?</Text>
          <View style={styles.moods}>
            {MOODS.map((m) => (
              <MoodChip key={m.key} mood={m.key} active={mood === m.key} onPress={() => setMood(mood === m.key ? null : m.key)} />
            ))}
          </View>

          <Text style={[styles.label, styles.gap]}>Tell people about it</Text>
          <TextInput
            style={styles.caption}
            placeholder="What does this song do for you? A memory, a lyric, the moment it hit…"
            placeholderTextColor={colors.dim}
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, MAX_CAPTION))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.count}>
            {caption.length}/{MAX_CAPTION}
          </Text>

          <Button title="Share" onPress={submit} loading={posting} disabled={!canPost} style={{ marginTop: 18 }} />
          {!canPost && !posting && (
            <Text style={styles.hint}>{!song ? 'Pick a song to share.' : 'Add a few words so people can join in.'}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SongPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(t) => {
          setSong(trackToSong(t));
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function SongPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (t: Track) => void }) {
  const [source, setSource] = useState<MusicSource>('spotify');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async (src = source) => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      setResults(await searchMusic(q, src));
      setSearched(true);
    } catch (e) {
      notify('Search failed', errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const switchSource = (src: MusicSource) => {
    setSource(src);
    setResults([]);
    setSearched(false);
    if (query.trim().length >= 2) run(src);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close search" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Find a song</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.sources}>
            {(['spotify', 'youtube'] as MusicSource[]).map((s) => {
              const active = source === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => switchSource(s)}
                  style={[styles.sourceTab, active && styles.sourceOn]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <SourceIcon source={s} size={16} color={active ? (s === 'spotify' ? colors.spotify : colors.youtube) : colors.dim} />
                  <Text style={[styles.sourceText, active && { color: colors.ink }]}>{s === 'spotify' ? 'Spotify' : 'YouTube'}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={19} color={colors.dim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Song or artist"
              placeholderTextColor={colors.dim}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => run()}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.amber} />
            ) : (
              <Pressable onPress={() => run()} hitSlop={8} accessibilityLabel="Search" style={styles.go}>
                <Ionicons name="arrow-forward" size={18} color={colors.amberInk} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={results}
            keyExtractor={(t) => `${t.source}:${t.id}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable style={({ pressed }) => [styles.track, pressed && { backgroundColor: colors.riser }]} onPress={() => onPick(item)}>
                <Image source={item.image_url ? { uri: item.image_url } : undefined} style={styles.trackArt} contentFit="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artist}
                    {item.album ? `  ${item.album}` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={26} color={colors.amber} />
              </Pressable>
            )}
            ListEmptyComponent={
              searched && !searching ? (
                <Text style={styles.noResults}>No songs found. Try the artist's name, or switch source.</Text>
              ) : null
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 15, fontFamily: fonts.displaySemi, color: colors.ink, marginBottom: 12 },
  gap: { marginTop: 28 },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.booth,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  pickIcon: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  pickTitle: { fontSize: 16, color: colors.ink, fontFamily: fonts.bodyBold },
  pickText: { fontSize: 13.5, color: colors.haze, fontFamily: fonts.body, marginTop: 2 },
  change: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  changeText: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 13.5 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caption: {
    backgroundColor: colors.booth,
    borderRadius: 16,
    padding: 16,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontFamily: fonts.body,
    minHeight: 130,
  },
  count: { color: colors.dim, fontSize: 12, fontFamily: fonts.body, textAlign: 'right', marginTop: 6 },
  hint: { color: colors.dim, fontSize: 13, fontFamily: fonts.body, textAlign: 'center', marginTop: 10 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,5,14,0.7)' },
  sheet: {
    backgroundColor: colors.booth,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { fontSize: 19, fontFamily: fonts.display, color: colors.ink },
  sources: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  sourceTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceOn: { backgroundColor: colors.riser, borderColor: colors.riser },
  sourceText: { color: colors.dim, fontSize: 14, fontFamily: fonts.bodySemi },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stage,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    height: 50,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 16, fontFamily: fonts.body, height: '100%' },
  go: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  track: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 20 },
  trackArt: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.stage },
  trackTitle: { fontSize: 15.5, fontFamily: fonts.bodySemi, color: colors.ink },
  trackArtist: { fontSize: 13.5, fontFamily: fonts.body, color: colors.haze, marginTop: 2 },
  noResults: { color: colors.haze, fontFamily: fonts.body, textAlign: 'center', padding: 40, lineHeight: 21 },
});
