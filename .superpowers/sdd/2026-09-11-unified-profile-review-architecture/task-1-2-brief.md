# Task 1-2: Fix Backend Review Eligibility

## Task 1: Fix Worker Review Eligibility

**File:** `backend/src/services/review.service.js:289-327`

**Goal:** Allow worker to review employer after worker completes their assignment, even if the overall job is not yet COMPLETED.

**Current broken logic (line ~297):**
```js
if (job.status !== "COMPLETED") {
  return { canReview: false, hasReviewed: false };
}
```

**Replace `checkWorkerReviewEligibility` function (lines 289-327) with:**
```js
const checkWorkerReviewEligibility = async (workerId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status === "CANCELLED") {
    return { canReview: false, hasReviewed: false };
  }

  const assignment = await Assignment.findOne({
    job: jobId,
    worker: workerId,
    status: { $ne: "CANCELLED" },
  }).lean();

  if (!assignment) {
    return { canReview: false, hasReviewed: false };
  }

  // Worker can review once THEY have completed their assignment
  if (!assignment.workerCompleted) {
    return { canReview: false, hasReviewed: false };
  }

  const existingReview = await Review.findOne({
    reviewer: workerId,
    reviewee: job.employer.toString(),
    job: jobId,
  }).lean();

  return {
    canReview: !existingReview,
    hasReviewed: !!existingReview,
  };
};
```

## Task 2: Fix Employer Review Eligibility

**File:** `backend/src/services/review.service.js:240-287`

**Goal:** Allow employer to review worker after employer marks job as completed, even if workers haven't all completed yet.

**Current broken logic (line ~254):**
```js
if (job.status !== "COMPLETED") {
  return { canReview: false, workers: [] };
}
```

**Replace `checkEmployerReviewEligibility` function (lines 240-287) with:**
```js
const checkEmployerReviewEligibility = async (employerId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  if (job.status === "CANCELLED") {
    return { canReview: false, workers: [] };
  }

  // Employer can review once THEY have confirmed completion
  if (!job.completion?.employerCompleted) {
    return { canReview: false, workers: [] };
  }

  const assignments = await Assignment.find({
    job: jobId,
    status: { $ne: "CANCELLED" },
  }).lean();

  const workers = await Promise.all(
    assignments.map(async (assignment) => {
      const existingReview = await Review.findOne({
        reviewer: employerId,
        reviewee: assignment.worker.toString(),
        job: jobId,
      }).lean();

      return {
        workerId: assignment.worker.toString(),
        hasReviewed: !!existingReview,
      };
    })
  );

  const canReview = workers.some((w) => !w.hasReviewed);

  return { canReview, workers };
};
```

## Global Constraints
- Expo SDK 53.0.27, React Native 0.79.6 — do not upgrade
- Do not break existing API contracts
- Do not touch: auth, OTP, notifications, maps, Android build config
- Preserve all existing working GigLink functionality

## Work from: C:\dev\giglink
