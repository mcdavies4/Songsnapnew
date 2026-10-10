import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import PostList from '../../components/PostList';
import ProfileHeader from '../../components/ProfileHeader';
import { Empty, Header, Loading, Screen } from '../../components/Screen';
import { follow, getProfile, isFollowing, unfollow } from '../../lib/api';
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
      notify('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={profile ? `@${profile.username}` : 'Profile'} back />
      {error ? (
        <Empty icon="person-outline" text={error} />
      ) : !profile ? (
        <Loading />
      ) : (
        <PostList
          scope="user"
          userId={profile.id}
          emptyText={`${profile.name} hasn't shared anything yet`}
          header={
            <ProfileHeader
              profile={profile}
              actions={
                <Button
                  title={following ? 'Following' : 'Follow'}
                  variant={following ? 'outline' : 'primary'}
                  onPress={toggleFollow}
                  disabled={busy}
                  style={{ flex: 1, maxWidth: 260 }}
                />
              }
            />
          }
        />
      )}
    </Screen>
  );
}
