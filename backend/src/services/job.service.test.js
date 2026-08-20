import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDiscoveryFilter } from "./job.service.js";

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
