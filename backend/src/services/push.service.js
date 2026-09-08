import https from "https";

import {
  getActiveDevices,
  removeDeviceTokens,
} from "./device.service.js";

const PUSHY_HOSTNAME = "api.pushy.me";
const REQUEST_TIMEOUT_MS = 10000;

const getPushyApiKey = () => process.env.PUSHY_API_KEY || "";

/**
 * Pure helper: builds the Pushy send payload for a persisted notification.
 *
 * Pushy delivers ONLY the `data` block to the mobile JS listener (never a
 * `notification` title/body block), and the RN SDK renders the system
 * notification itself via Pushy.notify(). So the title + message ride inside
 * `data` — still far below Pushy's ~4KB payload limit. The rest of the data
 * block carries navigation ids only (no sensitive information).
 */
export const buildPushyPayload = (notification, tokens) => ({
  to: tokens,
  data: {
    notificationId: String(notification._id),
    type: notification.type,
    relatedJob: notification.relatedJob ? String(notification.relatedJob) : "",
    relatedApplication: notification.relatedApplication
      ? String(notification.relatedApplication)
      : "",
    relatedAssignment: notification.relatedAssignment
      ? String(notification.relatedAssignment)
      : "",
    title: notification.title,
    message: notification.message,
  },
});

/**
 * Pure helper: given the Pushy send response and the tokens that were sent,
 * returns the tokens that must be removed. Supports both the current
 * `info.failed` shape and the legacy `invalid_devices` shape. Only tokens that
 * were actually sent are ever eligible for removal.
 */
export const collectInvalidTokens = (response, tokens) => {
  const info = response?.info ?? {};
  const invalid =
    (Array.isArray(info.failed) && info.failed) ||
    (Array.isArray(info.invalid_devices) && info.invalid_devices) ||
    [];
  if (invalid.length === 0) {
    return [];
  }
  const sent = new Set(tokens);
  return invalid.filter((token) => sent.has(token));
};

const pushyHttpPost = (apiKey, payload) =>
  new Promise((resolve, reject) => {
    const options = {
      hostname: PUSHY_HOSTNAME,
      path: `/push?api_key=${encodeURIComponent(apiKey)}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          // Non-JSON body — the status code drives error classification below.
        }
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
          return;
        }
        const error = new Error(parsed.error || `Pushy API error (HTTP ${res.statusCode})`);
        error.statusCode = res.statusCode || 500;
        error.code = parsed.error || "PUSHY_API_ERROR";
        reject(error);
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Pushy request timed out"));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });

/**
 * Deliver a persisted notification to Pushy tokens. Fire-and-forget: never
 * rejects. Provider-side failures (missing API key, 4xx/5xx, network) are
 * logged and skipped so notification creation is never affected; only
 * permanently invalid tokens are removed. Returns the number of devices
 * reported as delivered (or the number of tokens when the response omits it).
 */
export const sendPushyNotification = async (notification, tokens, httpPost = pushyHttpPost) => {
  const recipientTokens = Array.isArray(tokens) ? tokens : [];
  if (recipientTokens.length === 0) {
    return 0;
  }

  const apiKey = getPushyApiKey();
  if (!apiKey) {
    console.warn("[PUSHY] PUSHY_API_KEY is not configured: skipping push delivery");
    return 0;
  }

  const payload = buildPushyPayload(notification, recipientTokens);
  console.log(`[PUSHY] Sending push to ${recipientTokens.length} device(s)`);

  let response;
  try {
    response = await httpPost(apiKey, payload);
  } catch (error) {
    console.warn(`[PUSHY] Push delivery failed: ${error?.message || error}`);
    return 0;
  }

  const invalidTokens = collectInvalidTokens(response, recipientTokens);
  if (invalidTokens.length > 0) {
    await removeDeviceTokens(invalidTokens);
    console.log(`[PUSHY] Invalid device token removed (${invalidTokens.length})`);
  }

  const reported = Number(response?.info?.devices);
  const delivered = Number.isFinite(reported) ? reported : recipientTokens.length;
  console.log(`[PUSHY] Push delivery succeeded (${delivered} device(s))`);
  return delivered;
};

/**
 * Deliver a persisted notification as a push message to the recipient's active
 * devices (Pushy is the only provider). Fire-and-forget: this function never
 * rejects and must never cause the caller's business operation to fail.
 */
export const pushNotifications = async (notification, { httpPost } = {}) => {
  try {
    const devices = await getActiveDevices(notification.recipient);
    const tokens = devices.map((device) => device.token);
    return await sendPushyNotification(notification, tokens, httpPost);
  } catch (error) {
    console.error(`[PUSH] push delivery failed: ${error.message}`);
    return 0;
  }
};

export { getPushyApiKey };