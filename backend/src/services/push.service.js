import { Expo } from "expo-server-sdk";
import { MessagingErrorCode } from "firebase-admin/messaging";

import {
  getActiveDevices,
  removeDeviceTokens,
} from "./device.service.js";
import { getFirebaseMessaging } from "../config/firebase-admin.js";

const DEFAULT_CHANNEL_ID = "giglink-notifications";

let expoClient = null;

const getExpoClient = () => {
  if (!expoClient) {
    expoClient = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
    });
  }
  return expoClient;
};

const isInvalidTokenError = (errorCode) =>
  errorCode === "DeviceNotRegistered" || errorCode === "InvalidReceipt";

/**
 * Pure helper: given per-message ticket results and optional receipt results,
 * returns the list of device tokens that must be removed.
 */
export const collectInvalidTokens = (entries, receiptResults = null) => {
  const invalid = new Set();

  for (const { token, ticket } of entries) {
    if (ticket.status === "error" && isInvalidTokenError(ticket.details?.error)) {
      invalid.add(token);
      continue;
    }

    if (ticket.status === "ok" && ticket.id && receiptResults) {
      const receipt = receiptResults[ticket.id];
      if (receipt && receipt.status === "error" && isInvalidTokenError(receipt.details?.error)) {
        invalid.add(token);
      }
    }
  }

  return [...invalid];
};

/**
 * Pure helper: builds the Expo push message list for a persisted notification.
 * Push payload carries ONLY navigation ids — no sensitive information.
 */
export const buildPushMessages = (notification, tokens) =>
  tokens.map((token) => ({
    to: token,
    sound: "default",
    channelId: DEFAULT_CHANNEL_ID,
    title: notification.title,
    body: notification.message,
    data: {
      notificationId: String(notification._id),
      type: notification.type,
      relatedJob: notification.relatedJob ? String(notification.relatedJob) : null,
      relatedApplication: notification.relatedApplication
        ? String(notification.relatedApplication)
        : null,
      relatedAssignment: notification.relatedAssignment
        ? String(notification.relatedAssignment)
        : null,
    },
  }));

const sendToExpo = async (messages, expo = getExpoClient()) => {
  const chunks = expo.chunkPushNotifications(messages);
  const entries = [];
  const receiptIds = [];

  let messageIndex = 0;
  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.forEach((ticket) => {
      const token = messages[messageIndex].to;
      messageIndex += 1;
      entries.push({ token, ticket });
      if (ticket.status === "ok" && ticket.id) {
        receiptIds.push(ticket.id);
      }
    });
  }

  let receiptResults = null;
  if (receiptIds.length > 0) {
    receiptResults = await expo.getPushNotificationReceiptsAsync(receiptIds);
  }

  const invalidTokens = collectInvalidTokens(entries, receiptResults);
  if (invalidTokens.length > 0) {
    await removeDeviceTokens(invalidTokens);
  }
};

// FCM errors that mean a device token is permanently invalid/unregistered and
// should be removed. These correspond to Firebase `MessagingErrorCode` values.
const FCM_REMOVABLE_ERROR_CODES = new Set([
  MessagingErrorCode.INVALID_ARGUMENT,
  MessagingErrorCode.INVALID_REGISTRATION_TOKEN,
  MessagingErrorCode.REGISTRATION_TOKEN_NOT_REGISTERED,
  MessagingErrorCode.INSTALLATION_ID_NOT_REGISTERED,
  MessagingErrorCode.MISMATCHED_CREDENTIAL,
]);

// FCM errors that indicate a Firebase configuration/authentication problem.
// Tokens must NOT be removed for these — they are not the device's fault.
const FCM_CONFIG_ERROR_CODES = new Set([
  MessagingErrorCode.THIRD_PARTY_AUTH_ERROR,
  MessagingErrorCode.AUTHENTICATION_ERROR,
]);

/**
 * Pure helper: builds the per-token Firebase Cloud Messaging messages for a
 * persisted notification. Mirrors the Expo payload model (IDs + type only) so
 * navigation/deep-link behavior is identical. Firebase `data` requires string
 * values, so missing related ids use empty strings (interpreted as "missing"
 * by the mobile app, matching the null handling for Expo).
 */
export const buildFcmMessages = (notification, tokens) => {
  const data = {
    notificationId: String(notification._id),
    type: String(notification.type),
    relatedJob: notification.relatedJob ? String(notification.relatedJob) : "",
    relatedApplication: notification.relatedApplication
      ? String(notification.relatedApplication)
      : "",
    relatedAssignment: notification.relatedAssignment
      ? String(notification.relatedAssignment)
      : "",
  };
  return tokens.map((token) => ({
    token,
    notification: {
      title: notification.title,
      body: notification.message,
    },
    android: {
      channelId: DEFAULT_CHANNEL_ID,
      priority: "high",
    },
    data,
  }));
};

/**
 * Deliver a persisted notification to FCM tokens via Firebase Admin.
 * Fire-and-forget: never rejects on configuration, authentication, or
 * transient errors; only permanently invalid tokens are removed.
 */
const sendToFcm = async (notification, tokens, messaging = getFirebaseMessaging()) => {
  if (!messaging) {
    console.log("[FCM] Firebase Admin is not configured: skipping FCM delivery");
    return;
  }

  const messages = buildFcmMessages(notification, tokens);
  console.log(`[FCM] Sending push to ${messages.length} device(s)`);

  let result;
  try {
    // Batch/multicast: a single API call for all FCM tokens.
    result = await messaging.sendEachForMulticast(messages);
  } catch (error) {
    // Configuration/auth/transport failure (whole-batch rejection).
    if (FCM_CONFIG_ERROR_CODES.has(error?.code)) {
      console.warn("[FCM] Firebase configuration error: not delivering FCM pushes");
    } else {
      console.warn("[FCM] FCM send failed:", error?.message || error);
    }
    return;
  }

  console.log(
    `[FCM] Push delivery succeeded (${result.successCount} ok, ${result.failureCount} failed)`,
  );

  if (result.failureCount > 0) {
    const invalidTokens = [];
    result.responses.forEach((response, index) => {
      if (!response.success) {
        const code = response.error?.code;
        if (FCM_REMOVABLE_ERROR_CODES.has(code)) {
          invalidTokens.push(messages[index].token);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await removeDeviceTokens(invalidTokens);
      console.log(`[FCM] Invalid device token removed (${invalidTokens.length})`);
    }
  }
};

/**
 * Deliver a persisted notification as push messages to the recipient's active
 * devices. Tokens are split by provider: Expo tokens go through the existing
 * Expo delivery; FCM tokens go through Firebase Admin. Fire-and-forget: this
 * function never rejects and must never cause the caller's business operation
 * to fail.
 */
export const pushNotifications = async (notification, { expo, messaging } = {}) => {
  try {
    const devices = await getActiveDevices(notification.recipient);

    const expoTokens = devices
      .filter((device) => device.provider !== "fcm")
      .map((device) => device.token);
    const fcmTokens = devices
      .filter((device) => device.provider === "fcm")
      .map((device) => device.token);

    const validExpoTokens = expoTokens.filter((token) => Expo.isExpoPushToken(token));
    if (validExpoTokens.length > 0) {
      const messages = buildPushMessages(notification, validExpoTokens);
      await sendToExpo(messages, expo);
    }

    if (fcmTokens.length > 0) {
      await sendToFcm(notification, fcmTokens, messaging);
    }
  } catch (error) {
    console.error(`[PUSH] push delivery failed: ${error.message}`);
  }
};
