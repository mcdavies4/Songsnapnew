import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

// Bouncing bars shown only while a preview is playing (motion answers the tap).
export default function Equalizer({ playing, color = colors.amber, size = 16 }: { playing: boolean; color?: string; size?: number }) {
  const bars = useRef([0.4, 0.8, 0.55, 0.7].map((v) => new Animated.Value(v))).current;
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  useEffect(() => {
    if (!playing || reduce) {
      bars.forEach((b, i) => b.setValue([0.4, 0.8, 0.55, 0.7][i]));
      return;
    }
    const loops = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 260 + i * 70, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(b, { toValue: 0.25, duration: 300 + i * 50, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, reduce, bars]);

  const w = Math.max(2, Math.round(size / 6));
  return (
    <View style={[styles.row, { height: size, gap: w * 0.7 }]} accessibilityElementsHidden importantForAccessibility="no">
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: w,
            borderRadius: w,
            backgroundColor: color,
            height: b.interpolate({ inputRange: [0, 1], outputRange: [2, size] }),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end' } });
