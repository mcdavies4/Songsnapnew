import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { Header, Screen } from '../../components/Screen';
import SourceIcon from '../../components/SourceIcon';
import { createPost, searchMusic } from '../../lib/api';
import { colors, MAX_WIDTH } from '../../lib/theme';
import type { MusicSource, Track } from '../../lib/types';
import { errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';

const MAX_CAPTION = 500;

export default function CreateScreen() {
  const userId = useAuth((s) => s.session?.user.id);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const [caption, setCaption] = useState('');
  const [song, setSong] = useState<Track | null>(null);
  const [posting, setPosting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canPost = !!song && caption.trim().length > 0 && !posting;

  const submit = async () => {
    if (!userId || !song) return;
    setPosting(true);
    try {
      await createPost(userId, caption.trim(), {
        title: song.title,
        artist: song.artist,
        album: song.album,
        image_url: song.image_url,
        preview_url: song.preview_url,
        external_url: song.external_url,
        source: song.source,
        track_id: song.id,
      });
      setCaption('');
      setSong(null);
      refreshProfile();
      router.navigate('/(tabs)');
    } catch (e) {
      notify('Could not post', errorMessage(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Screen>
      <Header title="Create post" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Song</Text>
          {song ? (
            <View style={styles.selected}>
              <Image source={song.image_url ? { uri: song.image_url } : undefined} style={styles.selectedArt} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {song.artist}
                </Text>
              </View>
              <Pressable onPress={() => setSong(null)} hitSlop={8} accessibilityLabel="Remove song">
                <Ionicons name="close-circle" size={28} color={colors.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.pick} onPress={() => setPickerOpen(true)}>
              <Ionicons name="musical-notes" size={24} color={colors.accent} />
              <Text style={styles.pickText}>Search for a song</Text>
            </Pressable>
          )}

          <Text style={[styles.label, { marginTop: 24 }]}>Caption</Text>
          <TextInput
            style={styles.caption}
            placeholder="What's this song doing for you?"
            placeholderTextColor={colors.textFaint}
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, MAX_CAPTION))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.count}>
            {caption.length}/{MAX_CAPTION}
          </Text>

          <Button title="Post" onPress={submit} loading={posting} disabled={!canPost} style={{ marginTop: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SongPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(t) => {
          setSong(t);
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function SongPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (t: Track) => void;
}) {
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
      notify('Search error', errorMessage(e));
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Search music</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.sources}>
            {(['spotify', 'youtube'] as MusicSource[]).map((s) => {
              const active = source === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => switchSource(s)}
                  style={[styles.sourceTab, active && (s === 'spotify' ? styles.sourceSpotify : styles.sourceYt)]}
                >
                  <SourceIcon source={s} size={18} color={active ? '#fff' : colors.textFaint} />
                  <Text style={[styles.sourceText, active && { color: '#fff' }]}>
                    {s === 'spotify' ? 'Spotify' : 'YouTube'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Song or artist…"
              placeholderTextColor={colors.textFaint}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => run()}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Pressable onPress={() => run()} hitSlop={8} accessibilityLabel="Search">
                <Ionicons name="arrow-forward-circle" size={26} color={colors.accent} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={results}
            keyExtractor={(t) => `${t.source}:${t.id}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable style={styles.track} onPress={() => onPick(item)}>
                <Image source={item.image_url ? { uri: item.image_url } : undefined} style={styles.trackArt} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                  {!!item.album && (
                    <Text style={styles.trackAlbum} numberOfLines={1}>
                      {item.album}
                    </Text>
                  )}
                </View>
                {item.preview_url && <Ionicons name="volume-medium-outline" size={18} color={colors.accent} />}
              </Pressable>
            )}
            ListEmptyComponent={
              searched && !searching ? <Text style={styles.noResults}>No results found</Text> : null
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  pickText: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
  },
  selectedArt: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.surfaceAlt },
  caption: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    minHeight: 120,
  },
  count: { color: colors.textFaint, fontSize: 12, textAlign: 'right', marginTop: 6 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 18,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  sources: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  sourceTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  sourceSpotify: { backgroundColor: colors.accent },
  sourceYt: { backgroundColor: colors.youtube },
  sourceText: { color: colors.textFaint, fontSize: 14, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, height: '100%' },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
  },
  trackArt: { width: 50, height: 50, borderRadius: 6, backgroundColor: colors.bg },
  trackTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  trackArtist: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  trackAlbum: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  noResults: { color: colors.textFaint, textAlign: 'center', padding: 40 },
});
