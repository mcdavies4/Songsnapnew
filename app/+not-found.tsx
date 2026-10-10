import { router } from 'expo-router';
import Button from '../components/Button';
import { Empty, Screen } from '../components/Screen';

export default function NotFound() {
  return (
    <Screen>
      <Empty icon="musical-notes-outline" text="This page doesn't exist." />
      <Button title="Go home" onPress={() => router.replace('/')} style={{ alignSelf: 'center' }} />
    </Screen>
  );
}
