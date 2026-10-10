import { create } from 'zustand';
import type { SongData } from '../lib/types';

// Lets "Share your take" on a song page pre-fill the Create screen.
export const useDraft = create<{ song: SongData | null; setSong: (s: SongData | null) => void }>((set) => ({
  song: null,
  setSong: (song) => set({ song }),
}));
