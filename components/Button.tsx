import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts } from '../lib/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'quiet';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export default function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'quiet' && styles.quiet,
        off && (variant === 'primary' ? styles.disabledPrimary : styles.disabled),
        pressed && !off && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.amberInk : colors.amber} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, variant !== 'primary' && styles.textAlt, off && variant === 'primary' && styles.textOff]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.amber },
  outline: { borderWidth: 1.5, borderColor: colors.amber },
  quiet: { backgroundColor: colors.riser },
  disabled: { opacity: 0.4 },
  disabledPrimary: { backgroundColor: colors.riser },
  textOff: { color: colors.dim },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  text: { color: colors.amberInk, fontSize: 16, fontFamily: fonts.bodyBold },
  textAlt: { color: colors.ink },
});
