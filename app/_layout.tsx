import { Ionicons } from '@expo/vector-icons';
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
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.problem}>
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

  useEffect(() => {
    if (configError) return;
    return init();
  }, [init]);

  let body;
  if (configError) {
    body = <Problem title="SongSnap isn't configured" detail={configError} />;
  } else if (!ready) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  } else {
    body = <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {body}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  problem: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  problemTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  problemDetail: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 480 },
  retry: { marginTop: 8, backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  retryText: { color: colors.bg, fontWeight: '700' },
});
