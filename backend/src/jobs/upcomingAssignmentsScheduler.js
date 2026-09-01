import { fileURLToPath } from "node:url";

import connectDB from "../config/db.js";
import { notifyUpcomingAssignments } from "../services/notification.service.js";

/**
 * Isolated, idempotent job-reminder runner.
 *
 * It ONLY calls `notifyUpcomingAssignments` (which is itself idempotent per
 * recipient+job) and never touches the rest of the server workload. Importing
 * this module is side-effect free; it only connects to the DB and runs when
 * executed directly, so it is safe to codify as a cron/systemd timer:
 *
 *   node src/jobs/upcomingAssignmentsScheduler.js
 *
 * `hoursAhead` controls how far ahead of the job start the reminder fires
 * (default 24h). Run it repeatedly; duplicate sends are skipped.
 *
 * NOTE: `connectDB` calls process.exit(1) if MONGO_URI is missing, so this file
 * is intended to run as its own process (not be imported by app.js/tests).
 */
export const runUpcomingAssignmentReminders = async ({ hoursAhead } = {}) => {
  const startedAt = Date.now();
  const result = await notifyUpcomingAssignments({ hoursAhead });
  console.log(
    `[Scheduler] upcoming assignment reminders: ${JSON.stringify({
      ...result,
      elapsedMs: Date.now() - startedAt,
    })}`
  );
  return result;
};

const isDirectRun = () => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === entry;
};

if (isDirectRun()) {
  // Direct execution (e.g. a cron job), not an import.
  const hoursAhead = Number(process.env.JOB_REMINDER_HOURS_AHEAD ?? 24);
  try {
    await connectDB();
    await runUpcomingAssignmentReminders({ hoursAhead });
    process.exit(0);
  } catch (error) {
    console.error("[Scheduler] failed:", error?.message || error);
    process.exit(1);
  }
}
