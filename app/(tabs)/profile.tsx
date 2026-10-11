import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { showSheet } from '../../components/ActionSheet';
import Button from '../../components/Button';
import PostList from '../../components/PostList';
import ProfileHeader from '../../components/ProfileHeader';
import { Empty, Header, Loading, Screen } from '../../components/Screen';
import { colors, fonts } from '../../lib/theme';
import { deleteAccountFlow } from '../../lib/safety';
import { confirm, errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';

export default function MyProfileScreen() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const upgradeGuest = useAuth((s) => s.upgradeGuest);
  const [upgrading, setUpgrading] = useState(false);
  const [glow, setGlow] = useState<string | null>(null);

  const logout = async () => {
    const warn = profile?.is_guest
      ? "Guest accounts can't be recovered after signing out. Save it with Google first to keep your posts."
      : 'You can sign back in any time.';
    if (await confirm('Sign out?', warn, 'Sign out', true)) {
      await signOut();
      router.replace('/');
    }
  };

  const upgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeGuest();
    } catch (e) {
      notify("Couldn't link Google", errorMessage(e));
    } finally {
      setUpgrading(false);
    }
  };

  const openSettings = () =>
    showSheet('Account', [
      { label: 'Edit profile', onPress: () => router.push('/edit-profile') },
      { label: 'Terms and community guidelines', onPress: () => router.push('/terms') },
      { label: 'Privacy policy', onPress: () => router.push('/privacy') },
      { label: 'Sign out', onPress: logout },
      {
        label: 'Delete account',
        destructive: true,
        hint: 'Permanently removes your profile and everything you posted.',
        onPress: () => deleteAccountFlow(signOut),
      },
    ]);

  if (!profile) {
    return (
      <Screen>
        <Header title="You" />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="You"
        right={
          <Pressable onPress={openSettings} hitSlop={10} accessibilityLabel="Account settings">
            <Ionicons name="settings-outline" size={22} color={colors.haze} />
          </Pressable>
        }
      />
      <PostList
        query={{ scope: 'user', userId: profile.id }}
        onFirstPost={(p) => setGlow(p?.song_data.image_url ?? null)}
        empty={
          <Empty
            emoji="🎙️"
            title="Your stage is waiting"
            text="Share a song and tell people what it means to you."
            action={<Button title="Share a song" onPress={() => router.navigate('/(tabs)/create')} style={{ marginTop: 10 }} />}
          />
        }
        header={
          <View>
            <ProfileHeader
              profile={profile}
              glowUri={glow}
              actions={
                <Button
                  title="Edit profile"
                  variant="quiet"
                  onPress={() => router.push('/edit-profile')}
                  style={{ flex: 1, maxWidth: 240, backgroundColor: 'rgba(255,255,255,0.14)' }}
                />
              }
            />
            {profile.is_guest && (
              <View style={styles.guest}>
                <Text style={styles.guestTitle}>You're using a guest account</Text>
                <Text style={styles.guestText}>Link Google to keep your posts and sign in on other devices.</Text>
                <Button title="Save account with Google" onPress={upgrade} loading={upgrading} style={{ marginTop: 12 }} />
              </View>
            )}
            <Text style={styles.section}>Songs you've shared</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  guest: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: colors.booth,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  guestTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15.5 },
  guestText: { color: colors.haze, fontFamily: fonts.body, fontSize: 14, marginTop: 4, lineHeight: 20 },
  section: {
    color: colors.ink,
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 4,
  },
});
