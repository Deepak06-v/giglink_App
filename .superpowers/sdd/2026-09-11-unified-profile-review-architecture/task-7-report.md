# Task 7: Add Review Prompt After Worker Completion — Report

## Summary

Added `|| data.assignment.workerCompleted` / `|| assignment.workerCompleted` to the two places that gate "Rate Employer" review visibility on the worker assignment detail screen.

## What Changed

**File:** `mobile/app/(worker)/assignments/[assignmentId].tsx`

1. **Line 67 — Review status loading:** Changed `if (data.assignment.job.status === 'COMPLETED')` to `if (data.assignment.job.status === 'COMPLETED' || data.assignment.workerCompleted)`. The `getWorkerReviewStatus` call now fires as soon as the worker completes, not only after the job reaches COMPLETED.

2. **Line 187 — Review button rendering:** Changed `job.status === 'COMPLETED' && reviewStatus` to `(job.status === 'COMPLETED' || assignment.workerCompleted) && reviewStatus`. The review prompt / "already reviewed" message now renders in the footer whenever `workerCompleted` is true, even if the employer hasn't confirmed yet.

Both edits are minimal (2 insertions, 2 deletions). No other lines touched.

## Verification

`tsc --noEmit` — **0 errors** (clean pass).

## Deviations

None. The changes follow the brief exactly.
