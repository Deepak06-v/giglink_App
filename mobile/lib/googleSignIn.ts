import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { env } from '@/lib/config/env';

let configured = false;

function ensureConfigured(): void {
  if (configured) {
    return;
  }
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    offlineAccess: false,
  });
  configured = true;
}

/**
 * Runs the native Google Sign-In flow and returns the Google ID token.
 * Returns null when the user cancels the flow.
 * The returned token is transient: it is sent to the GigLink backend once for
 * verification and is never persisted as the GigLink session token.
 */
export async function getGoogleIdToken(): Promise<{ idToken: string } | null> {
  ensureConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return null;
  }

  const tokens = await GoogleSignin.getTokens();
  if (!tokens.idToken) {
    throw new Error('Google sign-in did not return an identity token');
  }

  return { idToken: tokens.idToken };
}