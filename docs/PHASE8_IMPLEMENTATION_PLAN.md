# GigLink — Phase 8 Implementation Plan (Final Productization / Production Readiness)

> **Status:** Investigation-only. No code, dependency, or config changes were made to produce this plan.
> **Scope:** Final phase of the Phase 0–8 roadmap. Productization + production readiness, not just new features.
> **Baseline verified during investigation:** merged Phase 1–7 implementation present and passing. Backend: 18 test files (auth, OTP, Google, phone, job incl. coordinates, application, profileCompletion, workerProfile, marketplaceProfile, availabilityMatching, push (FCM + Expo), upload, device, sms, routes, validators). Mobile: `npx tsc --noEmit` clean (EXIT=0). Prior Phase 7 report: 206/206 backend tests passing.
> **Invariant mandate:** Phase 8 must not regress any Phase 1–7 invariant (auth/OTP/JWT/Google/Firebase, FCM/push, Cloudinary, profile-completion unit counts, weeklyAvailability independence, Phase 6 apply/publish gates, Phase 7 compatibility non-blocking, no silent job filtering, no arbitrary AI scoring, no timezone redesign, no destructive migrations).

---

## 1. Executive summary

Phases 1–7 delivered a complete, test-passing gig marketplace: role-based auth (OTP/JWT/Google/Firebase), worker/employer profiles with completion gating, job CRUD with discovery & publish workflow, applications & assignments with availability-matching (Phase 7), Cloudinary uploads, FCM/Expo push notifications, marketplace profile discovery, and reviews.

Phase 8 is the **productization phase**. The marketplace is functionally complete; what remains is to make the platform *actually good and safe to operate at scale* for its primary matching loop (job discovery → apply). The single highest-leverage product gap is that **matching today only happens directionally (job→worker badge via Phase 7) and only at detail/application granularity — there is no fit-based ordering of the discovery feed, no availability-fit filter, and no schedule-aware notification**. Concurrently, the security surface has grown (IDOR-prone ownership checks, PII exposure via marketplace/notification payloads) and must be hardened before real users.

This plan separates work into **MUST HAVE** (final-MVP productization), **SHOULD HAVE** (quality/ops hardening), and **DEFERRED** (out of MVP scope). Every item is grounded in the exact files/functions inspected.

---

## 2. Current-state verification summary (grounding for all recommendations)

### Discovery & matching pipeline
- `backend/src/services/job.service.js`
  - `buildDiscoveryFilter` (~line 83): builds the Mongo query from `category/city/minPay/maxPay/compensationType/date/fromDate/toDate`. **No availability or fit dimension.**
  - `getPublicJobs` (~line 330): filters + sorts + paginates (MAX_LIMIT=50, line 36) then enriches (~374–402) each job with `duration`. **No per-worker availability filter/ranking.**
  - `getJobByIdPublic` (~line 437), `enrichJobWithDuration` (line 44).
  - Phase 6 publish gate (~584–598): `DRAFT`→`OPEN` only when completion required fields are present.
- `backend/src/services/availabilityMatching.service.js` (+ `.test.js`): Phase 7 logic — evaluates `matchJobToWorkerAvailability` with overnight (day+1) and multi-day logic; returns `availabilityMatch` (`status`, `overlappingDays`, `notes`). Used per-job during enrichment and per-application detail.
- `backend/src/services/application.service.js`
  - Worker completeness gate (~58–69) on `applyToJob`.
  - `getWorkerAvailabilityMap` batches worker schedules to avoid N+1.
  - Phase 7 `availabilityMatch` surfaced on employer application detail (~234).
- `mobile/components/jobs/JobBrowseScreen.tsx`, `JobFiltersSheet.tsx`, `components/cards/JobCard.tsx`, `JobDetailScreen.tsx`: discovery list, filter sheet (category/pay/date/sort), card + detail badges (Phase 7 `availabilityMatch`).
- `mobile/utils/availabilityMatch.ts`, `availability.ts`, `formatJob.ts`; `types/jobs.ts` (`AvailabilityMatch`, `AvailabilityMatchStatus`).

### Availability data model
- `backend/src/models/WorkerProfile.js` (~45–67): `weeklyAvailability` array of `{ day, startTime, endTime }` using day enum; plus legacy `availability` enum (`AVAILABLE/LIMITED/UNAVAILABLE`).
- `backend/src/models/Job.js` (~29–47): `schedule` `{ startDate, endDate, startTime, endTime, durationHours, date(legacy) }`.
- `backend/src/utils/schedule.js`: `timeToMinutes` (18), `calculateHoursBetweenTimes` (47), `calculateNumberOfDays` (73), `buildScheduleInfo` (180).
- `backend/src/validators/profile.validator.js` (~109–138): `weeklyAvailability` validation — rejects duplicate days (single window per day). Limits skill/experience counts.
- `backend/src/services/profileCompletion.service.js`: 8 worker / 6 employer units; **`weeklyAvailability` deliberately NOT a completion unit** (confirmed). No multi-window-per-day support.
- `mobile/app/(worker)/profile/availability.tsx`: weekly-availability editor (single window per day).

### Notification / push infrastructure (do-not-perturb)
- `backend/src/services/notification.service.js` + `push.service.js` + `device.service.js`: `createNotification` (fire-and-forget push), `pushNotifications`, Expo + FCM, `collectInvalidTokens`, `buildPushMessages` (payload carries only navigation ids, **no PII**), `DEFAULT_CHANNEL_ID = "giglink-notifications"`.
- Existing flows: application received/accepted/rejected/withdrawn, job filled, completion. **No schedule-aware ("job starts soon") notifications exist.**

### Security surface (IDOR / authorization / PII)
- `auth.middleware.js`: `authenticate`, `optionalAuthenticate`, `authorizeRoles`; sets `req.user = {userId, role}`.
- `error.middleware.js`: `errorHandler` + `notFound` — ValidationError→400, CastError→400, duplicate key→409, else 500 (no leak of internals).
- Ownership checks live mostly in **services** (good) but need audit: `application.service.js` (getEmployerApplications/detail, accept/reject), `assignment.service.js` (worker-only list/detail/complete), `review.service.js` (create review job-ownership), `marketplaceProfile.service.js`, `job.service.js` (employer update/delete/publish ownership).
- `marketplace.routes.js`: `GET /worker/:userId` (employer-only), `GET /employer/:userId` (worker-only) — exposes `weeklyAvailability` + `availability` to employers (established pattern; PII-light but includes phone/photo/bio — need to confirm minimal projection).
- `notification.service.js` / `push.service.js`: confirmed payload has no PII.

### Marketplace / discovery UX
- `mobile/app/(worker)/(tabs)/index.tsx` → `JobBrowseScreen.tsx`; `mobile/app/(worker)/jobs/[jobId].tsx` (detail); `mobile/app/(employer)/(tabs)/jobs.tsx`.
- `mobile/constants/jobs.ts`: `JOB_CATEGORIES`, `JOB_SORT_OPTIONS`, `EMPLOYER_JOB_STATUS_FILTERS`.
- `mobile/lib/api/jobs.ts`, `applications.ts`, `notifications.ts`, `client.ts`.
- i18n: `mobile/locales/en.ts` + `kn.ts` (availabilityMatch.* keys ~line 375).

### Verified network/ops baseline
- `backend/src/app.js`: helmet, express-rate-limit, route mounting, JSON body parser.
- `backend/package.json` test script includes all 18 service/routes/validator test files.
- **No timezone model anywhere** in the repo; Phase 7 documented IST (no DST). Schedule-aware notifications therefore use server-local/day granularity only — no tz redesign required (non-goal, confirmed).

---

## 3. Phase 8 Recommendations — MUST HAVE / SHOULD HAVE / DEFERRED

### MUST HAVE (final-MVP productization)

1. **Availability-fit filtering** on job discovery (opt-in, never silent). Worker sees an "Only show jobs I'm available for" toggle; when on, `getPublicJobs` filters open jobs to those where `availableDaysMatchesWorker` (using the existing `availabilityMatching` day-overlap logic). Default OFF so no job is ever hidden without intent (preserves "no silent job filtering" invariant).
2. **Fit-based ranking ("Best match")** as an explicit sort option. When a worker is signed in and selects `best_match`, jobs are ranked by availability-overlap count (and date proximity as the tiebreaker) — positive scoring only, **never penalizing/omitting** any job. Non-matching jobs are still shown (ranked last), respecting "no silent filtering" and "no arbitrary AI scoring" (deterministic, transparent).
3. **Surfacing fit first-class in discovery** — move the Phase 7 availability badge from detail-only to the job card, plus a clear "Best match for you" affordance, so the matching loop is legible to the worker without opening each job.
4. **Schedule-aware notifications ("job starts tomorrow")** — a read-only scheduled job (cron/interval) that finds accepted workers whose assignment starts soon and sends a single reminder push. Reuses existing `push.service.js`/`buildPushMessages`, touches nothing else in the stable push path. Lightweight, opt-in via existing notification preferences.
5. **Security/authorization audit + IDOR hardening** (productization requirement): centralize and verify ownership checks across application/assignment/job/review/marketplace services; ensure marketplace and notification payloads return minimal projections (no accidental PII); confirm `optionalAuthenticate` routes don't leak non-public fields.
6. **Multi-window-per-day availability** (the one model change the matching story needs). Extend `weeklyAvailability` to allow up to N windows per day (replace the single-window duplicate-day rejection with a same-day multi-slot allow), update validator + `WorkerProfile.js` + mobile availability editor/pickers, and make `availabilityMatching` evaluate all windows for the day. **Backwards compatible** (existing single-window docs still valid; no migration — additive schema widening).

### SHOULD HAVE (quality / operations hardening, low risk)

7. **Production-readiness verification tooling** — add `npm run typecheck` (mobile), document/run `npx expo-doctor`, add a backend `test:coverage` + lint gate if not present, and an explicit pre-merge verification checklist.
8. **Error-message consistency and idempotency** — verify all service mutations are idempotent and return consistent error shapes; harden the scheduled-notification job against double-send (idempotent "reminder already sent" marker).
9. **Pagination/query hygiene** — confirm marketplace/application/job list endpoints all paginate with capped limits (mirror `MAX_LIMIT=50`) and there are no unbounded `.find()` without limit.

### DEFERRED (explicitly out of final-MVP scope)

10. **Natural-language / AI recommendation scoring** — violates "no arbitrary AI/recommendation scoring" invariant; out of scope.
11. **Timezone/DST redesign** — repo has no timezone model; Phase 7 documented IST no-DST; schedule-aware notifications use day/server-local granularity. If live multi-region use later proves necessary, it is a separate follow-up phase.
12. **Cross-city/geo-radius radius rendering & employer-side fit ranking UI** — can ship in a later release; low priority relative to worker-side discovery.
13. **Any change that touches FCM/expo-push internals beyond the isolated scheduled-notification job** — the push path is stable and verified; leave it alone.
14. **Multi-window-per-day for *jobs* (multi-shift single job) or fractional windows** — only worker availability windows are widened; job schedules remain one contiguous range.

---

## 4. Phase 8 scope

In scope (all items in **MUST HAVE** + **SHOULD HAVE**). Out of scope: everything in **DEFERRED**.

Deliverables:
1. Worker availability-fit filter (opt-in) on discovery.
2. "Best match" deterministic fit-based sort for worker job discovery.
3. Fit badge on job card (Phase 7 badge promoted to card) + discovery legibility.
4. Scheduled "job starting soon" push notifications (isolated job, reusing push.service).
5. Security/authorization audit + IDOR/PII hardening fixes.
6. Multi-window-per-day worker availability (model + validator + matching + mobile editor).
7. Production-readiness verification tooling + gates.
8. Tests + manual verification for all of the above.

Non-goals (explicit):
- No AI/fuzzy recommendation scoring.
- No timezone redesign.
- No changes to FCM/Expo internals, Cloudinary, auth/OTP/JWT/Google/Firebase flows.
- No destructive migrations (multi-window is additive).
- No job-schedule multi-shift model.
- No silent/automatic job filtering or hiding (fit is opt-in + deterministic ranking, not omission).

---

## 5. File-by-file changes

### 5.1 Availability-fit filtering + Best-match ranking (backend)

**`backend/src/services/availabilityMatching.service.js`**
- Add `buildDayOverlap(workerWeeklyAvailability, jobSchedule)` helper that returns a count/set of overlapping weekdays using the current day-overlap resolution (reuse `schedule.js` utils). Decouple "overlap count" from the existing full `availabilityMatch` so both filter and rank use the same ground truth.
- Make matching evaluate **all windows per day** (multi-window support): iterate `weeklyAvailability` windows for a given weekday instead of a single window.
- Keep all existing public functions' signatures intact for backward compatibility; export the new overlap helper.

**`backend/src/services/job.service.js`**
- `buildDiscoveryFilter` (~83): when `availableOnly=true` and a signed-in worker is provided, add a day-overlap constraint on open jobs. Implementation: fetch worker `weeklyAvailability`, compute eligible weekday set, and add a Mongo filter `$expr`/post-filter over job `schedule` dates→weekdays (must remain consistent with `availabilityMatching` logic — prefer filtering in JS after the initial query to reuse the single source of truth, then paginate the filtered set; cap `MAX_LIMIT`).
- `getPublicJobs` (~330): accept `availableOnly`, `sort=best_match`, and a `workerId` (from `auth`). When `sort=best_match`, compute overlap score per job (availability overlap, date proximity tiebreak) in-memory after fetch and sort; **never drop non-matching jobs** (they rank last). Preserve all existing sorts/enrichment.
- Add the fit fields (`availabilityMatch`, `fitScore`, `bestMatch`) to the enrichment block (~374–402) so the worker payload carries the badge data already available today.
- `getJobByIdPublic` (~437): same fit enrichment (non-blocking, informational).

**`backend/src/routes/job.routes.js`**
- Wire `availableOnly` and signed-in worker to `getPublicJobs`. Path ordering guard: keep `/employer/jobs` before `/:jobId` (already correct).

**`backend/src/validators/job.validator.js`**
- `listJobsQueryValidation`: add optional `availableOnly` (`in ['true','false']`), add `best_match` to `VALID_SORT_OPTIONS`.

**`backend/src/middleware/auth.middleware.js`**
- No signature change needed: `optionalAuthenticate` already sets `req.user` when present. Ensure `getPublicJobs` reads `req.user?.userId` (worker) only.

### 5.2 Multi-window-per-day availability (model + validator + matching)

**`backend/src/models/WorkerProfile.js`** (~45–67)
- Keep `weeklyAvailability` schema shape (`{ day, startTime, endTime }`) but remove the "one window per day" cardinality constraint at the model level (already an array). Add a `_id: false` subdocument note; enforce count via validator service, not schema.
- Add `maxWindowsPerDay` (constant, e.g., 3) exposed for the validator/mobile.

**`backend/src/validators/profile.validator.js`** (~109–138)
- Replace "reject duplicate day" with "allow up to N windows per day, each validated (`HH:MM`, start<end), total windows bounded". Preserve existing single-window submissions (backwards compatible).

**`backend/src/services/availabilityMatching.service.js`** — multi-window evaluation (see 5.1).

**`backend/src/services/profileCompletion.service.js`**
- **Unchanged** — `weeklyAvailability` remains a non-completion unit (invariant preserved). No completion-count change.

**`mobile/types/jobs.ts`** — keep `WeeklyAvailabilityWindow`; no shape change needed (array already). Add any count constants.

**`mobile/app/(worker)/profile/availability.tsx`** — allow adding multiple windows per day (add/remove) with the new per-day cap; keep the existing single-window UX path working.

**`mobile/locales/en.ts` / `kn.ts`** — new strings for "add window", "remove window", "max windows reached", "available only", "best match".

### 5.3 Schedule-aware notifications ("job starts soon")

**`backend/src/services/notification.service.js`**
- Add `notifyUpcomingAssignments()` (or a sibling module) that scans open/accepted assignments whose `job.schedule` start falls within a window (e.g., 24h) and where the worker has not already been reminded. Reuses `createNotification` + `pushNotifications` (existing fire-and-forget path).
- Idempotency: store a send marker (e.g., on the assignment record or a dedupe key) so re-runs don't double-notify.

**NEW `backend/src/jobs/upcomingAssignmentsScheduler.js`**
- Read-only scheduled runner (setInterval / cron). **It must not alter any existing push/notification code path** — it is an additive caller.
- Guard: runs only in `NODE_ENV != 'test'`, configurable interval, bounded batch (avoid hammering push.service).

**`backend/src/app.js`**
- Start the scheduler (guarded), or document the external cron trigger (preferred: no change to startup path; expose a single route/task runner invoked by cron).

**Invariant check:** pushes continue to carry only navigation ids, no PII (unchanged `buildPushMessages`).

### 5.4 Security/authorization audit + IDOR/PII

- **`backend/src/services/application.service.js`** — verify `getEmployerApplications`, `getApplicationDetail`, `acceptApplication`, `rejectApplication` all assert `employer` owns the job before acting (audit; fix any gaps).
- **`backend/src/services/assignment.service.js`** — verify list/detail/complete are worker-scoped (audit).
- **`backend/src/services/review.service.js`** — verify create-review ownership of the job + that worker/employer roles can only review the correct side (audit).
- **`backend/src/services/marketplaceProfile.service.js`** + **`marketplace.routes.js`** — audit projection; only return PII the other role genuinely needs (employer sees worker name/photo/skills/availability/rating; **not** phone/email unless intended). Tighten projection.
- **`backend/src/services/notification.service.js` / `push.service.js`** — confirm no PII in push payloads (already clean; add a guard assertion/test).
- **`backend/src/middleware/auth.middleware.js` / `error.middleware.js`** — confirm no internal error leakage; add a test that 500 responses don't expose stack/message.
- **`backend/src/routes/job.routes.js` / employer routes** — verify employer update/delete/publish enforce ownership (audit).

### 5.5 Production-readiness tooling

- **`mobile/package.json`** — add `"typecheck": "tsc --noEmit"` (already runs clean).
- **`backend/package.json`** — ensure `test:coverage` and a lint script; document the pre-merge gates.
- **`docs/`** — add a short `VERIFICATION.md` (or extend this plan) capturing the pre-merge checklist (backend tests, mobile typecheck, expo-doctor, manual smoke script).

---

## 6. API / data contracts

### Discovery (GET /jobs) — extended query params (all optional)
```
availableOnly: "true"|"false"   // worker opt-in; default false (no silent filtering)
sort: "best_match" | ...existing  // best_match only meaningful with worker
```
Response object per job: existing fields plus (when signed-in worker & mode warrants):
```
fit: { score: number, overlappingWeekdays: number, bestMatch: boolean }
availabilityMatch: { status, overlappingDays, notes }   // existing shape (Phase 7)
```

### Worker availability (profile update) — unchanged envelope
```
weeklyAvailability: [{ day, startTime, endTime }]   // array; >1 window per day now allowed (<= maxWindowsPerDay)
```
Backwards compatible: existing single-window payloads still validate.

### Notifications — no public API change
- New internal task `notifyUpcomingAssignments`; single reminder push reusing existing `createNotification`/`pushNotifications`; payload still only navigation ids (no PII).

### Data model deltas
- `WorkerProfile.weeklyAvailability`: cardinality only (additive). No new fields, no migration.
- (Optional) `Assignment` (or dedupe store): one idempotency marker field for "reminder sent" — additive.

---

## 7. Security considerations

- **IDOR audit** is a hard MUST-HAVE; all cross-resource mutations must re-assert ownership. Adds regression tests per route.
- **Minimize PII projection** on marketplace + employer application payloads; add tests asserting excluded fields.
- **Rate limiting** already applied globally (`express-rate-limit`); ensure new discovery params and any new route inherit it and cannot be used to enumerate other users' data.
- **No silent filtering**: `availableOnly` is user-initiated and `best_match` never omits jobs — preserves the "no silent job filtering" invariant and prevents trust erosion.
- **Scheduler safety**: upcoming-assignment reminder job is read-only, idempotent, bounded batch, guarded to non-test env.
- **Push invariants**: no PII added; only navigation ids; unchanged `buildPushMessages`.

---

## 8. Migration requirements

- **No destructive migrations.** Multi-window availability is an additive schema/cardinality change.
- Legacy single-window `weeklyAvailability` documents remain valid unchanged.
- If a dedupe marker is added to `Assignment`, backfill not required (only new reminders record it).
- Job schedule model unchanged (single contiguous range).

---

## 9. Test plan

Add/extend tests (node:test, matching existing style in `backend/`):

1. **`availabilityMatching.service.test.js`** — multi-window-per-day overlap; overnight/multi-day still passing (regression); new `buildDayOverlap` unit cases.
2. **`job.service.test.js`** — `getPublicJobs` with `availableOnly` (filters open jobs, opt-in only, no jobs hidden when off); `sort=best_match` (ordering by overlap, non-matching jobs still present, deterministic); fit enrichment present.
3. **`job.validator.test.js`** / routes — `availableOnly` and `best_match` accepted; invalid values rejected with 400.
4. **`profile.validator.test.js`** — multi-window-per-day accepted up to cap; >cap rejected; malformed windows rejected; single-window legacy still passes.
5. **`notification.service.test.js`** — `notifyUpcomingAssignments` sends one reminder (idempotent), scopes to accepted workers, no double-send, payload has no PII.
6. **`application.service.test.js` / `assignment.service.test.js` / `review.service.test.js` / `marketplaceProfile.service.test.js`** — new IDOR cases: cross-user access returns 403/404, ownership asserted.
7. **`error.middleware`/auth tests** — 500 responses do not leak internals.
8. **Security tests** — marketplace + application payloads exclude PII fields not needed by the viewer role.

Run: `npm test` in `backend` (all 18 + new files) must stay green; `npm run typecheck` in `mobile` clean.

---

## 10. Manual verification plan (mobile)

1. **Discovery fit toggle**: worker logs in → JobBrowse → toggle "Only show jobs I'm available for" ON → feed narrows to overlapping open jobs; toggle OFF → full feed returns (nothing silently hidden).
2. **Best match sort**: select "Best match" → jobs ordered by availability overlap (non-matching jobs appear last, still visible); card shows fit badge.
3. **Availability editor**: worker profile → availability → add a second window on the same day → saved and reflected in matching; cap enforced; legacy single-window still loads.
4. **Schedule reminder**: with a dev-seeded accepted assignment starting tomorrow → run scheduler task → worker receives one "job starts soon" push with correct navigation; re-run does not duplicate.
5. **Note**: multi-window change must not alter profile completion % or the worker profile availability summary (invariant).
6. **Android/iOS smoke**: job browse, apply, notification tap flow unchanged.

---

## 11. Implementation order

1. **Multi-window-per-day availability** (foundation for matching) — model open/validator fix, `availabilityMatching` multi-window, mobile editor. _This is the only data-model change; land first and independently with full tests._
2. **Availability-fit filter + Best-match ranking** on backend (`job.service`, validator, routes) + tests.
3. **Mobile discovery UX** — fit toggle, best-match sort, card fit badge, i18n (en/kn).
4. **Schedule-aware notifications** — `notifyUpcomingAssignments` + scheduler (isolated, guarded) + idempotency + tests.
5. **Security/authorization audit + IDOR/PII fixes** + regression tests (can run in parallel with 2–4; land as reviewed bundle).
6. **Production-readiness tooling** — scripts, coverage, docs/VERIFICATION.md.
7. **Full test sweep + manual verification** against the verification gates below.

---

## 12. Verification gates (definition of done checklist)

Before this phase is considered complete, all of the following must hold:

- [ ] Backend `npm test` green — all existing 18 test files **plus** new Phase 8 tests (no regressions).
- [ ] Mobile `npm run typecheck` clean (tsc --noEmit, EXIT=0).
- [ ] `npx expo-doctor` (or documented equivalent) passes; no new dependency drift.
- [ ] All Phase 1–7 invariants re-verified: auth/OTP/JWT/Google/Firebase untouched; FCM/expo-push internals unchanged (only additive `notifyUpcomingAssignments` caller); Cloudinary untouched; profile completion still 8/6 units; `weeklyAvailability` still not a completion unit; Phase 6 apply/publish gates authoritative; Phase 7 compatibility non-blocking; no silent filtering; no arbitrary AI scoring.
- [ ] Multi-window availability validated end-to-end (backend + mobile + matching + profile summary unchanged).
- [ ] Fit toggle + Best-match sort verified (opt-in; non-matching jobs never hidden; deterministic order).
- [ ] Schedule-aware notification sends exactly one reminder per worker/job (idempotent), with no PII in payload.
- [ ] IDOR/PII audit complete with passing negative test cases per route; no stack/internal leakage in 500s.
- [ ] Manual verification steps in §10 pass on at least one platform.
- [ ] `docs/PHASE8_IMPLEMENTATION_PLAN.md` states the delivered scope, non-goals, and any deferred follow-ups.

---

## 13. Follow-ups (deferred / future)

- Timezone/DST redesign if multi-region live data ever demands it (needs a dedicated phase; not Phase 8).
- Employer-side fit ranking UI and geo-radius radius rendering.
- AI/natural-language job matching (requires explicit product decision + invariant change).
- Job multi-shift (multi-window schedule per job) — separate from worker availability multi-window.
