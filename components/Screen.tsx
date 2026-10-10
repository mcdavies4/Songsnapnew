import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, MAX_WIDTH } from '../lib/theme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

export function Header({
  title,
  back,
  right,
  children,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        {back && (
        <Pressable
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.back}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      )}
        <Text style={[styles.title, back && styles.titleSmall]} numberOfLines={1}>
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
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export function Empty({ icon, text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      {icon && <Ionicons name={icon} size={56} color={colors.surfaceAlt} />}
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  headerWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerExtra: { paddingHorizontal: 16, paddingBottom: 14 },
  back: { marginLeft: -6 },
  title: { flex: 1, fontSize: 24, fontWeight: 'bold', color: colors.accent },
  titleSmall: { fontSize: 18, color: colors.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { padding: 40, alignItems: 'center', gap: 16 },
  emptyText: { color: colors.textFaint, fontSize: 16, textAlign: 'center' },
});
