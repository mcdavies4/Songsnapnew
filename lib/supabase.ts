import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Shown on screen by app/_layout.tsx instead of crashing to a blank page.
export const configError: string | null =
  !url || !anonKey
    ? 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to your hosting environment variables (or .env locally) and rebuild.'
    : !/^https:\/\/.+/.test(url)
      ? `EXPO_PUBLIC_SUPABASE_URL must start with https:// (got "${url}").`
      : null;

const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(
  configError ? 'https://placeholder.supabase.co' : url!,
  configError ? 'placeholder' : anonKey!,
  {
    auth: {
      storage: isServer ? undefined : AsyncStorage,
      autoRefreshToken: !isServer && !configError,
      persistSession: !isServer,
      // On web the OAuth redirect lands back on the site with ?code=...; let supabase-js pick it up.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  }
);

// Native: only refresh tokens while the app is in the foreground.
if (Platform.OS !== 'web' && !configError) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
