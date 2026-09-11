# Task 6 Report: Add Review Prompt After Employer Completion on Job Detail

## Status

DONE

## Summary

Updated the employer job detail screen so the "Rate Worker" review prompt appears as soon as the employer confirms completion (`completion.employerCompleted`), aligning the UI with the backend eligibility from Tasks 1-2. Both exact edits from the brief were applied with no other changes to the file.

## Changes

File: `mobile/app/(employer)/jobs/[jobId].tsx` (relative to repo root `C:\dev\giglink`)

### Edit 1 — review status loading (line ~68)

```tsx
- if (data.job.status === 'COMPLETED') {
+ if (data.job.status === 'COMPLETED' || data.completion?.employerCompleted) {
```

This controls whether review status / worker names are fetched and `reviewStatus` is set, so the review data is loaded immediately after employer completion rather than waiting for full job `COMPLETED` status.

### Edit 2 — review section rendering (line ~368)

```tsx
- {job.status === 'COMPLETED' && reviewStatus && reviewStatus.workers.length > 0 ? (
+ {(job.status === 'COMPLETED' || completion?.employerCompleted) && reviewStatus && reviewStatus.workers.length > 0 ? (
```

This controls whether the review card (with per-worker "Rate" buttons) is rendered.

## Confirmation of exact code

Both target regions were read before editing and matched the brief's "current code" verbatim. `completion` (state, line 43) and `data.completion` (backend response, line 67) are both typed as `JobCompletionInfo | null`; optional chaining short-circuits safely on null. Logic is unchanged when `job.status === 'COMPLETED'` (OR short-circuit), and when completion is null/none the new clause evaluates falsy, preserving prior behavior. No API contract changes; no new dependencies.

## Verification

- `cd C:\dev\giglink\mobile && npx tsc --noEmit` → **passed, no errors** (empty output, exit 0).

## Commit

- `bbeee4a` — `fix: show employer review prompt after employer completion, not just job completion`
- Only the target file was committed (1 file, 2 insertions / 2 deletions). Other pre-existing dirty files (`progress.md`, `mobile/app/(worker)/assignments/[assignmentId].tsx`, untracked briefs/reports) were left untouched, staged, or uncommitted.
- PowerShell staging worked with single-quoted pathspec: `git add 'mobile/app/(employer)/jobs/[jobId].tsx'`.

## Self-review

- Diff inspected after commit: contains exactly the two lines specified in the brief, nothing else.
- No new npm dependencies, no API contract changes, no comment additions.

## Notes

- A pre-existing uncommitted modification to `mobile/app/(worker)/assignments/[assignmentId].tsx` and `progress.md` was present before this task and was intentionally not staged.