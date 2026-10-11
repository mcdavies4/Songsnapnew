import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { showSheet } from '../../components/ActionSheet';
import Button from '../../components/Button';
import PostList from '../../components/PostList';
import ProfileHeader from '../../components/ProfileHeader';
import { Empty, Header, Loading, Screen } from '../../components/Screen';
import { follow, getProfile, isFollowing, unfollow } from '../../lib/api';
import { blockFlow, isBlocked, unblockUser } from '../../lib/safety';
import { colors, fonts } from '../../lib/theme';
import type { Profile } from '../../lib/types';
import { errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuth((s) => s.session);
  const refreshMe = useAuth((s) => s.refreshProfile);
  const myId = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [glow, setGlow] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !myId || id === myId) return;
    let alive = true;
    Promise.all([getProfile(id), isFollowing(myId, id), isBlocked(id)])
      .then(([p, f, b]) => {
        if (!alive) return;
        setProfile(p);
        setFollowing(f);
        setBlocked(b);
      })
      .catch((e) => alive && setError(errorMessage(e, 'User not found')));
    return () => {
      alive = false;
    };
  }, [id, myId]);

  if (!session) return <Redirect href="/" />;
  if (id === myId) return <Redirect href="/(tabs)/profile" />;

  const toggleFollow = async () => {
    if (!profile || !myId) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    setProfile({ ...profile, followers_count: profile.followers_count + (next ? 1 : -1) });
    try {
      if (next) await follow(myId, profile.id);
      else await unfollow(myId, profile.id);
      refreshMe();
    } catch (e) {
      setFollowing(!next);
      setProfile((p) => (p ? { ...p, followers_count: p.followers_count + (next ? -1 : 1) } : p));
      notify("Couldn't update follow", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const unblock = async () => {
    if (!myId || !profile) return;
    try {
      await unblockUser(myId, profile.id);
      setBlocked(false);
    } catch (e) {
      notify("Couldn't unblock", errorMessage(e));
    }
  };

  const openMenu = () => {
    if (!myId || !profile) return;
    showSheet(
      profile.name,
      blocked
        ? [{ label: `Unblock ${profile.name}`, onPress: unblock }]
        : [
            {
              label: `Block ${profile.name}`,
              destructive: true,
              hint: "Hide everything they post. They won't be told.",
              onPress: async () => {
                const done = await blockFlow(myId, { id: profile.id, name: profile.name });
                if (done) {
                  setBlocked(true);
                  if (following) {
                    setFollowing(false);
                    setProfile((p) => (p ? { ...p, followers_count: Math.max(0, p.followers_count - 1) } : p));
                    refreshMe();
                  }
                }
              },
            },
          ]
    );
  };

  return (
    <Screen>
      <Header
        title={profile ? `@${profile.username}` : 'Profile'}
        back
        right={
          profile ? (
            <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="More options">
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.haze} />
            </Pressable>
          ) : null
        }
      />
      {error ? (
        <Empty emoji="🫥" title="Profile not found" text="This account may have been deleted." />
      ) : !profile ? (
        <Loading />
      ) : blocked ? (
        <Empty
          emoji="🚫"
          title={`You blocked ${profile.name}`}
          text="You won't see their posts or comments."
          action={<Button title="Unblock" variant="quiet" onPress={unblock} style={{ marginTop: 10 }} />}
        />
      ) : (
        <PostList
          query={{ scope: 'user', userId: profile.id }}
          onFirstPost={(p) => setGlow(p?.song_data.image_url ?? null)}
          empty={<Empty emoji="🎧" text={`${profile.name} hasn't shared a song yet.`} />}
          header={
            <View>
              <ProfileHeader
                profile={profile}
                glowUri={glow}
                actions={
                  <Button
                    title={following ? 'Following' : 'Follow'}
                    variant={following ? 'quiet' : 'primary'}
                    onPress={toggleFollow}
                    disabled={busy}
                    style={{ flex: 1, maxWidth: 240, ...(following ? { backgroundColor: 'rgba(255,255,255,0.14)' } : {}) }}
                  />
                }
              />
              <Text style={styles.section}>Songs {profile.name.split(' ')[0]} has shared</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 15, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 4 },
});
