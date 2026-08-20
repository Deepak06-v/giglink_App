import { OAuth2Client } from "google-auth-library";

import { googleLoginOrSignup } from "./auth.service.js";

let googleVerifier = null;

const setGoogleVerifier = (fn) => {
  googleVerifier = fn;
};

const createDefaultVerifier = () => {
  const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
  if (!clientId) {
    const error = new Error("GOOGLE_WEB_CLIENT_ID is not configured");
    error.statusCode = 503;
    throw error;
  }

  const client = new OAuth2Client(clientId);

  return async (idToken) => {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    return ticket.getPayload();
  };
};

const getVerifier = () => {
  if (googleVerifier) {
    return googleVerifier;
  }
  return createDefaultVerifier();
};

const verifyGoogleIdToken = async (idToken) => {
  if (!idToken || !idToken.trim()) {
    const error = new Error("Google ID token is required");
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getVerifier()(idToken.trim());
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const authError = new Error("Invalid Google credentials");
    authError.statusCode = 401;
    throw authError;
  }
};

const authenticateGoogle = async ({ idToken, role }) => {
  const payload = await verifyGoogleIdToken(idToken);

  if (!payload || !payload.sub) {
    const error = new Error("Invalid Google identity");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.email || payload.email_verified !== true) {
    const error = new Error("A verified Google email is required");
    error.statusCode = 400;
    throw error;
  }

  const name = payload.name || payload.email.split("@")[0];

  return googleLoginOrSignup({
    sub: payload.sub,
    email: payload.email,
    name,
    role,
  });
};

export { authenticateGoogle, verifyGoogleIdToken, setGoogleVerifier };