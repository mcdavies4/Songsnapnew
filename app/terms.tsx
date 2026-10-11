import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header, Screen } from '../components/Screen';
import { colors, fonts } from '../lib/theme';

// Plain-language terms. Apple and Google require users to agree to terms with
// zero tolerance for objectionable content in apps where people post.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'What SongSnap is',
    body: [
      'SongSnap is a place to share the songs you love and talk about what they mean to you. Song details and artwork come from Spotify and YouTube; SongSnap is not affiliated with either.',
    ],
  },
  {
    title: 'Community guidelines',
    body: [
      'There is no tolerance for objectionable content or abusive users. Do not post or comment anything that is hateful, harassing, threatening, sexually explicit, violent, illegal, or spam.',
      'Disagree about music all you like, but be decent to people.',
      'Only post things you have the right to share.',
    ],
  },
  {
    title: 'Reporting and blocking',
    body: [
      'Use the menu on any post or comment to report it, or to block the person who posted it. Blocked people disappear from your feed and discussions, and they are not told.',
      'Reports are reviewed within 24 hours. Content that breaks these guidelines is removed and accounts that post it are suspended or deleted.',
    ],
  },
  {
    title: 'Your account',
    body: [
      'You must be at least 13 years old to use SongSnap.',
      'You can delete your account at any time from You → Settings → Delete account. This permanently removes your profile, posts, comments and reactions.',
      'We store your name, username, email address and what you post so the app can work. We never sell your data.',
    ],
  },
  {
    title: 'Contact',
    body: ['SongSnap is run by The 36th Company Ltd, London. Questions or concerns: privacy@songsnap.online, or use the report option in the app.'],
  },
];

export default function TermsScreen() {
  return (
    <Screen>
      <Header title="Terms and guidelines" back />
      <ScrollView contentContainerStyle={styles.body}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.title} accessibilityRole="header">
              {s.title}
            </Text>
            {s.body.map((p) => (
              <Text key={p.slice(0, 24)} style={styles.p}>
                {p}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.p}>
          How we handle your data is explained in our{' '}
          <Text style={styles.link} onPress={() => router.push('/privacy')}>
            privacy policy
          </Text>
          .
        </Text>
        <Text style={styles.updated}>Last updated October 2026</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 24 },
  title: { color: colors.ink, fontFamily: fonts.displaySemi, fontSize: 16, marginBottom: 10 },
  p: { color: colors.haze, fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, marginBottom: 10 },
  link: { color: colors.amber, fontFamily: fonts.bodySemi },
  updated: { color: colors.dim, fontFamily: fonts.body, fontSize: 13 },
});
