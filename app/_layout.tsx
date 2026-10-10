import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configError } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useAuth } from '../store/auth';

function Problem({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <ScrollView style={{ backgroundColor: colors.stage }} contentContainerStyle={styles.problem}>
      <Ionicons name="warning-outline" size={48} color={colors.danger} />
      <Text style={styles.problemTitle}>{title}</Text>
      <Text style={styles.problemDetail} selectable>
        {detail}
      </Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// Any crash in a screen shows the real error instead of a blank page.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <Problem title="Something went wrong" detail={error?.message ?? String(error)} onRetry={retry} />;
}

export default function RootLayout() {
  const ready = useAuth((s) => s.ready);
  const init = useAuth((s) => s.init);
  // Fonts live in assets/fonts, not node_modules: Cloudflare Pages doesn't upload
  // folders named node_modules, so fonts referenced from there 404 on the live site.
  // Icon fonts are registered under the family names @expo/vector-icons uses.
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_600SemiBold: require('../assets/fonts/Unbounded_600SemiBold.ttf'),
    Unbounded_700Bold: require('../assets/fonts/Unbounded_700Bold.ttf'),
    Figtree_400Regular: require('../assets/fonts/Figtree_400Regular.ttf'),
    Figtree_500Medium: require('../assets/fonts/Figtree_500Medium.ttf'),
    Figtree_600SemiBold: require('../assets/fonts/Figtree_600SemiBold.ttf'),
    Figtree_700Bold: require('../assets/fonts/Figtree_700Bold.ttf'),
    ionicons: require('../assets/fonts/Ionicons.ttf'),
    FontAwesome: require('../assets/fonts/FontAwesome.ttf'),
  });

  useEffect(() => {
    if (configError) return;
    return init();
  }, [init]);

  let body;
  if (configError) {
    body = <Problem title="SongSnap isn't configured" detail={configError} />;
  } else if (!ready || (!fontsLoaded && !fontError)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.amber} />
      </View>
    );
  } else {
    body = <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.stage } }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.stage }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {body}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.stage },
  problem: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  problemTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  problemDetail: { color: colors.haze, fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 480 },
  retry: { marginTop: 8, backgroundColor: colors.amber, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  retryText: { color: colors.amberInk, fontWeight: '700' },
});
