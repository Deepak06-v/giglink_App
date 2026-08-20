# GigLink Mobile Data Flow

> Describes how the future React Native app will interact with the existing Express API.  
> **CURRENT** = implemented today. **FUTURE** = planned for later phases.

---

## Architecture Overview

```
React Native App (Expo + TypeScript)
        │
        ├── Expo Router (navigation)
        ├── Zustand (client state)
        ├── Axios (HTTP client)
        └── Expo SecureStore (JWT persistence)
                │
                ▼
        Existing Express API (/api)
                │
                ├── JWT middleware (Bearer token)
                ├── Controllers / Services
                └── MongoDB (Mongoose)
```

No direct mobile-to-database connection. All data flows through REST JSON.

---

## Login Flow

**CURRENT backend behavior**

```
App (Login screen)
  │  POST /api/auth/login
  │  Body: { email, password, role }
  ▼
auth.controller → auth.service
  │  User.findOne(email) + bcrypt.compare
  │  Role must match
  │  generateToken({ userId, role })
  ▼
Response: { success, data: { user, token } }
  │
  ▼
Mobile app
  │  SecureStore.setItem("token", token)
  │  Zustand: set user + isAuthenticated
  ▼
Subsequent requests
  │  Axios interceptor adds:
  │  Authorization: Bearer <token>
  ▼
Protected endpoints
```

**On 401 response:** Clear SecureStore, redirect to login (mirror web `auth:logout` pattern without `window`).

**Logout:**
```
POST /api/auth/logout (optional)
SecureStore.deleteItem("token")
Zustand clear user
```
Server does not invalidate token.

---

## Signup Flow

```
App → POST /api/auth/signup { name, email, password, role }
  → User.create (bcrypt hash)
  → JWT returned immediately (auto-login)
  → SecureStore + Zustand (same as login)
```

No email verification flow despite `isVerified` field (always `false` unless changed elsewhere).

---

## Session Restore

```
App launch
  │  SecureStore.getItem("token")
  ▼
If token exists:
  GET /api/auth/me
  │  authenticate middleware → getCurrentUser
  ▼
Success → restore Zustand user
401 → clear token, show login
```

---

## Job Discovery Flow

```
App (Jobs screen)
  │  GET /api/jobs?q=...&category=...&city=...&sort=newest&page=1
  │  Optional: Bearer token (worker) for canApply enrichment
  ▼
job.controller → job.service.getPublicJobs
  │  buildDiscoveryFilter: status=OPEN, deadline check
  │  MongoDB Job.find + count
  │  If workerId: join Application + Assignment data
  ▼
Response: { jobs[], pagination }
  │
  ▼
Zustand / local state → FlatList render
```

**Job detail tap:**
```
GET /api/jobs/:jobId
  → getJobByIdPublic
  → EmployerProfile or User for employer display
  → applicationState if worker authenticated
```

---

## Application Flow

```
Worker taps Apply
  │  POST /api/jobs/:jobId/applications (no body)
  ▼
application.service.applyToJob
  │  Validate job OPEN, capacity, no duplicate
  │  Application.create (PENDING)
  │  notifyApplicationReceived → Notification (employer)
  ▼
Response 201: { application }
  │
  ▼
App refreshes job detail (applicationState.hasApplied = true)
```

**Employer review:**
```
GET /api/employer/jobs/:jobId/applications
  → list PENDING applications

PATCH /api/employer/applications/:id/accept
  → Application ACCEPTED
  → Assignment ACTIVE created
  → Job may become FILLED
  → Notifications to worker (+ employer if filled)

PATCH /api/employer/applications/:id/reject
  → Application REJECTED + notification
```

**Worker withdraw:**
```
PATCH /api/applications/:id/withdraw
  → PENDING → WITHDRAWN + notification
```

---

## Assignment Flow

```
Application ACCEPTED (automatic)
  ▼
Assignment { status: ACTIVE, job, worker }
  │
Worker: GET /api/worker/assignments
  ▼
Worker: POST /api/worker/assignments/:id/complete
  │  workerCompleted = true
  │  evaluateJobCompletion()
  │  notifyWorkerCompletionConfirmed (employer)
  ▼
Employer: POST /api/jobs/employer/jobs/:jobId/complete
  │  job.completion.employerCompleted = true
  │  evaluateJobCompletion()
  ▼
If all workers completed + employer confirmed:
  │  job.status = COMPLETED
  │  assignment.status = COMPLETED
  │  notifyJobCompleted (all participants)
  ▼
Both parties: GET review-status → POST review
```

---

## Profile Flow

```
GET /api/worker/profile (or /employer/profile)
  → Returns DB document or empty defaults

PATCH /api/worker/profile
  → findOneAndUpdate upsert
  → profileImage / logo must be URL strings
```

**FUTURE image upload (not in backend today):**
```
Camera/Gallery → External host OR future upload API
  → URL string → PATCH profile
```

---

## Notification Flow

**CURRENT**

```
Backend event (apply, accept, reject, etc.)
  ▼
notification.service.createNotification
  ▼
MongoDB notifications collection
  ▼
Mobile polls or pulls on focus:
  GET /api/notifications/unread-count (badge)
  GET /api/notifications?page=1&unread=true
  PATCH /api/notifications/:id/read
```

**FUTURE push architecture (PLAN — not implemented)**

```
Backend event
  ▼
Notification record (CURRENT)
  ▼
Push dispatch service (FUTURE)
  │  Lookup device tokens for recipient
  │  FCM/APNs send
  ▼
Device OS
  ▼
Mobile app (foreground/background handler)
  │  Refresh notification list
  │  Deep link to related job/application (FUTURE)
```

Required future backend pieces:
- `DeviceToken` model (`user`, `token`, `platform`, `createdAt`)
- `POST /api/devices/register`, `DELETE /api/devices/unregister`
- FCM admin SDK integration in `createNotification` hook

---

## Review Flow

```
Job status = COMPLETED
  ▼
Worker: GET /api/worker/jobs/:jobId/review-status
  → { canReview, hasReviewed }

Worker: POST /api/worker/jobs/:jobId/reviews { rating, comment }
  → Review created (worker → employer)
  → REVIEW_RECEIVED notification

Employer: GET /api/employer/jobs/:jobId/review-status
  → { canReview, workers: [{ workerId, hasReviewed }] }

Employer: POST /api/employer/jobs/:jobId/reviews { workerId, rating, comment }
  → Review created (employer → worker)

Public: GET /api/users/:userId/reviews
  → summary.averageRating, reviews list
```

---

## Error Flow

```
Axios response interceptor
  │
  ├─ 400: Show validation message / field errors
  ├─ 401: Clear token, navigate to login
  ├─ 403: Show "access denied"
  ├─ 404: Show "not found"
  ├─ 409: Show conflict (duplicate apply, etc.)
  ├─ 429: Show rate limit message
  └─ 500: Generic error
```

All errors: `{ success: false, message, errors? }`

---

## State Management (Zustand — FUTURE mobile)

Suggested stores mirroring API domains:

| Store | Source APIs |
|-------|-------------|
| `authStore` | login, signup, me, logout |
| `jobsStore` | GET /jobs, GET /jobs/:id |
| `applicationsStore` | /applications, /employer/applications |
| `assignmentsStore` | /worker/assignments |
| `notificationsStore` | /notifications, unread-count |
| `profileStore` | /worker/profile or /employer/profile |

Server is source of truth; Zustand holds cached copies with refresh-on-focus pattern.

---

## Pagination Pattern

```
Initial: GET /resource?page=1&limit=20
  → store items + pagination.pages

Load more: page++ while page <= pagination.pages
  → append to list
```

Use `pagination.total` for dashboard stat badges without loading full lists.
