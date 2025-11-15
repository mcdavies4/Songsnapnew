import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuthStore();

  const redirectUri = 'https://auth.expo.io/@anonymous/songsnap';
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '917436741289-sg2c5rubhh5dvt0sk8gl2fhtgfhcfor0.apps.googleusercontent.com',
    iosClientId: '917436741289-sg2c5rubhh5dvt0sk8gl2fhtgfhcfor0.apps.googleusercontent.com',
    androidClientId: '917436741289-sg2c5rubhh5dvt0sk8gl2fhtgfhcfor0.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    redirectUri: redirectUri,
  });

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleAuth(authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleAuth = async (token: string | undefined) => {
    if (!token) {
      Alert.alert('Error', 'No access token received');
      return;
    }

    try {
      const result = await api.post('/auth/google', { token });
      await login(result.data.token, result.data.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Google auth error:', error);
      Alert.alert(
        'Sign In Error', 
        'Unable to complete Google sign-in. Please ensure the redirect URI is configured in Google Console:\n\nhttps://auth.expo.io/@anonymous/songsnap\n\nOr use Demo Mode to explore the app.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDemoMode = async () => {
    try {
      // Create a demo user session
      const demoUser = {
        id: 'demo_user_' + Date.now(),
        email: 'demo@songsnap.com',
        name: 'Demo User',
        username: 'demouser',
        profile_pic: '',
        bio: 'Demo account for testing',
        google_id: 'demo',
        followers_count: 0,
        following_count: 0,
        posts_count: 0,
        created_at: new Date().toISOString(),
      };
      
      const demoToken = 'demo_token_' + Date.now();
      await login(demoToken, demoUser);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to start demo mode');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🎵</Text>
        </View>
        <Text style={styles.title}>SongSnap</Text>
        <Text style={styles.subtitle}>Share Your Sound</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Connect through music. Share what you're listening to, discover new
          tracks, and vibe with a community of music lovers.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Get Started with Google</Text>
        </TouchableOpacity>

        <Text style={styles.signInText}>Sign in to share and discover music</Text>
        
        <TouchableOpacity
          style={styles.demoButton}
          onPress={handleDemoMode}
        >
          <Text style={styles.demoButtonText}>Try Demo Mode</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🎵</Text>
          <Text style={styles.featureTitle}>Share Songs</Text>
          <Text style={styles.featureText}>
            Post tracks from Spotify with 30-second previews
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>👥</Text>
          <Text style={styles.featureTitle}>Connect</Text>
          <Text style={styles.featureText}>
            Follow friends and discover their taste
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>❤️</Text>
          <Text style={styles.featureTitle}>Engage</Text>
          <Text style={styles.featureText}>
            Like, comment, and interact with posts
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    marginTop: 40,
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#b3b3b3',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInText: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 16,
  },
  demoButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1DB954',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    marginTop: 8,
  },
  demoButtonText: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    marginTop: 40,
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#b3b3b3',
    textAlign: 'center',
  },
});
