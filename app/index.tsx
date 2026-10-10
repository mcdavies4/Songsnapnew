import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Equalizer from '../components/Equalizer';
import { colors, fonts, REACTIONS } from '../lib/theme';
import { errorMessage, notify } from '../lib/ui';
import { useAuth } from '../store/auth';

const POINTS = [
  { emoji: '🎧', text: 'Share the song you have on repeat, and why it hits.' },
  { emoji: '💬', text: 'Talk about it: memories, favourite lines, better versions.' },
  { emoji: '🌙', text: 'Find music by moment, from late nights to Sunday mornings.' },
];

export default function Welcome() {
  const session = useAuth((s) => s.session);
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const signInAsGuest = useAuth((s) => s.signInAsGuest);
  const [busy, setBusy] = useState<'google' | 'guest' | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  const run = async (which: 'google' | 'guest') => {
    setBusy(which);
    try {
      if (which === 'google') await signInWithGoogle();
      else await signInAsGuest();
    } catch (e) {
      notify("Couldn't sign you in", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Equalizer playing size={56} />
          <Text style={styles.wordmark}>SongSnap</Text>
          <Text style={styles.tagline}>What's on repeat? Tell people why.</Text>
          <Text style={styles.reactions} accessibilityElementsHidden>
            {REACTIONS.map((r) => r.emoji).join('  ')}
          </Text>
        </View>

        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.emoji} style={styles.point}>
              <Text style={styles.pointEmoji}>{p.emoji}</Text>
              <Text style={styles.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <Button title="Continue with Google" onPress={() => run('google')} loading={busy === 'google'} disabled={!!busy} />
          <Button
            title="Look around as a guest"
            variant="outline"
            onPress={() => run('guest')}
            loading={busy === 'guest'}
            disabled={!!busy}
          />
          <Text style={styles.hint}>Guests can save their account with Google later and keep their posts.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stage },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40, width: '100%', maxWidth: 460, alignSelf: 'center' },
  hero: { alignItems: 'flex-start', marginTop: 24 },
  wordmark: { fontFamily: fonts.display, fontSize: 46, color: colors.amber, letterSpacing: -1.5, marginTop: 22 },
  tagline: { fontFamily: fonts.displaySemi, fontSize: 21, lineHeight: 29, color: colors.ink, marginTop: 10 },
  reactions: { fontSize: 22, marginTop: 18 },
  points: { marginTop: 36, gap: 16 },
  point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pointEmoji: { fontSize: 20, width: 28 },
  pointText: { flex: 1, color: colors.haze, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  buttons: { marginTop: 40, gap: 12 },
  hint: { color: colors.dim, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 19 },
});
