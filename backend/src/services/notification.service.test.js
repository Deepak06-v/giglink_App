import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import Assignment from "../models/Assignment.js";
import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import { notifyUpcomingAssignments } from "./notification.service.js";

const WORKER_ID = "worker1";
const JOB_ID = "job1";
const ASSIGNMENT_ID = "assignment1";

function makeAssignment({ worker = WORKER_ID, job = null, _id = ASSIGNMENT_ID } = {}) {
  return {
    _id,
    worker: { toString: () => worker },
    job,
  };
}

function makeJob({
  _id = JOB_ID,
  title = "Warehouse Shift",
  status = "OPEN",
  startDate = null,
} = {}) {
  return {
    _id,
    title,
    status,
    schedule: { startDate },
  };
}

// Mock the chain Assignment.find({status:"ACTIVE"}).populate().select().lean().
function mockAssignments(assignments) {
  mock.method(Assignment, "find", () => ({
    populate: () => ({
      select: () => ({ lean: async () => assignments }),
    }),
  }));
}

function mockAlreadyReminded(list) {
  mock.method(Notification, "find", () => ({
    select: () => ({ lean: async () => list }),
  }));
}

function mockNoDevices() {
  mock.method(DeviceToken, "find", () => ({ select: () => ({ lean: async () => [] }) }));
}

const hoursFromNow = (h) => new Date(Date.now() + h * 60 * 60 * 1000);

describe("notifyUpcomingAssignments", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("sends a JOB_STARTS_SOON reminder for an ACTIVE assignment starting soon", async () => {
    const job = makeJob({ startDate: hoursFromNow(3) });
    mockAssignments([makeAssignment({ job })]);
    mockAlreadyReminded([]);
    mockNoDevices();

    const created = [];
    mock.method(Notification, "create", async (data) => {
      created.push(data);
      return { _id: "notif-new", ...data };
    });

    const result = await notifyUpcomingAssignments();

    assert.equal(result.reminded, 1);
    assert.equal(result.skippedDuplicate, 0);
    assert.equal(created.length, 1);
    assert.equal(created[0].type, "JOB_STARTS_SOON");
    assert.equal(String(created[0].recipient), WORKER_ID);
    assert.equal(created[0].relatedJob, JOB_ID);
    assert.equal(created[0].relatedAssignment, ASSIGNMENT_ID);
    assert.ok(created[0].message.includes(job.title));
  });

  it("skips a job the worker was already reminded about (idempotent)", async () => {
    const job = makeJob({ startDate: hoursFromNow(3) });
    mockAssignments([makeAssignment({ job })]);
    mockAlreadyReminded([
      { recipient: { toString: () => WORKER_ID }, relatedJob: { toString: () => JOB_ID } },
    ]);
    mockNoDevices();

    let created = 0;
    mock.method(Notification, "create", async (data) => {
      created += 1;
      return { _id: "n", ...data };
    });

    const result = await notifyUpcomingAssignments();

    assert.equal(result.reminded, 0);
    assert.equal(result.skippedDuplicate, 1);
    assert.equal(created, 0, "no duplicate notification must be created");
  });

  it("reminds workers on the same job independently (only the already-reminded one is skipped)", async () => {
    const job = makeJob({ startDate: hoursFromNow(3) });
    const workerA = "workerA";
    const workerB = "workerB";
    mockAssignments([
      makeAssignment({ worker: workerA, job }),
      makeAssignment({ worker: workerB, job }),
    ]);
    mockAlreadyReminded([
      { recipient: { toString: () => workerA }, relatedJob: { toString: () => JOB_ID } },
    ]);
    mockNoDevices();

    const created = [];
    mock.method(Notification, "create", async (data) => {
      created.push(String(data.recipient));
      return { _id: "n", ...data };
    });

    const result = await notifyUpcomingAssignments();

    assert.equal(result.reminded, 1);
    assert.equal(result.skippedDuplicate, 1);
    assert.deepEqual(created, [workerB]);
  });

  it("does not remind anyone when no ACTIVE assignment's job is due to start", async () => {
    // When the job does not match the window/status bounds, the populate match
    // excludes it from the result, leaving the assignment's job null. The
    // service must then send nothing.
    mockAssignments([makeAssignment({ job: null })]);
    mockAlreadyReminded([]);
    mockNoDevices();

    let created = 0;
    mock.method(Notification, "create", async (data) => {
      created += 1;
      return { _id: "n", ...data };
    });

    const result = await notifyUpcomingAssignments();

    assert.equal(created, 0);
    assert.equal(result.reminded, 0);
  });
});
