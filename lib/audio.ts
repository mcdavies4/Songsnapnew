import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// One preview at a time across the whole app.
let player: AudioPlayer | null = null;
let currentKey: string | null = null;
const listeners = new Set<(key: string | null) => void>();
let modeSet = false;

function emit() {
  listeners.forEach((l) => l(currentKey));
}

export function subscribe(listener: (key: string | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function stopPreview() {
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {
      /* already released */
    }
  }
  player = null;
  currentKey = null;
  emit();
}

export async function togglePreview(key: string, uri: string) {
  if (currentKey === key) {
    stopPreview();
    return;
  }
  stopPreview();

  if (!modeSet) {
    modeSet = true;
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }

  const p = createAudioPlayer({ uri });
  player = p;
  currentKey = key;
  emit();

  p.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish && player === p) stopPreview();
  });
  p.play();
}
