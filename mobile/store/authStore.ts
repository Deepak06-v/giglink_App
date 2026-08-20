import { router } from 'expo-router';
import { create } from 'zustand';

import * as authApi from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { translate } from '@/lib/i18n';
import { unregisterForPushNotifications } from '@/lib/notifications/registration';
import { SECURE_STORAGE_KEYS, secureStorage } from '@/lib/storage/secureStorage';
import { useNotificationStore } from '@/store/notificationStore';
import type {
  GoogleSignInRequest,
  LoginCredentials,
  PendingIntent,
  PhoneVerifyOtpRequest,
  SignupCredentials,
  User,
} from '@/types/auth';
import { pendingIntentMatchesRole } from '@/utils/routing';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  pendingIntent: PendingIntent | null;
  guestMode: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  googleAuthenticate: (input: GoogleSignInRequest) => Promise<User>;
  phoneAuthenticate: (input: PhoneVerifyOtpRequest) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => Promise<void>;
  clearError: () => void;
  setPendingIntent: (intent: PendingIntent) => void;
  clearPendingIntent: () => void;
  setGuestMode: (value: boolean) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,
  pendingIntent: null,
  guestMode: false,
};

async function persistToken(token: string): Promise<void> {
  await secureStorage.set(SECURE_STORAGE_KEYS.ACCESS_TOKEN, token);
}

async function removePersistedToken(): Promise<void> {
  await secureStorage.delete(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
}

async function persistGuestMode(value: boolean): Promise<void> {
  await secureStorage.set(SECURE_STORAGE_KEYS.GUEST_MODE, value ? 'true' : 'false');
}

async function readGuestMode(): Promise<boolean> {
  const value = await secureStorage.get(SECURE_STORAGE_KEYS.GUEST_MODE);
  return value === 'true';
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  initialize: async () => {
    set({ isInitializing: true, error: null });

    try {
      const token = await secureStorage.get(SECURE_STORAGE_KEYS.ACCESS_TOKEN);

      if (!token) {
        const guestMode = await readGuestMode();
        set({ ...initialState, guestMode, isInitializing: false });
        return;
      }

      set({ token });

      const user = await authApi.getMe();
      set({
        user,
        token,
        isAuthenticated: true,
        isInitializing: false,
        error: null,
        guestMode: false,
      });
    } catch {
      await removePersistedToken();
      const guestMode = await readGuestMode();
      set({ ...initialState, guestMode, isInitializing: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });

    try {
      const { user, token } = await authApi.login(credentials);
      await persistToken(token);
      await persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, translate('auth.unableSignIn')),
      });
      throw error;
    }
  },

  signup: async (credentials) => {
    set({ isLoading: true, error: null });

    try {
      const { user, token } = await authApi.signup(credentials);
      await persistToken(token);
      await persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, translate('auth.unableCreateAccount')),
      });
      throw error;
    }
  },

  googleAuthenticate: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const { user, token } = await authApi.googleSignIn(input);
      await persistToken(token);
      await persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }

      return user;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, translate('auth.unableGoogle')),
      });
      throw error;
    }
  },

  phoneAuthenticate: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const { user, token } = await authApi.verifyPhoneOtp(input);
      await persistToken(token);
      await persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }

      return user;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, translate('auth.unableVerifyCode')),
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      if (get().token) {
        // Best-effort: unregister this device's push token BEFORE auth is cleared.
        // Never blocks logout — failures are swallowed.
        await unregisterForPushNotifications();
        await authApi.logout();
      }
    } catch {
      // Server logout is optional — session is cleared client-side.
    } finally {
      useNotificationStore.getState().reset();
      await get().clearAuth();
      await persistGuestMode(true);
      set({ guestMode: true });
      router.replace('/(public)');
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  clearAuth: async () => {
    await removePersistedToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitializing: false,
      pendingIntent: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  setPendingIntent: (intent) => {
    set({ pendingIntent: intent });
  },

  clearPendingIntent: () => {
    set({ pendingIntent: null });
  },

  setGuestMode: async (value) => {
    await persistGuestMode(value);
    set({ guestMode: value });
  },
}));
