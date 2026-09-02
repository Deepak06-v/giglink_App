import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Assignment from "../models/Assignment.js";
import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import {
  applyToJob,
  getEmployerApplicationsForJob,
  getEmployerAllApplications,
  getEmployerApplicationById,
} from "./application.service.js";

const WORKER_ID = "w1";
const EMPLOYER_ID = "employer1";

function openJob(overrides = {}) {
  return {
    _id: "job1",
    status: "OPEN",
    hiringDeadline: null,
    employer: { toString: () => EMPLOYER_ID },
    workersRequired: 2,
    title: "Test Job",
    ...overrides,
  };
}

// The same Job.findById mock must serve two callers:
//  - applyToJob: `const job = await Job.findById(jobId)` reads job fields directly.
//  - notifyApplicationReceived: `await Job.findById(jobId).select("employer title").lean()`.
// Real mongoose returns a thenable Query; here we return an async function that also
// exposes `.select()` so applyToJob can `await` it and notification can chain `.select()`.
const WORKER_USER = { _id: WORKER_ID, name: "Test Worker" };
const FULL_WORKER = {
  _id: "wp1",
  user: WORKER_ID,
  phone: "+919999999999",
  profileImage: "https://cdn.example.com/worker.jpg",
  bio: "Hard working event staff",
  location: { city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  skills: ["Events", "Customer service"],
  experience: "2 years in events",
  languages: ["English", "Hindi"],
  availability: "AVAILABLE",
};

function mockJob(job) {
  const plain = {
    _id: job._id ?? "job1",
    status: job.status ?? "OPEN",
    hiringDeadline: job.hiringDeadline ?? null,
    title: job.title ?? "Test Job",
    workersRequired: job.workersRequired ?? 2,
    employer:
      job.employer && typeof job.employer.toString === "function"
        ? job.employer
        : { toString: () => EMPLOYER_ID },
  };
  plain.select = () => ({ lean: async () => ({ ...plain }) });
  mock.method(Job, "findById", () => plain);
  return plain;
}

function mockNoDevices() {
  mock.method(DeviceToken, "find", () => ({ select: () => ({ lean: async () => [] }) }));
}

function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile));
}

function mockCompletion({ user, profile }) {
  mock.method(User, "findById", () => ({
    select: () => ({ lean: async () => user ?? null }),
  }));
  mock.method(WorkerProfile, "findOne", () => ({ lean: async () => profile ?? null }));
}

function mockNoDuplicate() {
  mock.method(Application, "findOne", async () => null);
}

function mockCapacity(count) {
  mock.method(Assignment, "countDocuments", async () => count);
}

function setupHappyPath() {
  mockJob(openJob());
  mockCompletion({ user: WORKER_USER, profile: cloneProfile(FULL_WORKER) });
  mockNoDuplicate();
  mockCapacity(0);
  mockNoDevices();
  mock.method(Notification, "create", async (data) => ({ _id: "notif1", ...data }));
  let created = 0;
  mock.method(Application, "create", async (data) => {
    created += 1;
    return { _id: "app1", ...data };
  });
  return {
    getCreated: () => created,
  };
}

describe("applyToJob profile completion gate", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("blocks an incomplete worker and creates no application", async () => {
    let created = 0;
    mockJob(openJob());
    mockCompletion({ user: WORKER_USER, profile: null });
    mockNoDuplicate();
    mockCapacity(0);
    mock.method(Application, "create", async (data) => {
      created += 1;
      return { _id: "app1", ...data };
    });

    await assert.rejects(
      () => applyToJob("job1", WORKER_ID),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "PROFILE_INCOMPLETE");
        assert.equal(err.data.role, "worker");
        assert.ok(err.data.percentage < 100);
        assert.ok(Array.isArray(err.data.missingFields) && err.data.missingFields.length > 0);
        return true;
      }
    );

    assert.equal(created, 0, "no application must be created");
  });

  it("blocks when each of the 8 completion units is missing", async () => {
    const cases = [
      { user: { ...WORKER_USER, name: "" }, profile: cloneProfile(FULL_WORKER), missing: "NAME" },
      { user: WORKER_USER, profile: { ...cloneProfile(FULL_WORKER), profileImage: "" }, missing: "PROFILE_PHOTO" },
      { user: WORKER_USER, profile: { ...cloneProfile(FULL_WORKER), bio: "" }, missing: "BIO" },
      { user: WORKER_USER, profile: { ...cloneProfile(FULL_WORKER), phone: "" }, missing: "PHONE" },
      {
        user: WORKER_USER,
        profile: { ...cloneProfile(FULL_WORKER), location: { city: "Mumbai", state: "Maharashtra", pincode: "" } },
        missing: "LOCATION",
      },
      { user: WORKER_USER, profile: { ...cloneProfile(FULL_WORKER), skills: [] }, missing: "SKILLS" },
      { user: WORKER_USER, profile: { ...cloneProfile(FULL_WORKER), experience: "" }, missing: "EXPERIENCE" },
      { user: WORKER_USER, profile: { ...cloneProfile(FULL_WORKER), availability: "" }, missing: "AVAILABILITY" },
    ];

    for (const c of cases) {
      mock.restoreAll();
      let created = 0;
      mockJob(openJob());
      mockCompletion({ user: c.user, profile: c.profile });
      mockNoDuplicate();
      mockCapacity(0);
      mock.method(Application, "create", async (data) => {
        created += 1;
        return { _id: "app1", ...data };
      });

      await assert.rejects(
        () => applyToJob("job1", WORKER_ID),
        (err) => {
          assert.equal(err.code, "PROFILE_INCOMPLETE");
          assert.ok(err.data.missingFields.includes(c.missing), `expected ${c.missing} missing`);
          return true;
        }
      );
      assert.equal(created, 0, `${c.missing}: no application`);
    }
  });

  it("allows a fully complete worker to apply and creates the application", async () => {
    const { getCreated } = setupHappyPath();

    const result = await applyToJob("job1", WORKER_ID);

    assert.equal(result._id, "app1");
    assert.equal(getCreated(), 1, "application must be created");
  });

  it("runs existing guards before the profile completion gate", async () => {
    // Duplicate application
    mock.method(Application, "findOne", async () => ({ _id: "existing" }));
    mockJob(openJob());
    mockCapacity(0);
    await assert.rejects(() => applyToJob("job1", WORKER_ID), /already applied/);

    mock.restoreAll();

    // Capacity reached
    mockJob(openJob());
    mockNoDuplicate();
    mockCapacity(2); // >= workersRequired
    await assert.rejects(() => applyToJob("job1", WORKER_ID), /reached the required number/);

    mock.restoreAll();

    // Self-application
    mockJob(openJob({ employer: { toString: () => WORKER_ID } }));
    mockNoDuplicate();
    mockCapacity(0);
    await assert.rejects(() => applyToJob("job1", WORKER_ID), /your own job/);

    mock.restoreAll();

    // Past deadline
    mockJob(openJob({ hiringDeadline: new Date(Date.now() - 1000) }));
    mockNoDuplicate();
    mockCapacity(0);
    await assert.rejects(() => applyToJob("job1", WORKER_ID), /Hiring deadline/);

    mock.restoreAll();

    // Not open
    mockJob(openJob({ status: "DRAFT" }));
    mockNoDuplicate();
    mockCapacity(0);
    await assert.rejects(() => applyToJob("job1", WORKER_ID), /not open/);
  });
});

const JOB_SCHEDULE = {
  startDate: "2026-09-02",
  endDate: "2026-09-02",
  startTime: "10:00",
  endTime: "14:00",
};

// A chainable, thenable Application query. Awaiting the chain resolves to
// `applications`; `.distinct("worker")` resolves to `workerIds` (mimicking
// mongoose where the populate()-terminated chain awaits to the docs while
// `.distinct` resolves to the distinct values).
function applicationQuery(applications, workerIds = []) {
  const q = {
    sort: () => q,
    skip: () => q,
    limit: () => q,
    populate: () => q,
    select: () => q,
    distinct: async () => workerIds,
    then: (resolve) => resolve(applications),
  };
  return q;
}

describe("employer application views never include schedule match", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const wd = new Date("2026-09-02").getDay();
  const applications = [
    { _id: "a1", worker: { _id: "w1", name: "Worker One" }, job: "job1", status: "PENDING" },
  ];
  // A worker with a legacy weekly schedule is still accepted in storage, but the
  // employer application views must never read it or compute an availabilityMatch.
  const legacyWorker = () =>
    mock.method(WorkerProfile, "find", () => ({
      select: () => ({
        lean: async () => [{ user: "w1", weeklyAvailability: [{ day: wd, startTime: "09:00", endTime: "18:00" }] }],
      }),
    }));

  it("getEmployerApplicationsForJob does not attach availabilityMatch", async () => {
    const job = { _id: "job1", employer: { toString: () => EMPLOYER_ID }, schedule: JOB_SCHEDULE };
    mock.method(Job, "findById", async () => job);
    mock.method(Application, "find", () => applicationQuery(applications, ["w1"]));
    mock.method(Application, "countDocuments", async () => 1);
    legacyWorker();

    const result = await getEmployerApplicationsForJob("job1", EMPLOYER_ID, 1, 20);

    assert.equal(result.applications[0].availabilityMatch, undefined);
    assert.equal(result.applications[0]._id, "a1");
  });

  it("getEmployerAllApplications does not attach availabilityMatch", async () => {
    const employerJob = { _id: "job1", schedule: JOB_SCHEDULE };
    mock.method(Job, "find", () => ({ select: async () => [employerJob] }));
    mock.method(Application, "find", () => applicationQuery(applications, ["w1"]));
    mock.method(Application, "countDocuments", async () => 1);
    legacyWorker();

    const result = await getEmployerAllApplications(EMPLOYER_ID, 1, 20);

    assert.equal(result.applications[0].availabilityMatch, undefined);
  });

  it("getEmployerApplicationById does not attach availabilityMatch", async () => {
    const application = {
      _id: "a1",
      worker: { _id: "w1", name: "Worker One" },
      job: { _id: "job1", employer: { _id: EMPLOYER_ID }, schedule: JOB_SCHEDULE },
      status: "PENDING",
    };
    mock.method(Application, "findById", () => ({
      populate: () => ({ populate: () => ({ popupulate: 0, ...application }) }),
    }));
    legacyWorker();

    const result = await getEmployerApplicationById("a1", EMPLOYER_ID);

    assert.equal(result.availabilityMatch, undefined);
    assert.equal(result._id, "a1");
  });
});
