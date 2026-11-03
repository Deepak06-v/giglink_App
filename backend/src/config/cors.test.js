import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../app.js";
import { isOriginAllowed, allowedOrigins, corsOptions } from "./cors.js";

describe("CORS configuration and origin validation", () => {
  it("allows production frontend URL https://frontend-lo6d.vercel.app", () => {
    assert.equal(isOriginAllowed("https://frontend-lo6d.vercel.app"), true);
  });

  it("allows production frontend URL with trailing slash", () => {
    assert.equal(isOriginAllowed("https://frontend-lo6d.vercel.app/"), true);
  });

  it("allows local development origins", () => {
    assert.equal(isOriginAllowed("http://localhost:5173"), true);
    assert.equal(isOriginAllowed("http://127.0.0.1:5173"), true);
    assert.equal(isOriginAllowed("http://localhost:3000"), true);
    assert.equal(isOriginAllowed("http://localhost:8081"), true);
  });

  it("allows mobile app requests without Origin header", () => {
    assert.equal(isOriginAllowed(undefined), true);
    assert.equal(isOriginAllowed(""), true);
    assert.equal(isOriginAllowed(null), true);
  });

  it("allows FixMate frontend Vercel preview URLs", () => {
    assert.equal(isOriginAllowed("https://frontend-preview-fixmate.vercel.app"), true);
    assert.equal(isOriginAllowed("https://frontend-abc123.vercel.app"), true);
  });

  it("rejects unauthorized external origins", () => {
    assert.equal(isOriginAllowed("https://evil-site.com"), false);
    assert.equal(isOriginAllowed("https://another-site.vercel.app"), false);
  });

  it("verifies corsOptions structure and allowed headers", () => {
    assert.equal(corsOptions.credentials, true);
    assert.ok(corsOptions.methods.includes("GET"));
    assert.ok(corsOptions.methods.includes("POST"));
    assert.ok(corsOptions.methods.includes("OPTIONS"));
    assert.ok(corsOptions.allowedHeaders.includes("Content-Type"));
    assert.ok(corsOptions.allowedHeaders.includes("Authorization"));
  });
});

describe("Live Express CORS Preflight & Error Handling", () => {
  let server;
  let port;

  it("handles OPTIONS preflight with status 200 and required CORS headers", async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        port = server.address().port;
        resolve();
      });
    });

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://frontend-lo6d.vercel.app",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type,Authorization",
        },
      });

      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        "https://frontend-lo6d.vercel.app"
      );
      assert.equal(res.headers.get("access-control-allow-credentials"), "true");
      assert.ok(
        res.headers.get("access-control-allow-methods")?.includes("POST")
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("attaches CORS headers even on 404 / error responses for allowed origins", async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        port = server.address().port;
        resolve();
      });
    });

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/non-existent-route`, {
        method: "GET",
        headers: {
          Origin: "https://frontend-lo6d.vercel.app",
        },
      });

      assert.ok([401, 404].includes(res.status));
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        "https://frontend-lo6d.vercel.app"
      );
      assert.equal(res.headers.get("access-control-allow-credentials"), "true");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
