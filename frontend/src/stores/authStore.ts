import { create } from 'zustand';
import * as authApi from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { setUnauthorizedHandler, apiClient } from '@/lib/api/client';
import { translate } from '@/lib/i18n';
import { STORAGE_KEYS, appStorage } from '@/lib/storage/storage';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  GoogleSignInRequest,
  LoginCredentials,
  PendingIntent,
  PhoneVerifyOtpRequest,
  SignupCredentials,
  User,
  UserRole,
} from '@/types/auth';
import { pendingIntentMatchesRole } from '@/utils/routing';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  pendingIntent: PendingIntent | null;
  guestMode: boolean;
  isGuest: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (credentialsOrEmail: LoginCredentials | string, password?: string, role?: UserRole) => Promise<User>;
  signup: (credentialsOrName: SignupCredentials | string, email?: string, password?: string, role?: UserRole) => Promise<User>;
  googleAuthenticate: (input: GoogleSignInRequest) => Promise<User>;
  phoneAuthenticate: (input: PhoneVerifyOtpRequest) => Promise<User>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string, name?: string, role?: UserRole) => Promise<User>;
  loginAsGuest: () => void;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => void;
  clearError: () => void;
  setPendingIntent: (intent: PendingIntent) => void;
  clearPendingIntent: () => void;
  setGuestMode: (value: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,
  isInitialized: false,
  isLoading: false,
  error: null,
  pendingIntent: null,
  guestMode: false,
  isGuest: false,
};

function persistToken(token: string): void {
  appStorage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
}

function removePersistedToken(): void {
  appStorage.delete(STORAGE_KEYS.ACCESS_TOKEN);
}

function persistGuestMode(value: boolean): void {
  appStorage.set(STORAGE_KEYS.GUEST_MODE, value ? 'true' : 'false');
}

function readGuestMode(): boolean {
  return appStorage.get(STORAGE_KEYS.GUEST_MODE) === 'true';
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  initialize: async () => {
    set({ isInitializing: true, isInitialized: false, error: null });

    try {
      const token = appStorage.get(STORAGE_KEYS.ACCESS_TOKEN);

      if (!token) {
        const guestMode = readGuestMode();
        set({
          ...initialState,
          guestMode,
          isGuest: guestMode,
          isInitializing: false,
          isInitialized: true,
        });
        return;
      }

      set({ token });

      const user = await authApi.getMe();
      set({
        user,
        token,
        isAuthenticated: true,
        isInitializing: false,
        isInitialized: true,
        error: null,
        guestMode: false,
        isGuest: false,
      });

      // Fetch unread notification count
      void useNotificationStore.getState().fetchUnreadCount();
    } catch {
      removePersistedToken();
      const guestMode = readGuestMode();
      set({
        ...initialState,
        guestMode,
        isGuest: guestMode,
        isInitializing: false,
        isInitialized: true,
      });
    }
  },

  login: async (credentialsOrEmail, password, role = 'worker') => {
    set({ isLoading: true, error: null });

    const credentials: LoginCredentials =
      typeof credentialsOrEmail === 'string'
        ? { email: credentialsOrEmail, password: password || '', role }
        : credentialsOrEmail;

    const requestedRole: UserRole = credentials.role || role || 'worker';
    const alternateRole: UserRole = requestedRole === 'worker' ? 'employer' : 'worker';

    try {
      let result;
      try {
        result = await authApi.login({ ...credentials, role: requestedRole });
      } catch (firstErr: any) {
        const errMsg = firstErr?.response?.data?.message || firstErr?.message || '';
        // If the user picked the wrong role (e.g. registered as employer but selected worker or vice-versa),
        // try the alternate role automatically!
        if (
          firstErr?.response?.status === 401 &&
          (errMsg.includes('role') || errMsg.includes('Invalid credentials for this role'))
        ) {
          result = await authApi.login({ ...credentials, role: alternateRole });
        } else {
          throw firstErr;
        }
      }

      const { user, token } = result;
      persistToken(token);
      persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
        isGuest: false,
        isInitializing: false,
        isInitialized: true,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }

      void useNotificationStore.getState().fetchUnreadCount();
      return user;
    } catch (error: any) {
      const msg = getApiErrorMessage(error, translate('auth.unableSignIn'));
      set({
        isLoading: false,
        error: msg,
      });
      throw new Error(msg);
    }
  },

  signup: async (credentialsOrName, email, password, role = 'worker') => {
    set({ isLoading: true, error: null });

    const credentials: SignupCredentials =
      typeof credentialsOrName === 'string'
        ? { name: credentialsOrName, email: email || '', password: password || '', role }
        : credentialsOrName;

    try {
      const { user, token } = await authApi.signup(credentials);
      persistToken(token);
      persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
        isGuest: false,
        isInitializing: false,
        isInitialized: true,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }

      return user;
    } catch (error: any) {
      const isConflict =
        error?.response?.status === 409 ||
        error?.response?.data?.message?.includes('already registered') ||
        error?.message?.includes('already registered');

      const msg = isConflict
        ? 'An account with this email already exists. Please sign in.'
        : getApiErrorMessage(error, translate('auth.unableCreateAccount'));

      set({
        isLoading: false,
        error: msg,
      });

      const err = new Error(msg);
      (err as any).isConflict = isConflict;
      (err as any).statusCode = error?.response?.status;
      throw err;
    }
  },

  googleAuthenticate: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const { user, token } = await authApi.googleSignIn(input);
      persistToken(token);
      persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
        isGuest: false,
        isInitializing: false,
        isInitialized: true,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }

      void useNotificationStore.getState().fetchUnreadCount();
      return user;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, translate('auth.unableGoogle')),
      });
      throw error;
    }
  },

  sendOtp: async (phone: string) => {
    await authApi.sendPhoneOtp({ phone });
  },

  verifyOtp: async (phone: string, code: string, name?: string, role: UserRole = 'worker') => {
    return get().phoneAuthenticate({ phone, code, name, role });
  },

  phoneAuthenticate: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const { user, token } = await authApi.verifyPhoneOtp(input);
      persistToken(token);
      persistGuestMode(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        guestMode: false,
        isGuest: false,
        isInitializing: false,
        isInitialized: true,
      });

      const pendingIntent = get().pendingIntent;
      if (pendingIntent && !pendingIntentMatchesRole(pendingIntent, user.role)) {
        set({ pendingIntent: null });
      }

      void useNotificationStore.getState().fetchUnreadCount();
      return user;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, translate('auth.unableVerifyCode')),
      });
      throw error;
    }
  },

  loginAsGuest: () => {
    get().setGuestMode(true);
  },

  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      await apiClient.delete('/auth/account');
    } finally {
      get().clearAuth();
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      if (get().token) {
        await authApi.logout().catch(() => {});
      }
    } finally {
      useNotificationStore.getState().reset();
      get().clearAuth();
      persistGuestMode(true);
      set({ guestMode: true, isGuest: true, isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  clearAuth: () => {
    removePersistedToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitializing: false,
      isInitialized: true,
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

  setGuestMode: (value) => {
    persistGuestMode(value);
    set({ guestMode: value, isGuest: value });
  },
}));

// Connect centralized 401 handler
setUnauthorizedHandler(() => {
  const { clearAuth, isInitializing, guestMode } = useAuthStore.getState();
  clearAuth();
  if (!isInitializing) {
    window.location.href = guestMode ? '/browse' : '/login';
  }
});
