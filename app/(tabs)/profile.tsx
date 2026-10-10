import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import PostList from '../../components/PostList';
import ProfileHeader from '../../components/ProfileHeader';
import { Header, Loading, Screen } from '../../components/Screen';
import { colors } from '../../lib/theme';
import { confirm, errorMessage, notify } from '../../lib/ui';
import { useAuth } from '../../store/auth';

export default function MyProfileScreen() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const upgradeGuest = useAuth((s) => s.upgradeGuest);
  const [upgrading, setUpgrading] = useState(false);

  const logout = async () => {
    const warn = profile?.is_guest
      ? 'Guest accounts cannot be recovered after signing out. Save it with Google first to keep your posts.'
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
      notify('Could not link Google', errorMessage(e));
    } finally {
      setUpgrading(false);
    }
  };

  if (!profile) {
    return (
      <Screen>
        <Header title="Profile" />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Profile"
        right={
          <Pressable onPress={logout} hitSlop={10} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          </Pressable>
        }
      />
      <PostList
        scope="user"
        userId={profile.id}
        emptyText="You haven't shared anything yet"
        header={
          <View>
            <ProfileHeader
              profile={profile}
              actions={<Button title="Edit profile" variant="ghost" onPress={() => router.push('/edit-profile')} style={{ flex: 1 }} />}
            />
            {profile.is_guest && (
              <View style={styles.guest}>
                <Ionicons name="alert-circle-outline" size={22} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestTitle}>You're using a guest account</Text>
                  <Text style={styles.guestText}>Link Google to keep your posts and sign in on other devices.</Text>
                </View>
              </View>
            )}
            {profile.is_guest && (
              <Button title="Save account with Google" onPress={upgrade} loading={upgrading} style={{ marginBottom: 16 }} />
            )}
            <Text style={styles.section}>Your posts</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  guest: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  guestTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  guestText: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  section: { color: colors.textFaint, fontWeight: '600', fontSize: 14, marginBottom: 10 },
});
