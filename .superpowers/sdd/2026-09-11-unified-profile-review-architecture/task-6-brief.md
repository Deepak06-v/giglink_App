# Task 6: Add Review Prompt After Employer Completion on Job Detail

## Goal

Show the "Rate Worker" review prompt immediately after the employer marks the job as completed (`completion.employerCompleted`), not just when the full job status is `COMPLETED`. This aligns the UI with the new backend eligibility (Task 1-2).

## Files

- Modify: `mobile/app/(employer)/jobs/[jobId].tsx`

## Changes (two exact edits)

### Edit 1 — review status loading (line ~68)

Current code:
```tsx
if (data.job.status === 'COMPLETED') {
```

Change to:
```tsx
if (data.job.status === 'COMPLETED' || data.completion?.employerCompleted) {
```

### Edit 2 — review section rendering (line ~368)

Current code:
```tsx
{job.status === 'COMPLETED' && reviewStatus && reviewStatus.workers.length > 0 ? (
```

Change to:
```tsx
{(job.status === 'COMPLETED' || completion?.employerCompleted) && reviewStatus && reviewStatus.workers.length > 0 ? (
```

## Verify

Run: `cd C:\dev\giglink\mobile && npx tsc --noEmit`
Expected: No errors.

## Commit

```
git add "mobile/app/(employer)/jobs/[jobId].tsx"
git commit -m "fix: show employer review prompt after employer completion, not just job completion"
```

Note: In PowerShell quote the path with single quotes: `git add 'mobile/app/(employer)/jobs/[jobId].tsx'`. If parens/brackets cause issues, stage only that file via `git add -u` after confirming nothing else is dirty.

## Global Constraints

- Expo SDK 53.0.27, React Native 0.79.6
- Do not break existing API contracts
- No new npm dependencies
- Only touch the two lines specified — no other changes

## Work from: C:\dev\giglink