import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import PostList from '../../components/PostList';
import ProfileHeader from '../../components/ProfileHeader';
import { Empty, Header, Loading, Screen } from '../../components/Screen';
import { follow, getProfile, isFollowing, unfollow } from '../../lib/api';
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [glow, setGlow] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !myId || id === myId) return;
    let alive = true;
    Promise.all([getProfile(id), isFollowing(myId, id)])
      .then(([p, f]) => {
        if (!alive) return;
        setProfile(p);
        setFollowing(f);
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

  return (
    <Screen>
      <Header title={profile ? `@${profile.username}` : 'Profile'} back />
      {error ? (
        <Empty emoji="🫥" title="Profile not found" text="This account may have been deleted." />
      ) : !profile ? (
        <Loading />
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
