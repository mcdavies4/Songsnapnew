import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobilemelody.preview.emergentagent.com';

console.log('Backend URL:', BACKEND_URL);

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global token cache to avoid AsyncStorage race conditions
let cachedToken: string | null = null;

export const setApiToken = (token: string) => {
  cachedToken = token;
  console.log('API Token cached:', token ? 'set' : 'cleared');
};

export const clearApiToken = () => {
  cachedToken = null;
};

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Try cached token first (avoids AsyncStorage race condition)
    let token = cachedToken;
    
    // Fallback to AsyncStorage if no cached token
    if (!token) {
      token = await AsyncStorage.getItem('auth_token');
    }
    
    console.log('Token for request:', token ? 'exists' : 'missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token on 401
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
