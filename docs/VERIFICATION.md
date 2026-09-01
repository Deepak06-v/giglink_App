# GigLink — Phase 8 Pre-Merge Verification (Definition of Done)

This document captures the mandatory gates that must pass before Phase 8 is
considered complete. Every item below is a hard checklist; see
`docs/PHASE8_IMPLEMENTATION_PLAN.md` §12 for the corresponding plan text.

## Backend

- [ ] `npm test` (in `backend/`) is green — all existing test files **plus** the
      new Phase 8 tests (`notification.service.test.js`,
      `completion.service.test.js`). No regressions.
- [ ] `npm run test:coverage` (in `backend/`) runs the same suite with coverage;
      no new drift.
- [ ] No internal/stack leakage in 500s — `error.middleware` returns
      `ValidationError→400`, `CastError→400`, duplicate key→409, else 500
      without exposing internals.

## Mobile

- [ ] `npm run typecheck` (in `mobile/`) passes — `tsc --noEmit`, EXIT=0.
- [ ] `npx expo-doctor` passes; no new dependency drift.

## Invariants (Phase 1–7 must not regress)

- [ ] Auth/OTP/JWT/Google/Firebase flows untouched.
- [ ] FCM/Expo push internals unchanged — only the additive
      `notifyUpcomingAssignments` caller uses them.
- [ ] Cloudinary untouched.
- [ ] Profile completion is still 8 worker / 6 employer units;
      `weeklyAvailability` is still **not** a completion unit.
- [ ] Phase 6 apply/publish gates intact.
- [ ] Phase 7 availability compatibility is non-blocking.
- [ ] No silent/automatic job filtering; no arbitrary AI/recommendation scoring.

## Phase 8 features

- [ ] Multi-window-per-day availability validated end-to-end (backend model +
      validator + matching + mobile editor + profile summary unchanged).
- [ ] `availableOnly` fit filter is worker opt-in; when off, no job is hidden.
- [ ] `best_match` sort ranks by availability overlap, never omits jobs, and is
      deterministic.
- [ ] Fit badge visible on the job card (Phase 7 `availabilityMatch`).
- [ ] Schedule-aware "job starts soon" reminder sends **exactly one** push per
      worker/job (idempotent), with no PII in the payload.

## IDOR / PII

- [ ] Ownership re-asserted on all cross-resource reads/mutations
      (application/assignment/job/review/marketplace/completion-status).
- [ ] Marketplace & application payloads expose only fields the viewer role
      genuinely needs (no phone/email in public marketplace projections).
- [ ] Negative (cross-user) test cases pass per service.

## Manual smoke (at least one platform)

- [ ] Discovery fit toggle narrows the feed when ON and restores it when OFF.
- [ ] Best match sort orders jobs by overlap; non-matching jobs still visible.
- [ ] Availability editor allows a second window on the same day; cap enforced.
- [ ] Schedule reminder fires one push for a seeded accepted assignment starting
      soon; re-run does not duplicate.
