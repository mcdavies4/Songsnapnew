import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';
import type { Profile } from '../lib/types';
import Avatar from './Avatar';
import { ArtGlow } from './Sleeve';

export default function ProfileHeader({
  profile,
  actions,
  glowUri,
}: {
  profile: Profile;
  actions?: ReactNode;
  /** Album art of their latest post, used when they have no photo. */
  glowUri?: string | null;
}) {
  return (
    <ArtGlow uri={profile.profile_pic ?? glowUri} style={styles.glow}>
      <View style={styles.wrap}>
        <Avatar uri={profile.profile_pic} name={profile.name} size={92} />
        <Text style={styles.name} numberOfLines={2}>
          {profile.name}
        </Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.stats}>
          <Stat n={profile.posts_count} label={profile.posts_count === 1 ? 'song shared' : 'songs shared'} />
          <Stat n={profile.followers_count} label={profile.followers_count === 1 ? 'follower' : 'followers'} />
          <Stat n={profile.following_count} label="following" />
        </View>

        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </ArtGlow>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { borderRadius: 0 },
  wrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22 },
  name: { fontSize: 22, fontFamily: fonts.display, color: '#fff', marginTop: 14, textAlign: 'center' },
  username: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: fonts.bodyMedium, marginTop: 4 },
  bio: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: 420,
  },
  stats: { flexDirection: 'row', gap: 28, marginTop: 20 },
  stat: { alignItems: 'center' },
  statN: { fontSize: 20, fontFamily: fonts.display, color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: fonts.body, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch', justifyContent: 'center' },
});
