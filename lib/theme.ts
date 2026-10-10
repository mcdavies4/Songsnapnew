// SongSnap design tokens.
// Night-stage palette: the colour in the feed comes from album art; the chrome stays quiet.

export const colors = {
  stage: '#151021', // app background
  booth: '#1E1830', // panels, inputs
  riser: '#2A2240', // raised / pressed
  line: '#342B4D', // hairlines
  ink: '#F4EFFA', // primary text
  haze: '#ABA2C2', // secondary text
  dim: '#7D7496', // tertiary text, placeholders
  amber: '#FFB23F', // primary actions, active states
  amberInk: '#2A1A00', // text on amber
  rose: '#FF5D8F', // reactions
  danger: '#FF6B6B',
  spotify: '#1DB954',
  youtube: '#FF3D3D',
  scrim: 'rgba(21,16,33,0.5)', // darkens blurred album art
};

export const fonts = {
  display: 'Unbounded_700Bold',
  displaySemi: 'Unbounded_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
};

export const MAX_WIDTH = 640;

export type MoodKey =
  | 'late_night'
  | 'on_repeat'
  | 'gym'
  | 'commute'
  | 'heartbreak'
  | 'party'
  | 'focus'
  | 'throwback'
  | 'sunday'
  | 'discovery';

export const MOODS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: 'late_night', emoji: '🌙', label: 'Late night' },
  { key: 'on_repeat', emoji: '🔂', label: "Can't stop playing" },
  { key: 'discovery', emoji: '✨', label: 'New find' },
  { key: 'heartbreak', emoji: '💔', label: 'Heartbreak' },
  { key: 'party', emoji: '🎉', label: 'Party' },
  { key: 'gym', emoji: '🏋️', label: 'Gym' },
  { key: 'commute', emoji: '🚌', label: 'Commute' },
  { key: 'focus', emoji: '🎧', label: 'Focus' },
  { key: 'throwback', emoji: '📼', label: 'Throwback' },
  { key: 'sunday', emoji: '☀️', label: 'Sunday' },
];

export const moodOf = (key?: string | null) => MOODS.find((m) => m.key === key) ?? null;

export type ReactionKey = 'love' | 'fire' | 'repeat' | 'feels' | 'vibe';

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'love', emoji: '❤️', label: 'Love it' },
  { key: 'repeat', emoji: '🔁', label: 'On repeat' },
  { key: 'feels', emoji: '🥹', label: 'In my feels' },
  { key: 'vibe', emoji: '💃', label: 'Vibing' },
];

export const reactionOf = (key?: string | null) => REACTIONS.find((r) => r.key === key) ?? null;
