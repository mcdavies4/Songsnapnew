import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

// Stable per-person tint so initials avatars aren't all the same colour.
const TINTS = ['#FFB23F', '#FF5D8F', '#8B7CFF', '#3DD6C6', '#FF8A4C', '#C38BFF'];
function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export default function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[style, styles.img]} contentFit="cover" transition={150} />;
  }
  const initial = (name?.trim()?.[0] ?? '♪').toUpperCase();
  return (
    <View style={[style, styles.fallback, { backgroundColor: tintFor(name ?? '') }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.riser },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.stage, fontFamily: fonts.display },
});
