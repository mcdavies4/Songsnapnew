import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import { Header, Loading, Screen } from '../components/Screen';
import { updateProfile } from '../lib/api';
import { colors } from '../lib/theme';
import { errorMessage, notify } from '../lib/ui';
import { useAuth } from '../store/auth';

export default function EditProfileScreen() {
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);
  const [name, setName] = useState(profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [pic, setPic] = useState(profile?.profile_pic ?? '');
  const [saving, setSaving] = useState(false);

  if (!profile) {
    return (
      <Screen>
        <Header title="Edit profile" back />
        <Loading />
      </Screen>
    );
  }

  const save = async () => {
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(u)) {
      notify('Invalid username', '3–30 characters: lowercase letters, numbers and underscores.');
      return;
    }
    if (!name.trim()) {
      notify('Name required');
      return;
    }
    const url = pic.trim();
    if (url && !/^https:\/\//.test(url)) {
      notify('Invalid photo URL', 'Use an https:// image link, or leave it blank.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(profile.id, {
        name: name.trim(),
        username: u,
        bio: bio.trim(),
        profile_pic: url || null,
      });
      setProfile({ ...profile, ...updated });
      router.back();
    } catch (e) {
      notify('Could not save', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title="Edit profile" back />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Avatar uri={pic.trim() || null} name={name} size={88} />
          </View>

          <Field label="Name" value={name} onChange={setName} max={50} />
          <Field
            label="Username"
            value={username}
            onChange={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            max={30}
            prefix="@"
          />
          <Field label="Bio" value={bio} onChange={setBio} max={160} multiline />
          <Field label="Photo URL" value={pic} onChange={setPic} placeholder="https://…" />

          <Button title="Save" onPress={save} loading={saving} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  multiline,
  prefix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  max?: number;
  multiline?: boolean;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {max && (
          <Text style={styles.count}>
            {value.length}/{max}
          </Text>
        )}
      </View>
      <View style={styles.inputWrap}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={(t) => onChange(max ? t.slice(0, max) : t)}
          multiline={multiline}
          autoCapitalize={prefix || placeholder ? 'none' : 'sentences'}
          autoCorrect={!prefix && !placeholder}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  field: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: colors.text, fontWeight: '600', fontSize: 15 },
  count: { color: colors.textFaint, fontSize: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  prefix: { color: colors.textFaint, fontSize: 16, marginRight: 2 },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 14 },
});
