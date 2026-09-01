import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildUploadAuthorization,
  getUploadSignature,
  ALLOWED_FORMATS,
  MAX_UPLOAD_BYTES,
} from "./upload.service.js";

const ORIGINAL_ENV = { ...process.env };

const CLAUD = {
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-api-key",
  CLOUDINARY_API_SECRET: "test-api-secret",
};

describe("buildUploadAuthorization (role/type authorization)", () => {
  it("allows a worker to build worker_profile authorization", () => {
    const result = buildUploadAuthorization({
      type: "worker_profile",
      userId: "w1",
      role: "worker",
    });
    assert.equal(result.assetType, "worker_profile");
    assert.equal(result.field, "profileImage");
    assert.match(result.publicId, /^giglink\/users\/w1\/profile\/avatar$/);
  });

  it("allows an employer to build employer_logo authorization", () => {
    const result = buildUploadAuthorization({
      type: "employer_logo",
      userId: "e1",
      role: "employer",
    });
    assert.equal(result.assetType, "employer_logo");
    assert.equal(result.field, "logo");
    assert.match(result.publicId, /^giglink\/users\/e1\/company-logo\/logo$/);
  });

  it("rejects a worker requesting an employer logo authorization (403)", () => {
    assert.throws(
      () =>
        buildUploadAuthorization({
          type: "employer_logo",
          userId: "w1",
          role: "worker",
        }),
      (err) => err.statusCode === 403,
    );
  });

  it("rejects an employer requesting a worker profile authorization (403)", () => {
    assert.throws(
      () =>
        buildUploadAuthorization({
          type: "worker_profile",
          userId: "e1",
          role: "employer",
        }),
      (err) => err.statusCode === 403,
    );
  });

  it("rejects an unknown asset type (400)", () => {
    assert.throws(
      () =>
        buildUploadAuthorization({
          type: "gigantic_file",
          userId: "w1",
          role: "worker",
        }),
      (err) => err.statusCode === 400,
    );
  });
});

describe("getUploadSignature", () => {
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = CLAUD.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_API_KEY = CLAUD.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_SECRET = CLAUD.CLOUDINARY_API_SECRET;
  });

  afterEach(() => {
    // Restore the original env so tests do not leak configuration.
    for (const key of Object.keys(CLAUD)) {
      if (ORIGINAL_ENV[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = ORIGINAL_ENV[key];
      }
    }
  });

  it("returns a signature payload with no secret for a worker photo", () => {
    const payload = getUploadSignature({
      type: "worker_profile",
      userId: "w1",
      role: "worker",
    });

    assert.equal(payload.cloudName, "test-cloud");
    assert.equal(payload.apiKey, "test-api-key");
    assert.equal(payload.resourceType, "image");
    assert.match(payload.publicId, /^giglink\/users\/w1\/profile\/avatar$/);
    assert.equal(payload.field, "profileImage");
    assert.equal(payload.transformation, "c_fill,g_auto,w_400,h_400");
    assert.ok(payload.timestamp > 0);
    assert.ok(typeof payload.signature === "string" && payload.signature.length > 0);

    const serialized = JSON.stringify(payload).toLowerCase();
    assert.ok(!serialized.includes("api_secret"));
    assert.ok(!serialized.includes("test-api-secret"));
    assert.ok(!serialized.includes("secret"));
  });

  it("returns a signature payload with no secret for an employer logo", () => {
    const payload = getUploadSignature({
      type: "employer_logo",
      userId: "e1",
      role: "employer",
    });
    assert.equal(payload.field, "logo");
    assert.equal(payload.transformation, "c_fit,w_400,h_400");
    assert.ok(payload.signature.length > 0);
    const serialized = JSON.stringify(payload).toLowerCase();
    assert.ok(!serialized.includes("api_secret"));
    assert.ok(!serialized.includes("secret"));
  });

  it("exposes allowed formats and size limits (no secret)", () => {
    const payload = getUploadSignature({
      type: "worker_profile",
      userId: "w1",
      role: "worker",
    });
    assert.deepEqual(payload.maxBytes, MAX_UPLOAD_BYTES);
    assert.deepEqual(payload.allowedFormats, ALLOWED_FORMATS);
    assert.ok(payload.allowedFormats.includes("jpg"));
    assert.ok(payload.allowedFormats.includes("png"));
    assert.ok(payload.allowedFormats.includes("webp"));
  });

  it("throws 503 when Cloudinary is not configured", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    assert.throws(
      () =>
        getUploadSignature({
          type: "worker_profile",
          userId: "w1",
          role: "worker",
        }),
      (err) => err.statusCode === 503,
    );
  });
});
