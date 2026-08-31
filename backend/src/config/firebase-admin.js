import { initializeApp, applicationDefault, getApps, getApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let messagingService = null;

/**
 * Lazily resolve the Firebase Admin Messaging service, initializing Firebase
 * Admin exactly once. Returns the shared Messaging instance, or null when
 * Firebase credentials are not configured.
 *
 * Credentials are resolved via Google Application Default Credentials (ADC):
 *  - GOOGLE_APPLICATION_CREDENTIALS pointing to a service-account JSON, or
 *  - a Workload Identity Federation external-account JSON, or
 *  - the Cloud Run metadata-server credentials of the attached service
 *    account (GOOGLE_APPLICATION_CREDENTIALS unset), or
 *  - gcloud ADC (development only).
 *
 * No credentials are hard-coded and none are ever logged here. ADC is always
 * attempted; if it fails (e.g. no credentials available anywhere), the
 * try/catch returns null so FCM delivery is skipped and callers can log a
 * safe "[FCM] Firebase Admin is not configured" message.
 */
const getFirebaseMessaging = () => {
  if (messagingService) {
    return messagingService;
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
      });
    }
    messagingService = getMessaging(getApp());
    return messagingService;
  } catch (error) {
    console.warn(
      "[FCM] Firebase Admin initialization failed: not delivering FCM pushes",
    );
    return null;
  }
};

export { getFirebaseMessaging };
