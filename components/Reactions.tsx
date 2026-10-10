import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clearReaction, setReaction } from '../lib/api';
import { colors, fonts, REACTIONS, reactionOf, type ReactionKey } from '../lib/theme';
import { errorMessage, notify } from '../lib/ui';

type Counts = Partial<Record<ReactionKey, number>>;

export function useReaction(
  userId: string | undefined,
  postId: string,
  initial: { mine: ReactionKey | null; counts: Counts; total: number }
) {
  const [mine, setMine] = useState(initial.mine);
  const [counts, setCounts] = useState<Counts>(initial.counts);
  const [total, setTotal] = useState(initial.total);
  const [busy, setBusy] = useState(false);

  const apply = async (next: ReactionKey | null) => {
    if (!userId || busy || next === mine) return;
    const prev = { mine, counts, total };
    const c = { ...counts };
    if (mine) c[mine] = Math.max(0, (c[mine] ?? 0) - 1);
    if (next) c[next] = (c[next] ?? 0) + 1;
    setMine(next);
    setCounts(c);
    setTotal(total + (next && !mine ? 1 : !next && mine ? -1 : 0));
    setBusy(true);
    try {
      if (next) await setReaction(userId, postId, next, !!prev.mine);
      else await clearReaction(userId, postId);
    } catch (e) {
      setMine(prev.mine);
      setCounts(prev.counts);
      setTotal(prev.total);
      notify("Couldn't save your reaction", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return { mine, counts, total, apply };
}

/** The top reactions on a post, e.g. 🔥❤️ 14 */
export function ReactionSummary({ counts, total }: { counts: Counts; total: number }) {
  if (total <= 0) return null;
  const top = REACTIONS.filter((r) => (counts[r.key] ?? 0) > 0)
    .sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0))
    .slice(0, 3);
  return (
    <View style={styles.summary} accessibilityLabel={`${total} reactions`}>
      <Text style={styles.summaryEmoji}>{top.map((r) => r.emoji).join('')}</Text>
      <Text style={styles.summaryCount}>{total}</Text>
    </View>
  );
}

/** Row of five reactions; the chosen one is highlighted and tapping it again removes it. */
export function ReactionPicker({ mine, onPick }: { mine: ReactionKey | null; onPick: (k: ReactionKey | null) => void }) {
  return (
    <View style={styles.picker} accessibilityRole="radiogroup">
      {REACTIONS.map((r) => {
        const on = mine === r.key;
        return (
          <Pressable
            key={r.key}
            onPress={() => onPick(on ? null : r.key)}
            style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && { transform: [{ scale: 1.12 }] }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={r.label}
          >
            <Text style={styles.optionEmoji}>{r.emoji}</Text>
            <Text style={[styles.optionLabel, on && styles.optionLabelOn]} numberOfLines={1}>
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReactButton({ mine, onPress }: { mine: ReactionKey | null; onPress: () => void }) {
  const r = reactionOf(mine);
  return (
    <Pressable onPress={onPress} style={styles.action} hitSlop={6} accessibilityLabel={r ? `Your reaction: ${r.label}` : 'React'}>
      <Text style={styles.actionEmoji}>{r ? r.emoji : '🤍'}</Text>
      <Text style={[styles.actionText, r && { color: colors.rose }]}>{r ? r.label : 'React'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryEmoji: { fontSize: 15, letterSpacing: -2 },
  summaryCount: { color: colors.haze, fontSize: 14, fontFamily: fonts.bodySemi },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.booth,
    borderRadius: 18,
    padding: 6,
    marginTop: 10,
    gap: 4,
  },
  option: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, gap: 3 },
  optionOn: { backgroundColor: colors.riser },
  optionEmoji: { fontSize: 24 },
  optionLabel: { color: colors.dim, fontSize: 10.5, fontFamily: fonts.bodySemi },
  optionLabelOn: { color: colors.rose },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionEmoji: { fontSize: 18 },
  actionText: { color: colors.haze, fontSize: 14, fontFamily: fonts.bodySemi },
});
