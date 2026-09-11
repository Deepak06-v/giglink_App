# Review Package — Tasks 6-7

## Base: cefd74e
## Head: 80c6db7

## Commit List
- bbeee4a fix: show employer review prompt after employer completion, not just job completion
- 80c6db7 fix: show worker review prompt after worker completion, not just job completion

## Stat Summary
 mobile/app/(employer)/jobs/[jobId].tsx             | 4 ++--
 mobile/app/(worker)/assignments/[assignmentId].tsx | 4 ++--
 2 files changed, 4 insertions(+), 4 deletions(-)

## Full Diff (cefd74e..80c6db7)
diff --git a/mobile/app/(employer)/jobs/[jobId].tsx b/mobile/app/(employer)/jobs/[jobId].tsx
-        if (data.job.status === 'COMPLETED') {
+        if (data.job.status === 'COMPLETED' || data.completion?.employerCompleted) {
...
-      {job.status === 'COMPLETED' && reviewStatus && reviewStatus.workers.length > 0 ? (
+      {(job.status === 'COMPLETED' || completion?.employerCompleted) && reviewStatus && reviewStatus.workers.length > 0 ? (
diff --git a/mobile/app/(worker)/assignments/[assignmentId].tsx b/mobile/app/(worker)/assignments/[assignmentId].tsx
-        if (data.assignment.job.status === 'COMPLETED') {
+        if (data.assignment.job.status === 'COMPLETED' || data.assignment.workerCompleted) {
...
-        ) : job.status === 'COMPLETED' && reviewStatus ? (
+        ) : (job.status === 'COMPLETED' || assignment.workerCompleted) && reviewStatus ? (
```

## Purpose

Backend eligibility was changed (Tasks 1-2): employer can review after `completion.employerCompleted`; worker can review after `assignment.workerCompleted`. These two frontend edits make the review prompt appear at the same moment, without waiting for the whole job's status to become COMPLETED.