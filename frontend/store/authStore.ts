import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import api from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (token: string, user: User) => {
    console.log('Auth Store: Saving token and user...');
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    console.log('Auth Store: Token saved, token length:', token.length);
    console.log('Auth Store: User saved:', user.username);
    set({ user, token, isAuthenticated: true, isLoading: false });
    console.log('Auth Store: Login complete!');
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        // Verify token is still valid
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // Token invalid, clear auth
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  updateUser: (user: User) => {
    set({ user });
    AsyncStorage.setItem('user', JSON.stringify(user));
  },
}));
