import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import Job from "../models/Job.js";
import Assignment from "../models/Assignment.js";
import { getCompletionStatus } from "./completion.service.js";

const EMPLOYER_ID = "employer1";
const WORKER_ID = "worker1";
const STRANGER_ID = "stranger1";
const JOB_ID = "job1";

const mockJob = (overrides = {}) => {
  const job = {
    _id: JOB_ID,
    status: "IN_PROGRESS",
    workersRequired: 1,
    employer: { toString: () => EMPLOYER_ID },
    completion: { employerCompleted: false },
    ...overrides,
  };
  mock.method(Job, "findById", async () => job);
  return job;
};

const mockActiveAssignments = (workers) => {
  const assignments = workers.map((worker) => ({
    worker: { toString: () => worker },
    workerCompleted: false,
  }));
  mock.method(Assignment, "find", async () => assignments);
};

describe("getCompletionStatus authorization", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("allows the job employer to view completion status", async () => {
    mockJob();
    mockActiveAssignments([WORKER_ID]);

    const result = await getCompletionStatus(JOB_ID, EMPLOYER_ID);
    assert.equal(result.jobStatus, "IN_PROGRESS");
    assert.equal(result.completion.workersRequired, 1);
  });

  it("allows an assigned worker to view completion status", async () => {
    mockJob();
    mockActiveAssignments([WORKER_ID]);

    const result = await getCompletionStatus(JOB_ID, WORKER_ID);
    assert.equal(result.jobStatus, "IN_PROGRESS");
  });

  it("rejects an unauthenticated requester with 404 (no existence leak)", async () => {
    mockJob();
    mockActiveAssignments([WORKER_ID]);

    await assert.rejects(
      () => getCompletionStatus(JOB_ID, null),
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  it("rejects a user neither employed by nor assigned to the job with 404", async () => {
    mockJob();
    mockActiveAssignments([WORKER_ID]);

    await assert.rejects(
      () => getCompletionStatus(JOB_ID, STRANGER_ID),
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });
});
