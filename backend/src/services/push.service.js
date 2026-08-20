import { Expo } from "expo-server-sdk";

import { getActiveDeviceTokens, removeDeviceTokens } from "./device.service.js";

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

const sendToExpo = async (messages) => {
  const expo = getExpoClient();
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

/**
 * Deliver a persisted notification as push messages to the recipient's active
 * devices. Fire-and-forget: this function never rejects and must never cause
 * the caller's business operation to fail.
 */
export const pushNotifications = async (notification) => {
  try {
    const tokens = await getActiveDeviceTokens(notification.recipient);
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
    if (validTokens.length === 0) {
      return;
    }
    const messages = buildPushMessages(notification, validTokens);
    await sendToExpo(messages);
  } catch (error) {
    console.error(`[PUSH] push delivery failed: ${error.message}`);
  }
};
