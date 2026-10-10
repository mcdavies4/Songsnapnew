import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, moodOf } from '../lib/theme';

export default function MoodChip({
  mood,
  active,
  onPress,
  label,
  emoji,
  size = 'md',
}: {
  mood?: string | null;
  active?: boolean;
  onPress?: () => void;
  label?: string;
  emoji?: string;
  size?: 'sm' | 'md';
}) {
  const m = moodOf(mood);
  const text = label ?? m?.label;
  const icon = emoji ?? m?.emoji;
  if (!text) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        size === 'sm' && styles.sm,
        active && styles.active,
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!active } : undefined}
    >
      {icon && <Text style={size === 'sm' ? styles.emojiSm : styles.emoji}>{icon}</Text>}
      <Text style={[styles.text, size === 'sm' && styles.textSm, active && styles.textActive]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.booth,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sm: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', backgroundColor: 'transparent' },
  active: { backgroundColor: colors.amber, borderColor: colors.amber },
  emoji: { fontSize: 15 },
  emojiSm: { fontSize: 12 },
  text: { color: colors.ink, fontSize: 14, fontFamily: fonts.bodySemi },
  textSm: { fontSize: 12, color: colors.haze },
  textActive: { color: colors.amberInk },
});
