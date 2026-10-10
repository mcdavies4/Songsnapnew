import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export default function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[style, styles.img]} contentFit="cover" transition={150} />;
  }
  const initial = (name?.trim()?.[0] ?? '♪').toUpperCase();
  return (
    <View style={[style, styles.fallback]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.surfaceAlt },
  fallback: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.bg, fontWeight: '700' },
});
