import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { useAuth } from '../store/auth';

export default function RootLayout() {
  const ready = useAuth((s) => s.ready);
  const init = useAuth((s) => s.init);

  useEffect(() => init(), [init]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {ready ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
