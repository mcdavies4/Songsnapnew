import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { colors, MAX_WIDTH } from '../lib/theme';
import { errorMessage, notify } from '../lib/ui';
import { useAuth } from '../store/auth';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'musical-notes', title: 'Share songs', text: 'Post tracks from Spotify or YouTube with a caption' },
  { icon: 'people', title: 'Connect', text: 'Follow friends and discover their taste' },
  { icon: 'heart', title: 'Engage', text: 'Like and comment on what people are playing' },
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
      notify('Sign-in failed', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Ionicons name="musical-note" size={40} color={colors.bg} />
          </View>
          <Text style={styles.title}>SongSnap</Text>
          <Text style={styles.subtitle}>Share your sound</Text>
        </View>

        <Text style={styles.description}>
          Connect through music. Share what you're listening to, discover new tracks, and vibe with a community of
          music lovers.
        </Text>

        <View style={styles.buttons}>
          <Button title="Continue with Google" onPress={() => run('google')} loading={busy === 'google'} disabled={!!busy} />
          <Button title="Try as guest" variant="outline" onPress={() => run('guest')} loading={busy === 'guest'} disabled={!!busy} />
          <Text style={styles.hint}>Guests can save their account with Google later.</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <Ionicons name={f.icon} size={26} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingBottom: 48, width: '100%', maxWidth: 460, alignSelf: 'center' },
  logoWrap: { alignItems: 'center', marginTop: 48 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 34, fontWeight: 'bold', color: colors.accent },
  subtitle: { fontSize: 18, color: colors.text, fontWeight: '600', marginTop: 4 },
  description: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24, marginTop: 28 },
  buttons: { marginTop: 32, gap: 12, alignSelf: 'stretch', maxWidth: MAX_WIDTH },
  hint: { color: colors.textFaint, fontSize: 13, textAlign: 'center', marginTop: 4 },
  features: { marginTop: 40, gap: 12 },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
  },
  featureTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  featureText: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
});
