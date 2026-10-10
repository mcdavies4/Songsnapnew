import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        off && styles.disabled,
        pressed && !off && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.accent} />
      ) : (
        <Text style={[styles.text, variant !== 'primary' && styles.textAlt]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: { backgroundColor: colors.accent },
  outline: { borderWidth: 2, borderColor: colors.accent },
  ghost: { backgroundColor: colors.surfaceAlt },
  disabled: { opacity: 0.45 },
  text: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  textAlt: { color: colors.accent },
});
