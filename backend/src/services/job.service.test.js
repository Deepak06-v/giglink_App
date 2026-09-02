import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import Job from "../models/Job.js";
import EmployerProfile from "../models/EmployerProfile.js";
import WorkerProfile from "../models/WorkerProfile.js";
import Application from "../models/Application.js";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import {
  buildDiscoveryFilter,
  createJob,
  updateJob,
  getJobByIdPublic,
  getPublicJobs,
} from "./job.service.js";

describe("buildDiscoveryFilter", () => {
  it("search only: keeps top-level $or and only the hiringDeadline $and group", () => {
    const filter = buildDiscoveryFilter({ q: "delivery" });

    assert.equal(filter.status, "OPEN");
    assert.ok(filter.$or, "search should be a top-level $or");
    assert.deepEqual(
      filter.$or.map((c) => Object.keys(c)[0]),
      ["title", "description", "category"]
    );
    for (const cond of filter.$or) {
      const value = Object.values(cond)[0];
      assert.ok(value instanceof RegExp, "search terms should be case-insensitive regexes");
      assert.equal(value.flags, "i");
    }
    assert.equal(filter.$and.length, 1);
  });

  it("date only: keeps top-level $or on startDate and legacy date field", () => {
    const filter = buildDiscoveryFilter({ date: "2026-08-20" });

    assert.equal(filter.status, "OPEN");
    assert.ok(filter.$or);
    assert.deepEqual(
      filter.$or.map((c) => Object.keys(c)[0]),
      ["schedule.startDate", "schedule.date"]
    );
    const dayRange = filter.$or[0]["schedule.startDate"];
    assert.ok(dayRange.$gte instanceof Date);
    assert.ok(dayRange.$lte instanceof Date);
    assert.equal(dayRange.$gte.getHours(), 0);
    assert.equal(dayRange.$lte.getHours(), 23);
    assert.equal(filter.$and.length, 1);
  });

  it("search + date: composes BOTH groups under $and (AND semantics)", () => {
    const filter = buildDiscoveryFilter({ q: "delivery", date: "2026-08-20" });

    assert.equal(filter.status, "OPEN");
    assert.equal(filter.$or, undefined, "multiple OR groups must not overwrite each other");
    assert.equal(filter.$and.length, 3, "search OR + date OR + hiringDeadline OR");

    const orKeysOf = (group) => group.$or.map((c) => Object.keys(c)[0]);

    const searchGroup = filter.$and.find((g) =>
      ["title", "description", "category"].every((k) => orKeysOf(g).includes(k))
    );
    assert.ok(searchGroup, "search OR group must be present in $and");
    assert.equal(searchGroup.$or.length, 3);

    const dateGroup = filter.$and.find((g) =>
      ["schedule.startDate", "schedule.date"].every((k) => orKeysOf(g).includes(k))
    );
    assert.ok(dateGroup, "date OR group must be present in $and");
    assert.equal(dateGroup.$or.length, 2);

    const deadlineGroup = filter.$and.find((g) => orKeysOf(g).includes("hiringDeadline"));
    assert.ok(deadlineGroup, "hiringDeadline OR group must be present in $and");
    assert.equal(deadlineGroup.$or.length, 3);
  });

  it("search + other filters: search survives alongside category/city/pay/type", () => {
    const filter = buildDiscoveryFilter({
      q: "cleaning",
      category: "CLEANING",
      city: "Mumbai",
      minPay: "500",
      maxPay: "2000",
      compensationType: "hourly",
    });

    assert.equal(filter.status, "OPEN");
    assert.ok(filter.$or, "single OR group stays top-level");
    assert.equal(filter.$and.length, 1);
    assert.equal(filter.category, "CLEANING");
    assert.ok(filter["location.city"] instanceof RegExp);
    assert.deepEqual(filter["compensation.amount"], { $gte: 500, $lte: 2000 });
    assert.equal(filter["compensation.type"], "hourly");
  });

  it("date + other filters: date survives alongside category/pay", () => {
    const filter = buildDiscoveryFilter({
      date: "2026-08-20",
      category: "WAREHOUSE",
      minPay: "1000",
    });

    assert.ok(filter.$or, "single OR group stays top-level");
    assert.equal(filter.$and.length, 1);
    assert.equal(filter.category, "WAREHOUSE");
    assert.deepEqual(filter["compensation.amount"], { $gte: 1000 });
  });

  it("neither search nor date: no top-level $or, only hiringDeadline $and group", () => {
    const filter = buildDiscoveryFilter({});

    assert.equal(filter.status, "OPEN");
    assert.equal(filter.$or, undefined);
    assert.equal(filter.$and.length, 1);
  });

  it("fromDate/toDate only: keeps top-level $or range group", () => {
    const filter = buildDiscoveryFilter({ fromDate: "2026-08-20", toDate: "2026-08-23" });

    assert.ok(filter.$or);
    assert.equal(filter.$or.length, 2);
    const range = filter.$or[0]["schedule.startDate"];
    assert.ok(range.$gte instanceof Date);
    assert.ok(range.$lte instanceof Date);
    assert.equal(filter.$and.length, 1);
  });

  it("search + fromDate/toDate: composes BOTH groups under $and", () => {
    const filter = buildDiscoveryFilter({ q: "delivery", fromDate: "2026-08-20", toDate: "2026-08-23" });

    assert.equal(filter.$or, undefined);
    assert.equal(filter.$and.length, 3);
  });

  it("validation still throws for bad input", () => {
    assert.throws(() => buildDiscoveryFilter({ category: "NOPE" }), /Invalid category/);
    assert.throws(() => buildDiscoveryFilter({ date: "not-a-date" }), /Invalid date format/);
    assert.throws(
      () => buildDiscoveryFilter({ minPay: "500", maxPay: "100" }),
      /minPay cannot be greater than maxPay/
    );
  });
});

const EMPLOYER_ID = "e1";
const FULL_EMPLOYER = {
  _id: "ep1",
  user: EMPLOYER_ID,
  companyName: "Acme Events",
  companyDescription: "We run great events",
  phone: "+919888888888",
  logo: "https://cdn.example.com/logo.png",
  address: "100 Main Rd",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
};

function mockJobDoc(status) {
  const job = {
    _id: "job1",
    employer: EMPLOYER_ID,
    status,
    saveCount: 0,
    toObject() {
      return { ...this };
    },
    async save() {
      this.saveCount += 1;
      return this;
    },
  };
  mock.method(Job, "findOne", async () => job);
  return job;
}

function mockEmployerCompletion(profile) {
  mock.method(EmployerProfile, "findOne", () => ({ lean: async () => profile ?? null }));
}

describe("updateJob profile completion publish gate", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("blocks DRAFT -> OPEN when the employer profile is incomplete and keeps the job DRAFT", async () => {
    const job = mockJobDoc("DRAFT");
    mockEmployerCompletion({ ...FULL_EMPLOYER, logo: "" });

    await assert.rejects(
      () => updateJob("job1", EMPLOYER_ID, { status: "OPEN" }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "PROFILE_INCOMPLETE");
        assert.equal(err.data.role, "employer");
        assert.ok(err.data.percentage < 100);
        assert.ok(err.data.missingFields.includes("COMPANY_LOGO"));
        return true;
      }
    );

    assert.equal(job.status, "DRAFT", "job must remain DRAFT when publishing is blocked");
    assert.equal(job.saveCount, 0, "nothing must be persisted");
  });

  it("allows DRAFT -> OPEN when the employer profile is complete", async () => {
    const job = mockJobDoc("DRAFT");
    mockEmployerCompletion(FULL_EMPLOYER);

    const result = await updateJob("job1", EMPLOYER_ID, { status: "OPEN" });

    assert.equal(job.status, "OPEN");
    assert.equal(result.status, "OPEN");
  });

  it("allows an incomplete employer to edit a DRAFT without setting status OPEN", async () => {
    const job = mockJobDoc("DRAFT");
    mockEmployerCompletion({ ...FULL_EMPLOYER, logo: "" });

    const result = await updateJob("job1", EMPLOYER_ID, { title: "Updated title" });

    assert.equal(job.status, "DRAFT");
    assert.equal(job.title, "Updated title");
    assert.equal(result.title, "Updated title");
  });

  it("does not block editing an already OPEN job that is not transitioning to OPEN", async () => {
    // Even with an incomplete employer, updating a non-DRAFT->OPEN state is allowed
    // when the current status is already OPEN (no transition into OPEN is requested).
    const job = mockJobDoc("OPEN");
    mockEmployerCompletion({ ...FULL_EMPLOYER, logo: "" });

    const result = await updateJob("job1", EMPLOYER_ID, { description: "More details" });

    assert.equal(job.status, "OPEN");
    assert.equal(job.description, "More details");
    assert.equal(result.description, "More details");
  });

  it("allows other updates for an incomplete employer without status OPEN", async () => {
    const job = mockJobDoc("DRAFT");
    mockEmployerCompletion({ ...FULL_EMPLOYER, logo: "" });

    const result = await updateJob("job1", EMPLOYER_ID, { compensation: { type: "hourly", amount: 500 } });

    assert.equal(job.status, "DRAFT");
    assert.equal(result.compensation.amount, 500);
  });
});

describe("createJob", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("always creates a job with status DRAFT", async () => {
    const input = {
      title: "Event helper",
      description: "Help run an event",
      category: "EVENT_STAFF",
      location: { address: "1 Main Rd", city: "Pune", state: "Maharashtra", pincode: "411001" },
      schedule: {
        startDate: "2026-09-01",
        endDate: "2026-09-02",
        startTime: "09:00",
        endTime: "18:00",
      },
      compensation: { type: "hourly", amount: 500 },
      workersRequired: 2,
    };
    let created = null;
    mock.method(Job, "create", async (data) => {
      created = data;
      return { ...data, toObject: () => ({ ...data }) };
    });

    const result = await createJob("e1", input);

    assert.equal(created.status, "DRAFT", "createJob must always create a DRAFT job");
    assert.equal(result.status, "DRAFT");
  });
});

const WORKER_ID = "w1";
const JOB_SCHEDULE = {
  startDate: "2026-09-02",
  endDate: "2026-09-02",
  startTime: "10:00",
  endTime: "14:00",
};

function chain(final) {
  const q = {
    sort: () => q,
    skip: () => q,
    limit: () => q,
    populate: () => q,
    select: () => q,
    lean: async () => final,
  };
  return q;
}

describe("removed schedule-matching is inert", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const job = {
    _id: "job1",
    status: "OPEN",
    hiringDeadline: null,
    employer: "emp1",
    workersRequired: 2,
    schedule: JOB_SCHEDULE,
  };

  function basePublicJobsSetup(extraJobs = []) {
    mock.method(Job, "find", () => chain([job, ...extraJobs]));
    mock.method(Job, "countDocuments", async () => 1 + extraJobs.length);
    mock.method(Application, "find", () => chain([]));
    mock.method(Assignment, "find", () => chain([]));
    mock.method(Assignment, "aggregate", async () => []);
  }

  // A WorkerProfile with a legacy schedule is still accepted in storage, but
  // the job feed must NOT read it or compute any availabilityMatch.
  function mockLegacyAvailabilitySchedule() {
    mock.method(
      WorkerProfile,
      "findOne",
      () => ({ select: () => ({ lean: async () => ({ user: WORKER_ID, weeklyAvailability: [{ day: 3, startTime: "09:00", endTime: "18:00" }] }) }) })
    );
  }

  it("getJobByIdPublic never attaches availabilityMatch and does not read the worker schedule", async () => {
    mock.method(Job, "findById", () => ({ lean: async () => ({ ...job }) }));
    mock.method(
      EmployerProfile,
      "findOne",
      () => ({ select: () => ({ lean: async () => ({ companyName: "Acme", logo: "x.png" }) }) })
    );
    mock.method(Application, "findOne", () => ({ lean: async () => null }));
    mock.method(Assignment, "findOne", () => ({ lean: async () => null }));
    const workerProfileSpy = mock.method(
      WorkerProfile,
      "findOne",
      () => ({ select: () => ({ lean: async () => ({ user: WORKER_ID, weeklyAvailability: [{ day: 3, startTime: "09:00", endTime: "18:00" }] }) }) })
    );

    const result = await getJobByIdPublic("job1", WORKER_ID);

    // The schedule-match concept was removed from the product: no availabilityMatch
    // field, and the worker's weekly schedule is never consulted.
    assert.equal(result.availabilityMatch, undefined);
    assert.equal(workerProfileSpy.mock.callCount(), 0);
  });

  it("getJobByIdPublic returns the job without availabilityMatch for signed-in and anonymous workers", async () => {
    mock.method(Job, "findById", () => ({ lean: async () => ({ ...job }) }));
    mock.method(
      EmployerProfile,
      "findOne",
      () => ({ select: () => ({ lean: async () => ({ companyName: "Acme", logo: "x.png" }) }) })
    );
    mock.method(Application, "findOne", () => ({ lean: async () => null }));
    mock.method(Assignment, "findOne", () => ({ lean: async () => null }));

    const asWorker = await getJobByIdPublic("job1", WORKER_ID);
    const asAnonymous = await getJobByIdPublic("job1", null);

    // Schedule matching is removed: neither view carries availabilityMatch, and a
    // worker with a legacy schedule sees the same match-free payload as a visitor.
    assert.equal(asWorker.availabilityMatch, undefined);
    assert.equal(asAnonymous.availabilityMatch, undefined);
  });

  it("getPublicJobs never attaches availabilityMatch to feed jobs", async () => {
    mockLegacyAvailabilitySchedule();
    basePublicJobsSetup();

    const result = await getPublicJobs({ page: 1, limit: 20 }, WORKER_ID);

    assert.equal(result.jobs.length, 1);
    assert.equal(result.jobs[0].availabilityMatch, undefined);
  });

  it("availableOnly never hides jobs (no schedule-linked filtering)", async () => {
    mockLegacyAvailabilitySchedule();
    basePublicJobsSetup();

    const result = await getPublicJobs(
      { page: 1, limit: 20, availableOnly: "true" },
      WORKER_ID
    );

    // availableOnly is inert: every eligible job is returned, none hidden.
    assert.equal(result.pagination.total, 1);
    assert.deepEqual(result.jobs.map((j) => j._id), ["job1"]);
  });

  it("best_match falls back to the default (newest) sort", async () => {
    const jobOlder = { ...job, _id: "jobOlder" };
    const jobNewer = { ...job, _id: "jobNewer" };
    mockLegacyAvailabilitySchedule();
    // chain() returns docs in input order; the default sort is newest-first.
    mock.method(Job, "find", () => chain([jobOlder, jobNewer]));
    mock.method(Job, "countDocuments", async () => 2);
    mock.method(Application, "find", () => chain([]));
    mock.method(Assignment, "find", () => chain([]));
    mock.method(Assignment, "aggregate", async () => []);

    const result = await getPublicJobs(
      { page: 1, limit: 20, sort: "best_match" },
      WORKER_ID
    );

    // best_match no longer re-ranks by schedule; it behaves like the base path.
    assert.equal(result.pagination.total, 2);
    assert.equal(result.jobs[0].availabilityMatch, undefined);
  });
});


