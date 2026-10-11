import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { getMyProfile, updateProfile } from '../lib/api';
import { clearSafetyCache } from '../lib/safety';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  ready: boolean;
  init: () => () => void;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  upgradeGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

function nativeRedirect() {
  return makeRedirectUri({ scheme: 'songsnap', path: 'auth-callback' });
}

// Native: open the provider page in an auth session and exchange the returned code.
async function completeNativeOAuth(url: string, redirectTo: string) {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== 'success') return;
  const params = new URL(result.url).searchParams;
  const err = params.get('error_description') || params.get('error');
  if (err) throw new Error(err);
  const code = params.get('code');
  if (!code) throw new Error('Sign-in was not completed');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  ready: false,

  init: () => {
    supabase.auth.getSession().then(async ({ data }) => {
      set({ session: data.session });
      if (data.session) await get().refreshProfile();
      set({ ready: true });
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      set({ session });
      if (!session) {
        set({ profile: null });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Defer so we don't call Supabase inside its own auth callback.
        setTimeout(() => get().refreshProfile(), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    try {
      const profile = await getMyProfile();
      set({ profile });
    } catch (e) {
      console.warn('Profile load failed', e);
    }
  },

  setProfile: (profile) => set({ profile }),

  signInWithGoogle: async () => {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return; // browser navigates away
    }
    const redirectTo = nativeRedirect();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    await completeNativeOAuth(data.url, redirectTo);
  },

  // iOS only: native Sign in with Apple, exchanged for a Supabase session.
  signInWithApple: async () => {
    let cred: AppleAuthentication.AppleAuthenticationCredential;
    try {
      cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      throw e;
    }
    if (!cred.identityToken) throw new Error('Apple did not return a sign-in token');
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
    if (error) throw error;

    // Apple only shares the name on the very first sign-in, and not inside the token.
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ').trim();
    if (name && data.user) {
      try {
        const updated = await updateProfile(data.user.id, { name: name.slice(0, 50) });
        set({ profile: { ...(get().profile ?? updated), ...updated } });
      } catch {
        /* keep the default name */
      }
    }
  },

  signInAsGuest: async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  },

  // Keeps a guest's posts/likes by attaching Google to the same account.
  upgradeGuest: async () => {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return;
    }
    const redirectTo = nativeRedirect();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    await completeNativeOAuth(data.url, redirectTo);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    clearSafetyCache();
    set({ session: null, profile: null });
  },
}));
