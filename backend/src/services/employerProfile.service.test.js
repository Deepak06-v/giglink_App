import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import EmployerProfile from "../models/EmployerProfile.js";
import { getEmployerProfile, createOrUpdateEmployerProfile } from "./employerProfile.service.js";

const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

// A mock query that mimics mongoose: calling .lean() returns a plain object
// (whatever the store hands back). Without .lean() the chain still resolves.
function queryResult(value) {
  return {
    lean: async () => value,
  };
}

describe("getEmployerProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns the stored profile with its full company fields (plain object, top-level)", async () => {
    const stored = {
      user: USER_ID,
      companyName: "Acme Events",
      companyDescription: "We run great events",
      phone: "+919888888888",
      address: "100 Main Rd",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    };
    mock.method(EmployerProfile, "findOne", () => queryResult(stored));

    const result = await getEmployerProfile(USER_ID);
    assert.equal(result.companyName, "Acme Events");
    assert.equal(result.city, "Pune");
    assert.equal(result.state, "Maharashtra");
    assert.equal(result.pincode, "411001");
    // The returned object must be a plain JSON-able object with top-level fields,
    // NOT a hydrated mongoose document whose values hide under `_doc`.
    assert.deepEqual(JSON.parse(JSON.stringify(result)).companyName, "Acme Events");
    assert.equal(JSON.parse(JSON.stringify(result))._doc, undefined);
  });

  it("returns an empty default object when no profile exists yet", async () => {
    mock.method(EmployerProfile, "findOne", () => queryResult(null));

    const result = await getEmployerProfile(USER_ID);
    assert.equal(result.user, USER_ID);
    assert.equal(result.companyName, "");
    assert.equal(result.state, "");
  });

  it("REGRESSION: a hydrated mongoose doc from findOne is returned as a plain object (no _doc leak)", async () => {
    // Simulate the real data store: findOne resolves to a hydrated EmployerProfile
    // document (as mongoose does without .lean()). The service must .lean() it so
    // the controller's `{ ...profile, completion }` spread exposes the fields at
    // the top level instead of burying them under the document's internal _doc.
    const doc = new EmployerProfile({
      user: USER_ID,
      companyName: "TEST COMPANY 123",
      phone: "9999999999",
      companyDescription: "TEST DESCRIPTION 456",
      address: "1 Main Rd",
      city: "TEST LOCATION 999",
      state: "KA",
      pincode: "560001",
    });

    // Prove the failing scenario is real: spreading the hydrated document does NOT
    // put fields at the top level.
    const rawSpread = { ...doc };
    assert.equal(rawSpread.companyName, undefined);

    mock.method(EmployerProfile, "findOne", () => ({
      lean: async () => doc.toObject(),
    }));

    const result = await getEmployerProfile(USER_ID);
    assert.equal(result.companyName, "TEST COMPANY 123");
    assert.equal(result.phone, "9999999999");
    assert.equal(result.companyDescription, "TEST DESCRIPTION 456");
    assert.equal(result.city, "TEST LOCATION 999");
    const serialized = JSON.parse(JSON.stringify(result));
    assert.equal(serialized.companyName, "TEST COMPANY 123");
    assert.equal(serialized._doc, undefined);
  });
});

describe("createOrUpdateEmployerProfile (round-trip persistence)", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("persists the exact fields submitted and returns the updated (plain) document", async () => {
    const saved = {
      user: USER_ID,
      companyName: "Acme Events",
      companyDescription: "We run great events",
      phone: "+919888888888",
      address: "100 Main Rd",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    };

    let capturedUpdate = null;
    mock.method(EmployerProfile, "findOneAndUpdate", (query, update) => {
      capturedUpdate = update;
      return queryResult(saved);
    });

    const result = await createOrUpdateEmployerProfile(USER_ID, {
      companyName: "Acme Events",
      companyDescription: "We run great events",
      phone: "+919888888888",
      address: "100 Main Rd",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    });

    assert.deepEqual(capturedUpdate.$set, {
      companyName: "Acme Events",
      companyDescription: "We run great events",
      phone: "+919888888888",
      address: "100 Main Rd",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    });
    assert.equal(result.city, "Pune");
    assert.equal(JSON.parse(JSON.stringify(result))._doc, undefined);
  });

  it("REGRESSION: a hydrated doc returned by findOneAndUpdate is returned as a plain object", async () => {
    const saved = new EmployerProfile({
      user: USER_ID,
      companyName: "TEST COMPANY 123",
      phone: "9999999999",
      companyDescription: "TEST DESCRIPTION 456",
      address: "1 Main Rd",
      city: "TEST LOCATION 999",
      state: "KA",
      pincode: "560001",
    });

    mock.method(EmployerProfile, "findOneAndUpdate", () => ({
      lean: async () => saved.toObject(),
    }));

    const result = await createOrUpdateEmployerProfile(USER_ID, {
      companyName: "TEST COMPANY 123",
      phone: "9999999999",
    });

    assert.equal(result.city, "TEST LOCATION 999");
    const serialized = JSON.parse(JSON.stringify(result));
    assert.equal(serialized.companyName, "TEST COMPANY 123");
    assert.equal(serialized._doc, undefined);
  });

  it("a subsequent GET returns the same persisted values (no data loss)", async () => {
    const persisted = {
      user: USER_ID,
      companyName: "Acme Events",
      companyDescription: "We run great events",
      phone: "+919888888888",
      address: "100 Main Rd",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    };
    // Mock the store so the create/update returns `persisted`, then GET finds it.
    mock.method(EmployerProfile, "findOneAndUpdate", () => queryResult(persisted));

    const updated = await createOrUpdateEmployerProfile(USER_ID, {
      companyName: "Acme Events",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    });

    // Same underlying document is what GET reads back — display and stored state agree.
    assert.equal(updated.city, "Pune");
    assert.deepEqual(updated, persisted);
  });

  it("protects against writing protected fields (user) back", async () => {
    let capturedUpdate = null;
    mock.method(EmployerProfile, "findOneAndUpdate", (query, update) => {
      capturedUpdate = update;
      return queryResult({});
    });

    await createOrUpdateEmployerProfile(USER_ID, {
      user: "malicious-user-id",
      companyName: "Acme",
    });

    assert.equal(capturedUpdate.$set.user, undefined);
    assert.equal(capturedUpdate.$set.companyName, "Acme");
  });

  it("upserts with new:true so a first-time employer is created", async () => {
    let capturedOptions = null;
    mock.method(EmployerProfile, "findOneAndUpdate", (query, update, options) => {
      capturedOptions = options;
      return queryResult({ user: USER_ID, companyName: "Acme" });
    });

    await createOrUpdateEmployerProfile(USER_ID, { companyName: "Acme" });

    assert.equal(capturedOptions.upsert, true);
    assert.equal(capturedOptions.new, true);
    assert.equal(capturedOptions.runValidators, true);
  });
});