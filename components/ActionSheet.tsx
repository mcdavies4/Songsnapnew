import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, fonts, MAX_WIDTH } from '../lib/theme';

export type SheetOption = { label: string; onPress: () => void; destructive?: boolean; hint?: string };

type SheetState = {
  title: string | null;
  message?: string;
  options: SheetOption[];
  open: (title: string, options: SheetOption[], message?: string) => void;
  close: () => void;
};

const useSheet = create<SheetState>((set) => ({
  title: null,
  options: [],
  open: (title, options, message) => set({ title, options, message }),
  close: () => set({ title: null, options: [], message: undefined }),
}));

/** Opens a bottom sheet of choices. Works the same on iOS, Android and web. */
export function showSheet(title: string, options: SheetOption[], message?: string) {
  useSheet.getState().open(title, options, message);
}

/** Mount once at the app root. */
export function SheetHost() {
  const { title, message, options, close } = useSheet();
  return (
    <Modal visible={title !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.grabber} />
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          {options.map((o) => (
            <Pressable
              key={o.label}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.riser }]}
              onPress={() => {
                close();
                // Let the sheet close before any follow-up dialog opens.
                setTimeout(o.onPress, 120);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.optionText, o.destructive && { color: colors.danger }]}>{o.label}</Text>
              {!!o.hint && <Text style={styles.hint}>{o.hint}</Text>}
            </Pressable>
          ))}
          <Pressable style={[styles.option, styles.cancel]} onPress={close} accessibilityRole="button">
            <Text style={[styles.optionText, { color: colors.haze }]}>Cancel</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,5,14,0.65)' },
  sheet: {
    backgroundColor: colors.booth,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 8,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  title: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 16, paddingHorizontal: 20, paddingTop: 10 },
  message: { color: colors.haze, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, paddingHorizontal: 20, paddingTop: 6 },
  option: { paddingHorizontal: 20, paddingVertical: 15 },
  optionText: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 16 },
  hint: { color: colors.dim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  cancel: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, marginTop: 6 },
});
