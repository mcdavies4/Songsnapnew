import { router } from 'expo-router';
import Button from '../components/Button';
import { Empty, Screen } from '../components/Screen';

export default function NotFound() {
  return (
    <Screen>
      <Empty
        emoji="🎚️"
        title="Nothing playing here"
        text="This page doesn't exist."
        action={<Button title="Go to the feed" onPress={() => router.replace('/')} style={{ marginTop: 10 }} />}
      />
    </Screen>
  );
}
