# Task 7: Add Review Prompt After Worker Completion on Assignment Detail

## Goal

Show the "Rate Employer" review prompt immediately after the worker marks their assignment as completed (`assignment.workerCompleted`), even if the job isn't fully `COMPLETED` yet. This aligns the UI with the new backend eligibility (Task 1-2).

## Files

- Modify: `mobile/app/(worker)/assignments/[assignmentId].tsx`

## Changes (two exact edits)

### Edit 1 — review status loading (line ~67)

Current code:
```tsx
if (data.assignment.job.status === 'COMPLETED') {
```

Change to:
```tsx
if (data.assignment.job.status === 'COMPLETED' || data.assignment.workerCompleted) {
```

### Edit 2 — review button rendering (line ~187)

Current code:
```tsx
) : job.status === 'COMPLETED' && reviewStatus ? (
```

Change to:
```tsx
) : (job.status === 'COMPLETED' || assignment.workerCompleted) && reviewStatus ? (
```

## Verify

Run: `cd C:\dev\giglink\mobile && npx tsc --noEmit`
Expected: No errors.

## Commit

```
git add "mobile/app/(worker)/assignments/[assignmentId].tsx"
git commit -m "fix: show worker review prompt after worker completion, not just job completion"
```

Note: In PowerShell quote the path with single quotes: `git add 'mobile/app/(worker)/assignments/[assignmentId].tsx'`. If parens/brackets cause issues, stage only that file via `git add -u` after confirming nothing else is dirty.

## Global Constraints

- Expo SDK 53.0.27, React Native 0.79.6
- Do not break existing API contracts
- No new npm dependencies
- Only touch the two lines specified — no other changes

## Work from: C:\dev\giglink