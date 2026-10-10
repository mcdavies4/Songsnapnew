import { FontAwesome } from '@expo/vector-icons';
import type { MusicSource } from '../lib/types';

export default function SourceIcon({ source, size, color }: { source: MusicSource; size: number; color: string }) {
  return <FontAwesome name={source === 'youtube' ? 'youtube-play' : 'spotify'} size={size} color={color} />;
}
