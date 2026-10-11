import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header, Screen } from '../components/Screen';
import { colors, fonts } from '../lib/theme';

// Public page: songsnap.online/privacy (linked from the app stores).
const CONTACT = 'privacy@songsnap.online';

const SECTIONS: { title: string; body: string[]; id?: string }[] = [
  {
    title: 'Who we are',
    body: [
      'SongSnap is run by The 36th Company Ltd, London, United Kingdom. We are the data controller for the personal data described here.',
      `Contact: ${CONTACT}`,
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Account details: your name, email address and profile photo link from Google or Apple when you sign in, plus the username and bio you choose. Guest accounts have no name or email until you link one.',
      'What you post: songs you share (title, artist, artwork link and a link to Spotify or YouTube), your captions and moods, comments, reactions, who you follow, who you block, and any reports you file.',
      'Sign-in data: a session token stored on your device so you stay signed in.',
      'We do not collect your location, contacts, photos, microphone, advertising ID or browsing history. There are no ads and no third-party analytics or tracking.',
    ],
  },
  {
    title: 'How we use it',
    body: [
      'To run SongSnap: showing your profile and posts, building feeds, counting reactions, and keeping you signed in.',
      'To keep people safe: reviewing reports and removing content or accounts that break our community guidelines.',
      'Our legal basis is performing our agreement with you (providing the service) and our legitimate interest in keeping the community safe.',
    ],
  },
  {
    title: 'Who can see it',
    body: [
      'Your name, username, photo, bio, posts, comments, reactions and follower counts are visible to other signed-in SongSnap users. Your email address is never shown to other users.',
      'Blocks and reports are private.',
    ],
  },
  {
    title: 'Services we use',
    body: [
      'Supabase (database, sign-in and hosting of our server functions) and Cloudflare (website hosting) store and process data for us under contract.',
      'Google and Apple handle sign-in when you choose them. Spotify and YouTube power song search; your search words are sent to them from our server, and song artwork is loaded from their servers.',
      'We do not sell or share your personal data with anyone else, and we never use it for advertising.',
      'Some of these providers may process data outside the UK; where they do, they use legally approved safeguards such as standard contractual clauses.',
    ],
  },
  {
    id: 'delete',
    title: 'Deleting your account',
    body: [
      'In the app or on songsnap.online: sign in, go to You → Settings (the gear icon) → Delete account. This immediately and permanently deletes your profile, posts, comments, reactions, follows, blocks and reports.',
      `If you can't sign in, email ${CONTACT} from the address on your account and we'll delete it within 30 days.`,
      'Deleted data may remain in encrypted backups for up to 30 days before it is overwritten.',
    ],
  },
  {
    title: 'How long we keep data',
    body: ['We keep your data while your account exists. Guest accounts that are never linked may be removed after 12 months without use.'],
  },
  {
    title: 'Your rights',
    body: [
      `Under UK data protection law you can ask for a copy of your data, ask us to correct or delete it, or object to how we use it. Email ${CONTACT}.`,
      'You can also complain to the Information Commissioner’s Office (ico.org.uk).',
    ],
  },
  {
    title: 'Children',
    body: ['SongSnap is not for children under 13. If you believe a child under 13 has an account, contact us and we will delete it.'],
  },
  {
    title: 'Changes',
    body: ['If we change this policy we will update this page and the date below, and tell you in the app if the change is significant.'],
  },
];

export default function PrivacyScreen() {
  return (
    <Screen>
      <Header title="Privacy policy" back />
      <ScrollView contentContainerStyle={styles.body}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section} nativeID={s.id}>
            <Text style={styles.title} accessibilityRole="header">
              {s.title}
            </Text>
            {s.body.map((p) => (
              <Text key={p.slice(0, 32)} style={styles.p}>
                {p.includes(CONTACT) ? (
                  <>
                    {p.split(CONTACT)[0]}
                    <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${CONTACT}`)}>
                      {CONTACT}
                    </Text>
                    {p.split(CONTACT)[1]}
                  </>
                ) : (
                  p
                )}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.updated}>Last updated 11 October 2026</Text>
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
