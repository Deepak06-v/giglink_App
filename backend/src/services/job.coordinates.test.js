import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import Job from "../models/Job.js";
import { createJob } from "./job.service.js";

afterEach(() => {
  mock.restoreAll();
});

const baseJobData = {
  title: "Warehouse helpers",
  description: "Help with packing and loading",
  category: "WAREHOUSE",
  workersRequired: 3,
  schedule: {
    startDate: "2026-09-01",
    endDate: "2026-09-03",
    startTime: "09:00",
    endTime: "17:00",
  },
  compensation: {
    type: "hourly",
    amount: 200,
    currency: "INR",
  },
  location: {
    address: "123 Example Street",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
  },
};

describe("createJob coordinates (address-only MVP)", () => {
  it("address-only: creates a job without coordinates", async () => {
    let created;
    mock.method(Job, "create", async (doc) => {
      created = doc;
      return { ...doc, toObject: () => ({ ...doc }) };
    });

    const result = await createJob("emp1", baseJobData);

    assert.ok(result, "job is created");
    assert.equal(created.location.address, "123 Example Street");
    assert.equal(created.location.coordinates, undefined, "coordinates must be omitted");
  });

  it("valid coordinates: stores them normally", async () => {
    let created;
    mock.method(Job, "create", async (doc) => {
      created = doc;
      return { ...doc, toObject: () => ({ ...doc }) };
    });

    const data = {
      ...baseJobData,
      location: {
        ...baseJobData.location,
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
      },
    };

    const result = await createJob("emp1", data);

    assert.ok(result);
    assert.equal(created.location.coordinates.latitude, 12.9716);
    assert.equal(created.location.coordinates.longitude, 77.5946);
  });

  it("invalid latitude: rejects", async () => {
    const data = {
      ...baseJobData,
      location: {
        ...baseJobData.location,
        coordinates: { latitude: 999, longitude: 77.5946 },
      },
    };

    await assert.rejects(
      () => createJob("emp1", data),
      /Location validation failed/
    );
  });

  it("invalid longitude: rejects", async () => {
    const data = {
      ...baseJobData,
      location: {
        ...baseJobData.location,
        coordinates: { latitude: 12.9716, longitude: 999 },
      },
    };

    await assert.rejects(
      () => createJob("emp1", data),
      /Location validation failed/
    );
  });

  it("only latitude: rejects", async () => {
    const data = {
      ...baseJobData,
      location: {
        ...baseJobData.location,
        coordinates: { latitude: 12.9716 },
      },
    };

    await assert.rejects(
      () => createJob("emp1", data),
      /Location validation failed/
    );
  });

  it("only longitude: rejects", async () => {
    const data = {
      ...baseJobData,
      location: {
        ...baseJobData.location,
        coordinates: { longitude: 77.5946 },
      },
    };

    await assert.rejects(
      () => createJob("emp1", data),
      /Location validation failed/
    );
  });

  it("empty coordinates object: treated as address-only", async () => {
    let created;
    mock.method(Job, "create", async (doc) => {
      created = doc;
      return { ...doc, toObject: () => ({ ...doc }) };
    });

    const data = {
      ...baseJobData,
      location: { ...baseJobData.location, coordinates: {} },
    };

    const result = await createJob("emp1", data);

    assert.ok(result);
    assert.equal(created.location.coordinates, undefined);
  });
});
