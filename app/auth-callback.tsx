import { Redirect } from 'expo-router';

// Native OAuth deep link (songsnap://auth-callback?code=...) can land here on Android.
// The code is exchanged in store/auth.ts; just send the user home.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
