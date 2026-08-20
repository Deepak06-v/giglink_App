# GigLink Mobile API Contract

> **Source of truth:** `backend/` implementation (read-only audit, Phase 0).  
> **Base URL:** `{HOST}/api` (e.g. `http://localhost:7000/api` — see `PORT` env; default in `server.js` is `7000`, `.env.example` shows `5000`).

---

## Base API

| Item | Value |
|------|-------|
| Protocol | HTTP/HTTPS JSON REST |
| Content-Type | `application/json` |
| Auth header | `Authorization: Bearer <JWT>` |
| Success envelope | `{ success: true, message?: string, data: object }` |
| Error envelope | `{ success: false, message: string, errors?: array }` |
| Rate limit | `POST /api/auth/signup` and `POST /api/auth/login` — 20 requests / 15 min / IP |

---

## Authentication

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/auth/signup` | No | — | Register |
| POST | `/auth/login` | No | — | Login |
| GET | `/auth/me` | Yes | any | Current user |
| POST | `/auth/logout` | Yes | any | Logout (client-side token discard) |

### POST `/auth/signup`

**Body (required):**
```json
{
  "name": "string",
  "email": "string",
  "password": "string (min 8)",
  "role": "worker | employer"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id", "name", "email", "role", "isVerified" },
    "token": "JWT string"
  }
}
```

**Errors:** `400` validation, `409` email already registered.

### POST `/auth/login`

**Body (required):**
```json
{
  "email": "string",
  "password": "string",
  "role": "worker | employer"
}
```

**Success (200):** Same `data` shape as signup.

**Errors:** `400` validation, `401` invalid credentials / wrong role.

### GET `/auth/me`

**Success (200):**
```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "user": { "id", "name", "email", "role", "isVerified" }
  }
}
```

### POST `/auth/logout`

**Success (200):** `{ success: true, message: "Logged out successfully" }`  
No server-side token invalidation. Mobile app must delete JWT from SecureStore.

### JWT

| Field | Source |
|-------|--------|
| Payload | `{ userId: string, role: "worker" \| "employer" }` |
| Secret | `JWT_SECRET` env |
| Expiry | `JWT_EXPIRES_IN` env (default `7d`) |
| Refresh token | **Not implemented** |

---

## Roles

| Role | Value in DB/JWT | Capabilities |
|------|-----------------|--------------|
| Worker | `worker` | Apply, withdraw, assignments, worker profile, worker reviews |
| Employer | `employer` | CRUD jobs, review applications, complete jobs, employer profile, employer reviews |

Login requires matching `role` in body to stored user role.

---

## Worker APIs

### Applications

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/jobs/:jobId/applications` | Yes | worker | Apply to job |
| GET | `/applications` | Yes | worker | List my applications |
| GET | `/applications/:applicationId` | Yes | worker | Application detail |
| PATCH | `/applications/:applicationId/withdraw` | Yes | worker | Withdraw pending application |

**POST apply — no body.** Success `201`: `{ data: { application } }`.

**GET `/applications` query:** `page`, `limit` (max 50), `status` (`PENDING|ACCEPTED|REJECTED|WITHDRAWN`).

**Response data:**
```json
{
  "applications": [/* populated job */],
  "pagination": { "page", "limit", "total", "pages" }
}
```

### Assignments

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/worker/assignments` | Yes | worker | List assignments |
| GET | `/worker/assignments/:assignmentId` | Yes | worker | Assignment + completion |
| POST | `/worker/assignments/:assignmentId/complete` | Yes | worker | Confirm worker completion |

**GET list query:** `page`, `limit` (default 20).

**GET by id data:**
```json
{
  "assignment": { /* job populated */ },
  "completion": { "jobStatus", "completion": {...}, "waitingFor" }
}
```

**POST complete data:**
```json
{
  "assignmentStatus", "jobStatus", "waitingFor": "employer" | "workers" | null
}
```

### Profile

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/worker/profile` | Yes | worker | Get profile |
| PATCH | `/worker/profile` | Yes | worker | Create/update profile |

**PATCH body (all optional):** `phone`, `profileImage` (URL), `bio`, `location.{city,state,pincode}`, `skills[]`, `experience`, `languages[]`, `availability` (`AVAILABLE|LIMITED|UNAVAILABLE`).

### Reviews (worker)

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/worker/jobs/:jobId/reviews` | Yes | worker | Review employer |
| GET | `/worker/jobs/:jobId/review-status` | Yes | worker | Eligibility |

**POST body:** `{ "rating": 1-5, "comment": "optional string" }`

---

## Employer APIs

### Jobs (employer-scoped)

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/jobs` | Yes | employer | Create job (status `DRAFT`) |
| GET | `/jobs/employer/jobs` | Yes | employer | List own jobs |
| GET | `/jobs/employer/jobs/completed` | Yes | employer | Completed jobs |
| GET | `/jobs/employer/jobs/:jobId` | Yes | employer | Job + completion summary |
| PATCH | `/jobs/employer/jobs/:jobId` | Yes | employer | Update job |
| DELETE | `/jobs/employer/jobs/:jobId` | Yes | employer | Delete job |
| POST | `/jobs/employer/jobs/:jobId/complete` | Yes | employer | Employer completion confirm |

**GET employer jobs query:** `status`, `page`, `limit`.

### Applications (employer)

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/employer/applications` | Yes | employer | All applications across jobs |
| GET | `/employer/applications/:applicationId` | Yes | employer | Application detail |
| GET | `/employer/jobs/:jobId/applications` | Yes | employer | Applications for one job |
| PATCH | `/employer/applications/:applicationId/accept` | Yes | employer | Accept → creates assignment |
| PATCH | `/employer/applications/:applicationId/reject` | Yes | employer | Reject |

**Accept success data:**
```json
{
  "application": { /* ACCEPTED */ },
  "assignment": { /* ACTIVE */ }
}
```

### Profile

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/employer/profile` | Yes | employer | Get profile |
| PATCH | `/employer/profile` | Yes | employer | Create/update profile |

**PATCH body (optional):** `companyName`, `companyDescription`, `phone`, `logo` (URL), `address`, `city`, `state`, `pincode`.

### Reviews (employer)

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/employer/jobs/:jobId/reviews` | Yes | employer | Review worker |
| GET | `/employer/jobs/:jobId/review-status` | Yes | employer | Eligibility per worker |

**POST body:** `{ "workerId": "ObjectId", "rating": 1-5, "comment": "optional" }`

---

## Jobs

### Public discovery

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/jobs` | Optional | — | List OPEN jobs |
| GET | `/jobs/:jobId` | Optional | — | Job detail |
| GET | `/jobs/:jobId/completion-status` | **No** | — | Completion progress |

**Job statuses:** `DRAFT`, `OPEN`, `FILLED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`  
(Note: `IN_PROGRESS` is in schema; no service code auto-sets it — typically `OPEN` → `FILLED` → `COMPLETED`.)

**Categories:** `EVENT_STAFF`, `CATERING`, `WAREHOUSE`, `MOVING`, `DELIVERY_ASSISTANCE`, `CLEANING`, `PROMOTIONAL`, `GENERAL_LABOR`, `OTHER`

**Compensation types:** `hourly`, `fixed` (currency default `INR`)

### POST `/jobs` — create (employer)

**Required body fields:**
```json
{
  "title": "string",
  "description": "string",
  "category": "EVENT_STAFF | ...",
  "location": {
    "address": "string",
    "city": "string",
    "state": "string",
    "pincode": "string"
  },
  "schedule": {
    "date": "ISO8601",
    "startTime": "string",
    "endTime": "string",
    "durationHours": "number >= 0.5"
  },
  "compensation": {
    "type": "hourly | fixed",
    "amount": "number >= 0"
  },
  "workersRequired": "integer >= 1"
}
```

**Optional:** `requirements.{skills[], experience, dressCode, languages[]}`, `hiringDeadline` (ISO8601), `location.coordinates.{latitude, longitude}`.

**Created with `status: "DRAFT"`.** Publish via `PATCH` with `"status": "OPEN"`.

### GET `/jobs` — worker-enriched fields (when Bearer + worker role)

Each job may include: `canApply`, `hasApplied`, `applicationStatus`, `isAssigned`.  
Unauthenticated: `hasCapacity` only.

### GET `/jobs/:jobId` — worker `applicationState`

When authenticated worker: `{ canApply, hasApplied, applicationStatus, isAssigned }`.  
Employer info: `companyName`/`logo` from profile or `name` from User.

---

## Applications

**Statuses:** `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`

| Transition | Trigger |
|------------|---------|
| → PENDING | Worker applies |
| → ACCEPTED | Employer accepts (+ assignment created) |
| → REJECTED | Employer rejects |
| → WITHDRAWN | Worker withdraws (PENDING only) |

**Duplicate prevention:** unique index on `(job, worker)`.

---

## Assignments

**Statuses:** `ACTIVE`, `COMPLETED`, `CANCELLED` (cancel not implemented in services)

**Created automatically** when employer accepts application.

**Completion flow:** Worker `POST .../complete` + Employer `POST .../jobs/:jobId/complete` → when all workers confirmed and employer confirmed → job `COMPLETED`, assignments `COMPLETED`.

---

## Profiles

Separate MongoDB collections (`worker_profiles`, `employer_profiles`), 1:1 with User via `user` ObjectId.

GET returns default empty object if no profile document exists.

**Images:** `profileImage` / `logo` are **URL strings** — no file upload API.

---

## Dashboard

**No dedicated dashboard endpoints.** Mobile must aggregate:

| Role | Endpoints for stats |
|------|---------------------|
| Worker | `GET /jobs`, `GET /applications`, `GET /worker/assignments` |
| Employer | `GET /jobs/employer/jobs`, `GET /jobs/employer/jobs/completed`, `GET /employer/applications`, `GET /notifications/unread-count` |

---

## Notifications

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/notifications` | Yes | List notifications |
| GET | `/notifications/unread-count` | Yes | Unread count |
| PATCH | `/notifications/:notificationId/read` | Yes | Mark one read |
| PATCH | `/notifications/read-all` | Yes | Mark all read |

**Query (list):** `page`, `limit` (1–50, default 20), `unread` (`true|false`).

**Types:** `APPLICATION_RECEIVED`, `APPLICATION_ACCEPTED`, `APPLICATION_REJECTED`, `APPLICATION_WITHDRAWN`, `JOB_FILLED`, `WORKER_COMPLETION_CONFIRMED`, `EMPLOYER_COMPLETION_CONFIRMED`, `JOB_COMPLETED`, `REVIEW_RECEIVED`

**Delivery:** Database only. No WebSocket, FCM, or email.

---

## Reviews

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/users/:userId/reviews` | Optional | Public reviews + rating summary |

**Response data:**
```json
{
  "summary": { "averageRating": number|null, "totalReviews": number },
  "reviews": [...],
  "pagination": { "page", "limit", "total", "pages" }
}
```

Reviews require job `status === "COMPLETED"`. One review per (reviewer, reviewee, job).

---

## Storage

**Not implemented.** No upload endpoints, S3, Cloudinary, or multer.  
Profile images and logos must be hosted externally; store URL via profile PATCH.

---

## Pagination

Standard shape across list endpoints:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

| Endpoint | Default limit | Max limit |
|----------|---------------|-----------|
| Jobs (public) | 20 | 50 |
| Applications | 20 | 50 (validator) |
| Assignments | 20 | none enforced |
| Notifications | 20 | 50 |
| Reviews | 20 | 50 |
| Employer jobs | 20 | none enforced |

**Params:** `page` (≥1), `limit`.

---

## Search & Filters

### GET `/jobs` query parameters

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search title, description, category (regex, case-insensitive) |
| `category` | enum | Exact category filter |
| `city` | string | Exact city match (case-insensitive) |
| `minPay` | number | `compensation.amount >= minPay` |
| `maxPay` | number | `compensation.amount <= maxPay` |
| `compensationType` | `hourly\|fixed` | Filter by pay type |
| `date` | ISO date | Jobs on that calendar day |
| `fromDate` | ISO date | Schedule date range start |
| `toDate` | ISO date | Schedule date range end |
| `sort` | see below | Default `newest` |
| `page` | int | Default 1 |
| `limit` | int | Default 20, max 50 |

**Sort values:** `newest`, `oldest`, `pay_high`, `pay_low`, `date_soon`, `date_late`

**Implicit filter:** Only `status: "OPEN"` jobs; excludes past `hiringDeadline`.

**Coordinates:** Stored on job `location.coordinates` but **no geospatial query API**.

---

## Error Responses

| HTTP | When |
|------|------|
| 400 | Validation, business rule violation |
| 401 | Missing/invalid/expired token |
| 403 | Wrong role or ownership |
| 404 | Not found |
| 409 | Duplicate (email, application, review, active assignments on delete) |
| 429 | Auth rate limit |
| 500 | Unhandled server error |

**Validation error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "msg": "...", "path": "...", ... }]
}
```

**Controller/service error:**
```json
{
  "success": false,
  "message": "Human-readable message"
}
```

**Global handler (unhandled):**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Not found route:**
```json
{
  "success": false,
  "message": "Route /api/... not found"
}
```
