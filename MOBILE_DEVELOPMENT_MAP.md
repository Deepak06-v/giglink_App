# GigLink Mobile Development Map

> Maps future React Native screens to **existing** backend APIs. No invented endpoints.

---

# Worker Mobile

## Authentication

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Signup | `POST /api/auth/signup` | Create worker account | `name, email, password, role: "worker"` → `token`, `user` |
| Login | `POST /api/auth/login` | Authenticate | `email, password, role: "worker"` → `token`, `user` |
| Session restore | `GET /api/auth/me` | Validate stored JWT | `user` object |
| Logout | `POST /api/auth/logout` + clear SecureStore | End session | Remove local token |

## Home (Dashboard)

**No dedicated API.** Aggregate client-side:

| Data | API | Notes |
|------|-----|-------|
| Recent open jobs | `GET /api/jobs?page=1&limit=5` | Public list |
| Recent applications | `GET /api/applications?page=1&limit=5` | Worker's apps |
| Recent assignments | `GET /api/worker/assignments?page=1&limit=5` | Active work |
| Stats counts | Same endpoints | Use `pagination.total` for counts |

## Jobs

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Job list / search | `GET /api/jobs` | Discovery | `jobs[]`, `pagination`, filters: `q, category, city, minPay, maxPay, compensationType, date, fromDate, toDate, sort, page, limit` |
| Job details | `GET /api/jobs/:jobId` | Full job + employer info | `job`, `employer`, `applicationState` (if worker token) |
| Completion status | `GET /api/jobs/:jobId/completion-status` | Progress bar | `jobStatus`, `completion`, `waitingFor` |

## Apply

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Apply button | `POST /api/jobs/:jobId/applications` | Submit application | No body; returns `application` |
| Pre-check | `GET /api/jobs/:jobId` | `applicationState.canApply` | Avoid unnecessary POST |

## My Applications

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| List | `GET /api/applications` | All applications | `applications[]`, `pagination`, filter `status` |
| Detail | `GET /api/applications/:applicationId` | Single application | Populated `job` |
| Withdraw | `PATCH /api/applications/:applicationId/withdraw` | Cancel pending app | PENDING only |

## My Assignments

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| List | `GET /api/worker/assignments` | Active/past work | `assignments[]`, `pagination` |
| Detail | `GET /api/worker/assignments/:assignmentId` | Assignment + completion | `assignment`, `completion` |
| Mark complete | `POST /api/worker/assignments/:assignmentId/complete` | Worker confirms done | `waitingFor` response |

## Profile

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| View | `GET /api/worker/profile` | Profile data | `profile` or defaults |
| Edit | `PATCH /api/worker/profile` | Update fields | `phone, profileImage (URL), bio, location, skills, experience, languages, availability` |
| Reviews (public) | `GET /api/users/:userId/reviews` | Rating display | `summary`, `reviews` |

## Reviews (post-completion)

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Eligibility | `GET /api/worker/jobs/:jobId/review-status` | Can review employer? | `canReview`, `hasReviewed` |
| Submit | `POST /api/worker/jobs/:jobId/reviews` | Rate employer | `rating`, `comment` |

## Notifications

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| List | `GET /api/notifications` | All notifications | `notifications[]`, `pagination`, `unread` filter |
| Badge count | `GET /api/notifications/unread-count` | Tab badge | `count` |
| Mark read | `PATCH /api/notifications/:id/read` | Single | |
| Mark all read | `PATCH /api/notifications/read-all` | Bulk | `updatedCount` |

---

# Employer Mobile

## Authentication

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Signup | `POST /api/auth/signup` | Create employer | `role: "employer"` |
| Login | `POST /api/auth/login` | Authenticate | `role: "employer"` |
| Session | `GET /api/auth/me` | Restore session | `user` |
| Logout | `POST /api/auth/logout` + SecureStore clear | End session | |

## Dashboard

**No dedicated API.** Aggregate:

| Data | API | Notes |
|------|-----|-------|
| Active jobs | `GET /api/jobs/employer/jobs?page=1&limit=10` | Compute status counts client-side |
| Completed jobs | `GET /api/jobs/employer/jobs/completed?page=1&limit=5` | |
| Recent applications | `GET /api/employer/applications?page=1&limit=5` | |
| Unread notifications | `GET /api/notifications/unread-count` | `count` |

## My Jobs

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| List | `GET /api/jobs/employer/jobs` | All employer jobs | `jobs[]`, `pagination`, `status` filter |
| Completed list | `GET /api/jobs/employer/jobs/completed` | History | |
| Detail | `GET /api/jobs/employer/jobs/:jobId` | Job + completion info | `job`, `completion` |

## Create Job

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Form submit | `POST /api/jobs` | Create draft | Full job body (see API contract) |
| Publish | `PATCH /api/jobs/employer/jobs/:jobId` | Set `status: "OPEN"` | Separate step after create |

## Edit Job

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Load | `GET /api/jobs/employer/jobs/:jobId` | Pre-fill form | `job` |
| Save | `PATCH /api/jobs/employer/jobs/:jobId` | Update fields/status | Partial body allowed |
| Delete | `DELETE /api/jobs/employer/jobs/:jobId` | Remove job | Blocked if active assignments |
| Employer complete | `POST /api/jobs/employer/jobs/:jobId/complete` | Confirm job done | `completion` response |

## Applications

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| All applications | `GET /api/employer/applications` | Cross-job list | `applications[]`, `status` filter |
| Per-job list | `GET /api/employer/jobs/:jobId/applications` | Applicants for one job | |
| Applicant detail | `GET /api/employer/applications/:applicationId` | Full application | `worker`, `job` populated |

## Applicant Actions

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Accept | `PATCH /api/employer/applications/:applicationId/accept` | Hire worker | Returns `application` + `assignment` |
| Reject | `PATCH /api/employer/applications/:applicationId/reject` | Decline | Returns `application` |

## Profile

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| View | `GET /api/employer/profile` | Company info | `profile` or defaults |
| Edit | `PATCH /api/employer/profile` | Update | `companyName, companyDescription, phone, logo (URL), address, city, state, pincode` |
| Reviews | `GET /api/users/:userId/reviews` | Public ratings | `summary` |

## Reviews (post-completion)

| Screen | API(s) | Purpose | State/Data |
|--------|--------|---------|------------|
| Eligibility | `GET /api/employer/jobs/:jobId/review-status` | Per-worker status | `canReview`, `workers[]` |
| Submit | `POST /api/employer/jobs/:jobId/reviews` | Rate worker | `workerId`, `rating`, `comment` |

## Notifications

Same endpoints as Worker Notifications section (role-agnostic, auth required).

---

## Screen → API Quick Reference

```
Worker Jobs       → GET /api/jobs
Worker Apply      → POST /api/jobs/:id/applications
Worker Apps       → GET /api/applications
Worker Assign     → GET /api/worker/assignments
Employer Jobs     → GET /api/jobs/employer/jobs
Employer Create   → POST /api/jobs + PATCH (OPEN)
Employer Apps     → GET /api/employer/applications
Employer Accept   → PATCH /api/employer/applications/:id/accept
Both Auth         → POST /api/auth/login
Both Notify       → GET /api/notifications
```
