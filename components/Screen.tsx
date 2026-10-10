import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, MAX_WIDTH } from '../lib/theme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}

export function Header({
  title,
  back,
  right,
  children,
  wordmark,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
  children?: ReactNode;
  wordmark?: boolean;
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        {back && (
          <Pressable hitSlop={12} onPress={goBack} style={styles.back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
        )}
        <Text
          style={[styles.title, wordmark && styles.wordmark, back && styles.titleSmall]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
      {children && <View style={styles.headerExtra}>{children}</View>}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.amber} />
    </View>
  );
}

export function Empty({
  emoji,
  title,
  text,
  action,
}: {
  emoji?: string;
  title?: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {emoji && <Text style={styles.emptyEmoji}>{emoji}</Text>}
      {title && <Text style={styles.emptyTitle}>{title}</Text>}
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stage },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  headerWrap: { backgroundColor: colors.stage, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8, minHeight: 54 },
  back: { marginLeft: -6 },
  title: { flex: 1, fontSize: 20, fontFamily: fonts.displaySemi, color: colors.ink },
  wordmark: { fontSize: 24, fontFamily: fonts.display, color: colors.amber, letterSpacing: -0.5 },
  titleSmall: { fontSize: 17 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerExtra: { paddingBottom: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { paddingVertical: 56, paddingHorizontal: 32, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.displaySemi, textAlign: 'center' },
  emptyText: { color: colors.haze, fontSize: 15, fontFamily: fonts.body, textAlign: 'center', lineHeight: 22, maxWidth: 340 },
});
