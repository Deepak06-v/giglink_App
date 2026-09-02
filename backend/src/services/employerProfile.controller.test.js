import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import EmployerProfile from "../models/EmployerProfile.js";
import { getEmployerProfileController } from "../controllers/employerProfile.controller.js";

// Build a fake Express res that captures the JSON body.
function fakeRes() {
  return {
    body: null,
    statusCode: 200,
    json(obj) {
      this.body = obj;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

// getEmployerProfile calls EmployerProfile.findOne({...}).findOne() does not call lean;
// getEmployerProfileCompletion calls EmployerProfile.findOne({...}).lean().
function mockEmployerProfileStored(profile) {
  mock.method(EmployerProfile, "findOne", () => {
    const base = { lean: () => Promise.resolve(profile) };
    return Object.assign(base, { ...profile });
  });
}

describe("getEmployerProfileController response shape", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns data.profile = { profile fields, completion } — the shape the mobile client reads", async () => {
    const profile = {
      user: "e1",
      companyName: "Acme Events",
      companyDescription: "We run great events",
      phone: "+919888888888",
      logo: "https://cdn.example.com/logo.png",
      address: "100 Main Rd",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
    };
    mockEmployerProfileStored(profile);

    const req = { user: { userId: "e1" } };
    const res = fakeRes();
    await getEmployerProfileController(req, res);

    // The mobile client reads response.data.data.profile and renders profile.completion.
    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.companyName, "Acme Events");
    // Completion is computed from the same persisted doc the controller returns.
    assert.equal(mobileProfile.completion.complete, true);
    assert.equal(mobileProfile.completion.percentage, 100);
  });

  it("completion is derived from the same source as the stored profile (cannot disagree)", async () => {
    // Partial employer profile: stored fields are missing, so completion is partial —
    // but the same document drives both the displayed fields and the % badge.
    const incomplete = {
      user: "e1",
      companyName: "Acme Events",
      companyDescription: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    };
    mockEmployerProfileStored(incomplete);

    const req = { user: { userId: "e1" } };
    const res = fakeRes();
    await getEmployerProfileController(req, res);

    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.companyName, "Acme Events");
    assert.equal(mobileProfile.completion.complete, false);
    assert.ok(mobileProfile.completion.missingFields.includes("COMPANY_DESCRIPTION"));
  });

  it("REGRESSION: a real hydrated mongoose doc is serialized with top-level fields (no _doc leak)", async () => {
    // Simulate the actual data store: findOne resolves to a *hydrated* EmployerProfile
    // document (mongoose default without .lean()). Spreading it hides the field values
    // under `_doc`, so res.json would deliver data.profile.{companyName,...} as undefined
    // even though completion (read via .lean()) is 100%. The service must .lean() first.
    const doc = new EmployerProfile({
      user: "e1",
      companyName: "TEST COMPANY 123",
      companyDescription: "TEST DESCRIPTION 456",
      phone: "9999999999",
      logo: "https://cdn.example.com/logo.png",
      address: "1 Main Rd",
      city: "TEST LOCATION 999",
      state: "KA",
      pincode: "560001",
    });

    mock.method(EmployerProfile, "findOne", () => ({
      lean: () => Promise.resolve(doc.toObject()),
    }));

    const req = { user: { userId: "e1" } };
    const res = fakeRes();
    await getEmployerProfileController(req, res);

    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.companyName, "TEST COMPANY 123");
    assert.equal(mobileProfile.phone, "9999999999");
    assert.equal(mobileProfile.companyDescription, "TEST DESCRIPTION 456");
    assert.equal(mobileProfile.address, "1 Main Rd");
    assert.equal(mobileProfile.city, "TEST LOCATION 999");
    assert.equal(mobileProfile.state, "KA");
    assert.equal(mobileProfile.pincode, "560001");
    assert.equal(mobileProfile._doc, undefined);
    assert.equal(mobileProfile.completion.percentage, 100);
  });

  it("returns an error JSON with a 500 on service failure", async () => {
    mock.method(EmployerProfile, "findOne", () => {
      throw new Error("boom");
    });

    const req = { user: { userId: "e1" } };
    const res = fakeRes();
    await getEmployerProfileController(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});
