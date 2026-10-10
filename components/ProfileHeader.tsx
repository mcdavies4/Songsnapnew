import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';
import type { Profile } from '../lib/types';
import Avatar from './Avatar';

export default function ProfileHeader({ profile, actions }: { profile: Profile; actions?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Avatar uri={profile.profile_pic} name={profile.name} size={96} />
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.username}>@{profile.username}</Text>
      {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      <View style={styles.stats}>
        <Stat n={profile.posts_count} label="Posts" />
        <Stat n={profile.followers_count} label="Followers" />
        <Stat n={profile.following_count} label="Following" />
      </View>

      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
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
  wrap: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
  },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 14 },
  username: { fontSize: 15, color: colors.textFaint, marginTop: 2 },
  bio: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 32, marginTop: 18 },
  stat: { alignItems: 'center' },
  statN: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch', justifyContent: 'center' },
});
