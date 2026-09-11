# GigLink Part 1 — Profile/Job/Review Consistency Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the five reported consistency issues — Employer "Access denied" on reviews, Worker "Job not found" on completed jobs, profile edit UX mismatch, Indian state autocomplete, and the 100%-completion prompt — by hardening backend data-logic, locking role-agnostic behavior with regression tests, and unifying the shared profile edit scaffolding.

**Architecture:** No new API endpoints. Employer Reviews listing is already role-agnostic on HEAD — the fix is regression tests + a null-reviewer guard (paves the way for Part 2 account deletion). The "Job not found" root cause is `deleteJob` allowing deletion of COMPLETED jobs (only ACTIVE assignments were blocked); the fix hardens `deleteJob` and locks `getJobByIdPublic` completed-job access for assigned workers. Mobile unifies the two edit screens into shared components (`ProfileSectionTitle`, `IndianStatesField`) and gates the completion card on `< 100`.

**Tech Stack:** Expo SDK 53, React Native 0.79, Express.js, MongoDB/Mongoose, TypeScript, node:test

**Spec:** `C:\dev\giglink\docs\superpowers\plans\2026-09-11-giglink-part1-profile-job-review-consistency-fixes.md`

---

## Audit Findings (from prior session)

### Issue 1 — Employer Reviews "Access denied"
- Flow on HEAD: `(employer)/(tabs)/profile.tsx` → `getUserReviews(currentUser.id)` → `GET /users/:userId/reviews` (`optionalAuthenticate`, role-agnostic `getUserReviewsController`, `getUserReviews`/`getUserRatingSummary`) → shared `ReviewListScreen` at `(employer)/reviews/list/[userId]`.
- Every "Access denied" string in the codebase (`auth.middleware.js:87`, `review.service.js:261`, `application.service.js`) lives on role-gated *submission/status/marketplace-profile* routes — NONE are reachable from the reviews listing path on HEAD.
- **Conclusion:** current code is correct and role-agnostic; the symptom is consistent with a stale deployed backend/APK. Code deliverable = regression tests locking the behavior + a defensive null-reviewer guard (needed for Part 2).
- The `getUserReviews` reviewer enrichment (`review.service.js:180-201`) will crash with `Cannot read properties of undefined (reading '_id')` if a reviewer user doc was deleted — guard it.

### Issue 2 — Worker "Job not found" on completed job
- Worker job detail: `(worker)/jobs/[jobId].tsx` → `getJobById` → `GET /jobs/:jobId` (`optionalAuthenticate`) → `getJobByIdPublic` (`job.service.js:460`).
- `getJobByIdPublic` returns COMPLETED jobs to assigned workers (assignment lookup has NO status filter), throws 404 "Job not available" for unrelated workers, 404 "Job not found" only when the doc is gone.
- **Real gap:** `deleteJob` (`job.service.js:628-649`) only blocks ACTIVE assignments → a COMPLETED job CAN be deleted, orphaning the worker's completed-job links (JOB_COMPLETED/EMPLOYER_COMPLETION_CONFIRMED notifications → `jobDetailsRoute`, `(worker)/reviews/submit/[jobId]`) into "Job not found".
- **Fix:** `deleteJob` must reject non-DRAFT jobs and any job with non-CANCELLED assignment history (matches the employer UI which only surfaces Delete for DRAFT). Add regression tests for completed-job access.

### Issue 3 — Profile edit UX mismatch
- Both edit screens (`(employer)/profile/edit.tsx`, `(worker)/profile/edit.tsx`) already use the same design system (Screen/DetailHeader/Input/ImagePickerField/footer). Both define a local `SectionTitle` helper (worker L19-25, employer L12-18). Unify by extracting a shared `ProfileSectionTitle` component used in both.

### Issue 4 — Indian state autocomplete
- Both edit screens use a free-text `Input` for `state` (worker L37/L151, employer L33/L141). No autocomplete exists. Data shape differs: worker nests under `location.state`, employer uses top-level `state`.

### Issue 5 — 100% completion prompt
- `OwnProfileCard.tsx:307` renders the completion card whenever `completionData` is truthy — including at 100% (shows "Profile 100% complete" + `nextHint` "done"). Requirement: HIDE the card entirely at 100%. JobDetailScreen already gates `< 100`.

---

## File Map

### Backend (Modify)
- `backend/src/services/job.service.js:628-649` — Harden `deleteJob`
- `backend/src/services/review.service.js:180-201` — Null-reviewer guard in `getUserReviews`
- `backend/src/services/job.service.test.js` — Add `deleteJob` + completed-job access tests
- `backend/src/services/review.service.test.js` — **New** — role-agnostic listing tests (apply the explicit list in `backend/package.json` `test` script)

### Frontend (Create)
- `mobile/components/profiles/ProfileSectionTitle.tsx` — Shared section title (Issue 3)
- `mobile/components/profiles/IndianStatesField.tsx` — State autocomplete (Issue 4)
- `mobile/lib/constants/indianStates.ts` — Canonical 28 states + 8 UTs list (Issue 4)

### Frontend (Modify)
- `mobile/app/(employer)/profile/edit.tsx` — Use `ProfileSectionTitle` + `IndianStatesField`
- `mobile/app/(worker)/profile/edit.tsx` — Use `ProfileSectionTitle` + `IndianStatesField`
- `mobile/components/profiles/OwnProfileCard.tsx:307` — Gate completion card on `< 100`

---

## Global Constraints
- Expo SDK 53.0.27, RN 0.79.6, Node >= 22 — do not upgrade anything
- Backend: Express + MongoDB, `node --test` with an EXPLICIT test file list in `backend/package.json` — new test files MUST be added to that list
- Mobile has NO eslint; typecheck is `cd mobile && npx tsc --noEmit`
- Do NOT weaken authorization or eligibility checks; do NOT hide errors
- Use existing `mobile/constants/theme.ts` tokens + `mobile/components/ui` primitives
- No new npm dependencies
- Do not add code comments

---

### Task 1: Harden deleteJob — block non-DRAFT jobs and assignment history

**Files:**
- Modify: `backend/src/services/job.service.js:628-649`

**Goal:** Prevent deletion of any job that is not DRAFT, or that has any assignment history (status != CANCELLED). This is the root-cause fix for the Worker "Job not found" issue.

- [ ] **Step 1: Read current implementation**

Read `backend/src/services/job.service.js` lines 628-649. The current guard only checks `Assignment.countDocuments({ job, status: "ACTIVE" })`, which lets COMPLETED jobs (with COMPLETED assignments) be deleted.

- [ ] **Step 2: Replace the guard**

Replace the body of `deleteJob` after the ownership 404 check with:

```js
  if (job.status !== "DRAFT") {
    const error = new Error("Only draft jobs can be deleted");
    error.statusCode = 409;
    throw error;
  }

  const nonCancelledAssignments = await Assignment.countDocuments({
    job: jobId,
    status: { $ne: "CANCELLED" },
  });

  if (nonCancelledAssignments > 0) {
    const error = new Error("Cannot delete a job with assignment history");
    error.statusCode = 409;
    throw error;
  }

  await Job.findByIdAndDelete(jobId);
  return { message: "Job deleted successfully" };
```

Full `deleteJob` becomes:

```js
const deleteJob = async (jobId, employerId) => {
  const job = await Job.findOne({ _id: jobId, employer: employerId });
  if (!job) {
    const error = new Error("Job not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== "DRAFT") {
    const error = new Error("Only draft jobs can be deleted");
    error.statusCode = 409;
    throw error;
  }

  const nonCancelledAssignments = await Assignment.countDocuments({
    job: jobId,
    status: { $ne: "CANCELLED" },
  });

  if (nonCancelledAssignments > 0) {
    const error = new Error("Cannot delete a job with assignment history");
    error.statusCode = 409;
    throw error;
  }

  await Job.findByIdAndDelete(jobId);
  return { message: "Job deleted successfully" };
};
```

- [ ] **Step 3: Run the backend tests**

Run: `cd backend && npm test`
Expected: All existing tests pass (no test currently deletes a non-DRAFT job, so nothing should break).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/job.service.js
git commit -m "fix: prevent deletion of non-draft jobs or jobs with assignment history"
```

---

### Task 2: Lock completed-job access + deleteJob rules with tests

**Files:**
- Modify: `backend/src/services/job.service.test.js`
- Test: `backend/src/services/job.service.test.js`

**Goal:** Regression tests proving (a) an assigned worker can open a COMPLETED job, (b) an unrelated worker gets 404 "Job not available", (c) `deleteJob` rejects non-DRAFT and assignment-history jobs.

**Interfaces:**
- Consumes: `Job`, `Application`, `Assignment`, `EmployerProfile`, `User` (already imported in the test file), `mock` from `node:test`, the `chain()` helper at `job.service.test.js:301`
- Produces: `getJobByIdPublic(jobId, workerId)` and `deleteJob(jobId, employerId)` behavior locked by tests

- [ ] **Step 1: Check the existing getJobByIdPublic test setup**

Read `backend/src/services/job.service.test.js` lines 314-360 to see the existing `describe`/`beforeEach` mocks for `getJobByIdPublic`.

- [ ] **Step 2: Add a completed-job access describe block**

Append to `backend/src/services/job.service.test.js`:

```js
describe("getJobByIdPublic completed jobs", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it("returns a COMPLETED job to an assigned worker", async () => {
    const job = {
      _id: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
      title: "Delivery",
      status: "COMPLETED",
      category: "delivery",
      description: "done",
      workersRequired: 1,
      compensationType: "FIXED",
      compensation: { amount: 500 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mock.method(Job, "findById", () => ({ lean: async () => ({ ...job }) }));
    mock.method(Application, "findOne", () => ({ lean: async () => null }));
    mock.method(
      Assignment,
      "findOne",
      () => ({ lean: async () => ({ worker: new mongoose.Types.ObjectId(), status: "COMPLETED" }) })
    );
    mock.method(EmployerProfile, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
    mock.method(User, "findById", () => ({ select: () => ({ lean: async () => ({ name: "Acme" }) }) }));

    const result = await getJobByIdPublic(job._id.toString(), new mongoose.Types.ObjectId().toString());

    assert.equal(result.job.status, "COMPLETED");
  });

  it("throws 404 Job not available for a worker with no relationship", async () => {
    const job = {
      _id: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
      title: "Delivery",
      status: "COMPLETED",
      category: "delivery",
      description: "done",
      workersRequired: 1,
      compensationType: "FIXED",
      compensation: { amount: 500 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mock.method(Job, "findById", () => ({ lean: async () => ({ ...job }) }));
    mock.method(Application, "findOne", () => ({ lean: async () => null }));
    mock.method(Assignment, "findOne", () => ({ lean: async () => null }));
    mock.method(EmployerProfile, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
    mock.method(User, "findById", () => ({ select: () => ({ lean: async () => null }) }));

    await assert.rejects(
      () => getJobByIdPublic(job._id.toString(), new mongoose.Types.ObjectId().toString()),
      (err) => err.statusCode === 404 && err.message === "Job not available"
    );
  });
});
```

Note: this file already imports everything needed; add `getJobByIdPublic` to the existing import from `./job.service.js` if not already imported (it is imported at line ~18).

- [ ] **Step 3: Add a deleteJob describe block**

Append:

```js
describe("deleteJob", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it("deletes a DRAFT job with no assignment history", async () => {
    const job = {
      _id: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
      status: "DRAFT",
    };
    mock.method(Job, "findOne", async () => job);
    mock.method(Assignment, "countDocuments", async () => 0);
    mock.method(Job, "findByIdAndDelete", async () => job);

    const result = await deleteJob(job._id.toString(), job.employer.toString());

    assert.equal(result.message, "Job deleted successfully");
  });

  it("rejects deleting a COMPLETED job", async () => {
    const job = {
      _id: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
      status: "COMPLETED",
    };
    mock.method(Job, "findOne", async () => job);

    await assert.rejects(
      () => deleteJob(job._id.toString(), job.employer.toString()),
      (err) => err.statusCode === 409 && err.message === "Only draft jobs can be deleted"
    );
  });

  it("rejects deleting a job with completed assignment history", async () => {
    const job = {
      _id: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
      status: "DRAFT",
    };
    mock.method(Job, "findOne", async () => job);
    mock.method(Assignment, "countDocuments", async () => 1);

    await assert.rejects(
      () => deleteJob(job._id.toString(), job.employer.toString()),
      (err) => err.statusCode === 409 && err.message === "Cannot delete a job with assignment history"
    );
  });
});
```

Add `deleteJob` to the `job.service.js` import in this test file.

- [ ] **Step 4: Run the tests**

Run: `cd backend && node --test src/services/job.service.test.js`
Expected: All `getJobByIdPublic` and `deleteJob` tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/job.service.test.js
git commit -m "test: lock completed-job access and deleteJob deletion rules"
```

---

### Task 3: Add role-agnostic reviews listing regression tests + null-reviewer guard

**Files:**
- Modify: `backend/src/services/review.service.js:180-201`
- Create: `backend/src/services/review.service.test.js`
- Modify: `backend/package.json` (add the new test file to `test` and `test:coverage` scripts)

**Goal:** Prove the reviews listing is role-agnostic for BOTH reviewee kinds (worker reviewee w/ employer reviewers, employer reviewee w/ worker reviewers) and that a null reviewer (deleted user) no longer crashes enrichment.

**Interfaces:**
- Consumes: `Review`, `WorkerProfile`, `EmployerProfile` models; memo-mocks via `node:test`
- Produces: `getUserReviews(userId, page, limit)` and `getUserRatingSummary(userId)` locked by tests

- [ ] **Step 1: Add the null-reviewer guard**

In `backend/src/services/review.service.js`, inside `getUserReviews` at line 180, wrap the enrichment map so a null populated reviewer does not crash:

```js
  const enrichedReviews = await Promise.all(
    reviews.map(async (review) => {
      if (!review.reviewer) {
        return {
          ...review,
          reviewer: { id: null, name: "Deleted User" },
          job: review.job
            ? {
                id: review.job._id,
                title: review.job.title,
                category: review.job.category,
              }
            : null,
        };
      }
```

- [ ] **Step 2: Create the test file**

Create `backend/src/services/review.service.test.js`:

```js
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import { getUserReviews, getUserRatingSummary } from "./review.service.js";

function reviewChain(docs) {
  const q = {
    sort: () => q,
    skip: () => q,
    limit: () => q,
    populate: () => q,
    lean: async () => docs,
  };
  return q;
}

function selectLean(doc) {
  return { select: () => ({ lean: async () => doc }) };
}

describe("getUserReviews is role-agnostic", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns reviews for an employer reviewee with worker reviewers", async () => {
    const revieweeId = new mongoose.Types.ObjectId();
    const workerReviewer = {
      _id: new mongoose.Types.ObjectId(),
      name: "Ravi",
    };
    const docs = [
      {
        _id: new mongoose.Types.ObjectId(),
        reviewee: revieweeId,
        reviewer: workerReviewer,
        job: { _id: new mongoose.Types.ObjectId(), title: "Delivery", category: "DELIVERY" },
        rating: 5,
        comment: "Great",
        createdAt: new Date(),
      },
    ];

    mock.method(Review, "find", () => reviewChain(docs));
    mock.method(Review, "countDocuments", async () => 1);
    mock.method(
      WorkerProfile,
      "findOne",
      () => selectLean({ profileImage: "https://example.com/ravi.jpg" })
    );

    const result = await getUserReviews(revieweeId.toString(), 1, 20);

    assert.equal(result.pagination.total, 1);
    assert.equal(result.reviews[0].reviewer.name, "Ravi");
    assert.equal(result.reviews[0].reviewer.profileImage, "https://example.com/ravi.jpg");
  });

  it("returns reviews for a worker reviewee with employer reviewers", async () => {
    const revieweeId = new mongoose.Types.ObjectId();
    const employerReviewer = {
      _id: new mongoose.Types.ObjectId(),
      name: "Acme Corp",
    };
    const docs = [
      {
        _id: new mongoose.Types.ObjectId(),
        reviewee: revieweeId,
        reviewer: employerReviewer,
        job: null,
        rating: 4,
        comment: "Punctual",
        createdAt: new Date(),
      },
    ];

    mock.method(Review, "find", () => reviewChain(docs));
    mock.method(Review, "countDocuments", async () => 1);
    mock.method(WorkerProfile, "findOne", () => selectLean(null));
    mock.method(
      EmployerProfile,
      "findOne",
      () => selectLean({ companyName: "Acme Corp", logo: "https://example.com/acme.png" })
    );

    const result = await getUserReviews(revieweeId.toString(), 1, 20);

    assert.equal(result.reviews[0].reviewer.companyName, "Acme Corp");
    assert.equal(result.reviews[0].reviewer.logo, "https://example.com/acme.png");
    assert.equal(result.reviews[0].job, null);
  });

  it("handles a deleted (null) reviewer without crashing", async () => {
    const revieweeId = new mongoose.Types.ObjectId();
    const docs = [
      {
        _id: new mongoose.Types.ObjectId(),
        reviewee: revieweeId,
        reviewer: null,
        job: null,
        rating: 3,
        comment: "ok",
        createdAt: new Date(),
      },
    ];

    mock.method(Review, "find", () => reviewChain(docs));
    mock.method(Review, "countDocuments", async () => 1);

    const result = await getUserReviews(revieweeId.toString(), 1, 20);

    assert.equal(result.reviews[0].reviewer.id, null);
    assert.equal(result.reviews[0].reviewer.name, "Deleted User");
  });
});

describe("getUserRatingSummary is role-agnostic", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("computes average and count for any reviewee id", async () => {
    mock.method(Review, "aggregate", async () => [{ averageRating: 4.28, totalReviews: 7 }]);

    const result = await getUserRatingSummary(new mongoose.Types.ObjectId().toString());

    assert.equal(result.averageRating, 4.3);
    assert.equal(result.totalReviews, 7);
  });

  it("returns zeros when no reviews exist", async () => {
    mock.method(Review, "aggregate", async () => []);

    const result = await getUserRatingSummary(new mongoose.Types.ObjectId().toString());

    assert.deepEqual(result, { averageRating: null, totalReviews: 0 });
  });
});
```

- [ ] **Step 3: Add the file to the test scripts**

In `backend/package.json`, both `test` and `test:coverage` scripts end with `... src/utils/phone.test.js`. Append ` src/services/review.service.test.js` to BOTH lists (before the closing quote).

- [ ] **Step 4: Run the new tests**

Run: `cd backend && node --test src/services/review.service.test.js`
Expected: 5 tests pass, passes while `Review.find` returns role-agnostic results.

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/review.service.js backend/src/services/review.service.test.js backend/package.json
git commit -m "test: lock role-agnostic reviews listing; guard null reviewer enrichment"
```

---

### Task 4: Extract shared ProfileSectionTitle

**Files:**
- Create: `mobile/components/profiles/ProfileSectionTitle.tsx`
- Modify: `mobile/app/(employer)/profile/edit.tsx`
- Modify: `mobile/app/(worker)/profile/edit.tsx`

**Goal:** One shared section-title component used by both edit screens (currently duplicated as a local `SectionTitle` in each).

- [ ] **Step 1: Create the shared component**

Create `mobile/components/profiles/ProfileSectionTitle.tsx`:

```tsx
import { Text } from '@/components/ui';
import { translate, type TranslationKey } from '@/lib/i18n';

interface ProfileSectionTitleProps {
  value: TranslationKey;
}

export function ProfileSectionTitle({ value }: ProfileSectionTitleProps) {
  return (
    <Text variant="label" color="accent">
      {translate(value)}
    </Text>
  );
}
```

- [ ] **Step 2: Update the worker edit screen**

In `mobile/app/(worker)/profile/edit.tsx`:
- Delete the local `SectionTitle` function (lines 19-25).
- Replace the import `import { translate, type TranslationKey } from '@/lib/i18n';` with `import { translate } from '@/lib/i18n';` (the `TranslationKey` type is no longer referenced once the local helper is gone — verify; if it is still used elsewhere, keep it).
- Add `import { ProfileSectionTitle } from '@/components/profiles/ProfileSectionTitle';`
- Replace all `<SectionTitle value=...` usages with `<ProfileSectionTitle value=...`.

- [ ] **Step 3: Update the employer edit screen**

In `mobile/app/(employer)/profile/edit.tsx`:
- Delete the local `SectionTitle` function (lines 12-18).
- Replace the import with `import { translate } from '@/lib/i18n';` (drop `type TranslationKey` if now unused).
- Add `import { ProfileSectionTitle } from '@/components/profiles/ProfileSectionTitle';`
- Replace all `<SectionTitle value=...` usages with `<ProfileSectionTitle value=...`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add mobile/components/profiles/ProfileSectionTitle.tsx mobile/app/\(employer\)/profile/edit.tsx mobile/app/\(worker\)/profile/edit.tsx
git commit -m "refactor: shared ProfileSectionTitle in both profile edit screens"
```

---

### Task 5: Add Indian states data + shared autocomplete field

**Files:**
- Create: `mobile/lib/constants/indianStates.ts`
- Create: `mobile/components/profiles/IndianStatesField.tsx`
- Modify: `mobile/app/(employer)/profile/edit.tsx`
- Modify: `mobile/app/(worker)/profile/edit.tsx`

**Goal:** Replace the free-text state `Input` on both edit screens with a shared, prefix-friendly, case-insensitive autocomplete that stores the canonical state/UT name.

**Interfaces:**
- Produces: `INDIAN_STATES_AND_UTS: string[]` and `<IndianStatesField label value onChange placeholder>` (canonicalizing on select, free-text passthrough so existing stored values never break).

- [ ] **Step 1: Create the data file**

Create `mobile/lib/constants/indianStates.ts`:

```ts
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const INDIAN_UTS = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const INDIAN_STATES_AND_UTS: readonly string[] = [
  ...INDIAN_STATES,
  ...INDIAN_UTS,
];
```

- [ ] **Step 2: Create the autocomplete field**

Create `mobile/components/profiles/IndianStatesField.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Input, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { INDIAN_STATES_AND_UTS } from '@/lib/constants/indianStates';

const MAX_SUGGESTIONS = 6;

interface IndianStatesFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function IndianStatesField({
  label,
  value,
  onChange,
  placeholder,
}: IndianStatesFieldProps) {
  const [query, setQuery] = useState(value);
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return INDIAN_STATES_AND_UTS.filter(
      (state) => state.toLowerCase().startsWith(q) || state.toLowerCase().includes(q),
    ).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  const showSuggestions = focused && matches.length > 0;

  const select = (state: string) => {
    onChange(state);
    setQuery(state);
    setFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <Input
        label={label}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          onChange(text);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
      />
      {showSuggestions ? (
        <View style={styles.dropdown}>
          {matches.map((state) => (
            <Pressable
              key={state}
              onPressIn={() => select(state)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text variant="bodyMd" color="primary">
                {state}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionPressed: {
    backgroundColor: colors.surface.hover,
  },
});
```

Verify `colors.surface.hover` exists in `mobile/constants/theme.ts`; if not, use `colors.surface.card` for both states.

- [ ] **Step 3: Update the worker edit screen**

In `mobile/app/(worker)/profile/edit.tsx`:
- Add `import { IndianStatesField } from '@/components/profiles/IndianStatesField';`
- Replace the state input at line 151:
  ```tsx
  <Input label={translate('profile.state')} value={state} onChangeText={setState} />
  ```
  with:
  ```tsx
  <IndianStatesField label={translate('profile.state')} value={state} onChange={setState} />
  ```

- [ ] **Step 4: Update the employer edit screen**

In `mobile/app/(employer)/profile/edit.tsx`:
- Add `import { IndianStatesField } from '@/components/profiles/IndianStatesField';`
- Replace the state input at line 141:
  ```tsx
  <Input label={translate('profile.state')} value={state} onChangeText={setState} />
  ```
  with:
  ```tsx
  <IndianStatesField label={translate('profile.state')} value={state} onChange={setState} />
  ```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/constants/indianStates.ts mobile/components/profiles/IndianStatesField.tsx mobile/app/\(employer\)/profile/edit.tsx mobile/app/\(worker\)/profile/edit.tsx
git commit -m "feat: shared Indian state autocomplete in both profile edit screens"
```

---

### Task 6: Hide completion card at 100%

**Files:**
- Modify: `mobile/components/profiles/OwnProfileCard.tsx:307`

**Goal:** The "profile completion" prompt must be hidden entirely once the profile is 100% complete (no ring, no "done" hint, no edit shortcut).

- [ ] **Step 1: Gate the completion card**

In `mobile/components/profiles/OwnProfileCard.tsx`, change line 307:

```tsx
      {completionData ? (
```

to:

```tsx
      {completionData && completionPct < 100 ? (
```

`completionPct` is already computed at line 229 (`completionData?.percentage ?? 0`).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/components/profiles/OwnProfileCard.tsx
git commit -m "fix: hide profile completion card once profile is 100% complete"
```

---

### Task 7: Full verification

**Files:**
- All modified files

- [ ] **Step 1: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass (including new `job.service.test.js` and `review.service.test.js` cases).

- [ ] **Step 2: Run mobile type check**

Run: `cd mobile && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Review diff**

Run: `git diff --stat && git status`
Expected: Only the intended files changed.

- [ ] **Step 4: Final commit if review fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback from part 1 verification"
```

---

## Summary of Changes

### Backend
| File | Change |
|------|--------|
| `job.service.js` | `deleteJob`: block non-DRAFT jobs (409) + any non-CANCELLED assignment history (409) |
| `job.service.test.js` | New `deleteJob` describe + completed-job access tests for `getJobByIdPublic` |
| `review.service.js` | `getUserReviews`: null-reviewer guard returns "Deleted User" placeholder |
| `review.service.test.js` | **New** — role-agnostic reviewer enrichment + rating summary tests |
| `package.json` | Added `review.service.test.js` to `test` and `test:coverage` lists |

### Frontend
| File | Change |
|------|--------|
| `components/profiles/ProfileSectionTitle.tsx` | **New** — shared edit-screen section title |
| `components/profiles/IndianStatesField.tsx` | **New** — state autocomplete (prefix + contains match, canonical select) |
| `lib/constants/indianStates.ts` | **New** — 28 states + 8 UTs canonical list |
| `(employer)/profile/edit.tsx` | Uses `ProfileSectionTitle` + `IndianStatesField` |
| `(worker)/profile/edit.tsx` | Uses `ProfileSectionTitle` + `IndianStatesField` |
| `components/profiles/OwnProfileCard.tsx` | Completion card only renders when `< 100%` |

### What Was NOT Changed
- Authentication / OTP flow
- The reviews listing endpoint's role-agnostic auth (`optionalAuthenticate`)
- Review eligibility logic (review.service.js:240-327)
- Marketplace profile routes
- Notifications / push tokens
- Job detail 404 semantics ("Job not available" for unrelated workers stays)