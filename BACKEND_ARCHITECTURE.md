# GigLink Backend Architecture

> Phase 0 read-only audit. All statements derived from `backend/` source code.

---

## 1. Overview

GigLink is a Node.js/Express REST API for a local gig marketplace. Workers discover jobs, apply, get assigned, and complete work. Employers post jobs, review applications, confirm completion, and leave reviews.

**Architecture pattern:** Layered MVC-style

```
HTTP Request
    ↓
Express App (app.js)
    ↓
Route → Validator (express-validator) → Middleware (auth) → Controller
    ↓
Service (business logic)
    ↓
Mongoose Model → MongoDB
    ↓
JSON Response
```

---

## 2. Technology Stack

| Technology | Version | Purpose | Mobile interaction |
|------------|---------|---------|-------------------|
| Node.js | Not pinned in package.json | Runtime | Indirect (API consumer) |
| Express | ^4.18.2 | HTTP server | Direct via Axios |
| MongoDB | via `MONGO_URI` | Primary database | Indirect |
| Mongoose | ^8.0.3 | ODM | Indirect |
| jsonwebtoken | ^9.0.2 | JWT sign/verify | Mobile stores token in SecureStore |
| bcryptjs | ^2.4.3 | Password hashing (12 rounds) | Indirect |
| express-validator | ^7.0.1 | Request validation | Direct (error format) |
| cors | ^2.8.5 | Cross-origin | Native apps bypass browser CORS |
| helmet | ^8.3.0 | Security headers | Transparent |
| express-rate-limit | ^8.6.2 | Auth endpoint throttling | Direct |
| dotenv | ^16.3.1 | Env loading | N/A |

**Not present:** Socket.IO, WebSockets, email (nodemailer), file upload (multer), cloud storage SDK, FCM/Firebase, testing framework, Docker, TypeScript.

---

## 3. Folder Structure

```
backend/
├── server.js                 # Entry: DB connect, listen, graceful shutdown
├── package.json
├── .env.example
└── src/
    ├── app.js                # Express setup, middleware, route mounting
    ├── config/
    │   └── db.js             # Mongoose connection
    ├── models/               # 8 Mongoose schemas
    │   ├── User.js
    │   ├── WorkerProfile.js
    │   ├── EmployerProfile.js
    │   ├── Job.js
    │   ├── Application.js
    │   ├── Assignment.js
    │   ├── Review.js
    │   └── Notification.js
    ├── routes/               # 11 route files
    ├── controllers/          # 8 controllers
    ├── services/             # 9 services
    ├── middleware/
    │   ├── auth.middleware.js
    │   └── error.middleware.js
    ├── validators/           # 6 validator files
    └── utils/
        └── jwt.js
```

---

## 4. Request Lifecycle

1. **server.js** loads `dotenv`, connects MongoDB, starts Express on `PORT` (default `7000`).
2. **app.js** applies request logging, `helmet`, `express.json`, `cors`, rate limiters on auth paths.
3. Route matched → optional **express-validator** chain → **authenticate** / **optionalAuthenticate** / **authorizeRoles** → **controller**.
4. Controller calls **service**, catches errors with `statusCode` on Error objects.
5. Unmatched routes → **notFound** (404). Uncaught errors → **errorHandler** (500).

---

## 5. Authentication

### Signup (`POST /api/auth/signup`)

```
auth.routes → signupValidation → signupController → auth.service.signup
  → User.findOne(email) → bcrypt.hash(12) → User.create → generateToken
```

- Duplicate email → `409`
- Returns user (no password) + JWT

### Login (`POST /api/auth/login`)

```
loginValidation → loginController → auth.service.login
  → User.findOne(email).select("+password") → bcrypt.compare → role check → generateToken
```

- Wrong password/email/role → `401` "Invalid credentials"

### Logout (`POST /api/auth/logout`)

**Client-side only.** Controller returns success JSON. No token blacklist, no refresh token revocation.

### JWT (`utils/jwt.js`)

- **Sign payload:** `{ userId, role }`
- **Verify:** `jwt.verify(token, JWT_SECRET)`
- **Expiry:** `JWT_EXPIRES_IN` (default `7d`)

### Middleware (`auth.middleware.js`)

| Middleware | Behavior |
|------------|----------|
| `authenticate` | Requires `Authorization: Bearer <token>`. Sets `req.user = { userId, role }`. Missing → 401. Expired → 401 "Token expired". Invalid → 401 "Invalid token". |
| `optionalAuthenticate` | Same extraction; invalid token → continue without `req.user` |
| `authorizeRoles(...roles)` | Requires `req.user.role` in allowed list → else 403 |

---

## 6. Authorization

**Roles (User model enum):** `worker`, `employer` — only two roles exist.

**Ownership checks (in services):**
- Jobs: `employer` field must match authenticated user
- Applications: worker owns worker routes; employer owns via `job.employer`
- Assignments: worker owns via `worker` field
- Notifications: `recipient` must match user
- Reviews: reviewer must be authenticated party with valid assignment

---

## 7. Database Architecture

### User (`users`)

| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | required, unique, indexed, lowercase |
| password | String | required, `select: false` |
| role | String | enum: worker, employer |
| isVerified | Boolean | default false |
| timestamps | | createdAt, updatedAt |

### WorkerProfile (`worker_profiles`)

| Field | Type | Notes |
|-------|------|-------|
| user | ObjectId → User | required, unique |
| phone | String | |
| profileImage | String | URL stored as string |
| bio | String | max 1000 |
| location | { city, state, pincode } | embedded |
| skills | [String] | |
| experience | String | |
| languages | [String] | |
| availability | String | enum: AVAILABLE, LIMITED, UNAVAILABLE; default AVAILABLE |

### EmployerProfile (`employer_profiles`)

| Field | Type | Notes |
|-------|------|-------|
| user | ObjectId → User | required, unique |
| companyName | String | required, max 200 |
| companyDescription | String | max 2000 |
| phone, logo, address, city, state, pincode | String | logo is URL string |

### Job (`jobs`)

| Field | Type | Notes |
|-------|------|-------|
| employer | ObjectId → User | required, indexed |
| title, description | String | required |
| category | String | enum (9 categories) |
| location | embedded | address, city, state, pincode, coordinates? |
| schedule | embedded | date, startTime, endTime, durationHours |
| compensation | embedded | type (hourly/fixed), amount, currency (default INR) |
| workersRequired | Number | min 1 |
| requirements | embedded | skills, experience, dressCode, languages |
| hiringDeadline | Date | optional |
| status | String | DRAFT, OPEN, FILLED, IN_PROGRESS, COMPLETED, CANCELLED |
| completion | { employerCompleted, employerCompletedAt } | |
| completedAt | Date | |
| timestamps | | |

**Indexes:** createdAt, schedule.date, employer+status, location.city, category, compensation.amount, compound status filters.

### Application (`applications`)

| Field | Type | Notes |
|-------|------|-------|
| job | ObjectId → Job | required |
| worker | ObjectId → User | required |
| status | String | PENDING, ACCEPTED, REJECTED, WITHDRAWN |
| appliedAt | Date | default now |
| reviewedAt, reviewedBy | Date, ObjectId | set on accept/reject |

**Unique index:** `(job, worker)`

### Assignment (`assignments`)

| Field | Type | Notes |
|-------|------|-------|
| job | ObjectId → Job | required |
| worker | ObjectId → User | required |
| status | String | ACTIVE, COMPLETED, CANCELLED |
| workerCompleted, workerCompletedAt | Boolean, Date | |
| employerCompleted, employerCompletedAt | Boolean, Date | on assignment (unused; employer completion on Job) |

**Unique index:** `(job, worker)`

### Review (`reviews`)

| Field | Type | Notes |
|-------|------|-------|
| reviewer, reviewee | ObjectId → User | required |
| job | ObjectId → Job | required |
| assignment | ObjectId → Assignment | required |
| rating | Number | 1–5 integer |
| comment | String | max 1000 |

**Unique index:** `(reviewer, reviewee, job)`

### Notification (`notifications`)

| Field | Type | Notes |
|-------|------|-------|
| recipient | ObjectId → User | required |
| type | String | 9 enum values |
| title, message | String | required |
| relatedJob, relatedApplication, relatedAssignment | ObjectId | optional refs |
| isRead | Boolean | default false |
| readAt | Date | |

---

## 8. Entity Relationships

```
User (worker)
  ├── 1:1 WorkerProfile (user ref)
  ├── 1:N Application (worker ref)
  ├── 1:N Assignment (worker ref)
  ├── 1:N Review as reviewer/reviewee
  └── 1:N Notification (recipient)

User (employer)
  ├── 1:1 EmployerProfile (user ref)
  ├── 1:N Job (employer ref)
  └── (same Review/Notification relations)

Job
  ├── N:1 User (employer)
  ├── 1:N Application
  ├── 1:N Assignment
  └── 1:N Review

Application
  ├── N:1 Job
  ├── N:1 User (worker)
  └── accept → creates Assignment

Assignment
  ├── N:1 Job
  └── N:1 User (worker)
```

All relationships use **ObjectId references** with Mongoose `ref` and `populate()`. No embedded user documents in core entities.

---

## 9. Job Lifecycle

```
CREATE (employer POST /jobs)
  → status: DRAFT

PATCH status: OPEN (employer)
  → visible in GET /jobs (public discovery)

Worker applies → Application PENDING

Employer accepts → Assignment ACTIVE
  → if activeAssignments >= workersRequired → status: FILLED

Worker POST assignment/complete → workerCompleted: true
Employer POST jobs/:id/complete → job.completion.employerCompleted: true

evaluateJobCompletion():
  if employerCompleted AND all workers completed AND enough assignments
    → job.status: COMPLETED, assignments.status: COMPLETED
```

**Note:** `IN_PROGRESS` exists in enum but no service auto-transitions to it. Can only be set manually via PATCH.

**Delete:** Blocked if active assignments exist (`409`).

---

## 10. Application Lifecycle

```
Worker POST /jobs/:jobId/applications
  → validate: job OPEN, deadline not passed, not own job, no duplicate, capacity
  → Application PENDING
  → notifyApplicationReceived (employer)

Employer PATCH accept
  → Application ACCEPTED + Assignment ACTIVE
  → maybe Job FILLED + notifyJobFilled

Employer PATCH reject
  → Application REJECTED + notifyApplicationRejected

Worker PATCH withdraw (PENDING only)
  → Application WITHDRAWN + notifyApplicationWithdrawn
```

---

## 11. Assignment Lifecycle

- **Created:** Only via `acceptApplication` (not standalone API).
- **Active work:** status `ACTIVE`.
- **Worker completion:** `workerCompleteAssignment` sets flags, may notify employer.
- **Employer completion:** `employerCompleteJob` on job entity.
- **Final:** `evaluateJobCompletion` marks job and assignments `COMPLETED`.
- **CANCELLED:** Enum exists; no implementation sets this status.

---

## 12. Profile Architecture

- **Separate collections** linked 1:1 to User.
- **Lazy creation:** GET returns defaults; PATCH uses `findOneAndUpdate` with `upsert: true`.
- **Images:** URL strings only (`profileImage`, `logo`). Validated as URL on PATCH.
- **No statistics endpoints** on profiles; review summary via `GET /users/:userId/reviews`.

---

## 13. Notification Architecture

### Creation events (implemented)

| Event | Type | Recipient |
|-------|------|-----------|
| Worker applies | APPLICATION_RECEIVED | Employer |
| Application accepted | APPLICATION_ACCEPTED | Worker |
| Application rejected | APPLICATION_REJECTED | Worker |
| Application withdrawn | APPLICATION_WITHDRAWN | Employer |
| Job filled | JOB_FILLED | Employer |
| Worker confirms completion | WORKER_COMPLETION_CONFIRMED | Employer |
| Employer confirms completion | EMPLOYER_COMPLETION_CONFIRMED | Workers |
| Job completed | JOB_COMPLETED | All participants |
| Review created | REVIEW_RECEIVED | Reviewee |

### Delivery

- **Database persistence only** (`Notification.create`)
- Failures logged, do not block main operation
- **No** WebSocket, SSE, FCM, email, or polling endpoint beyond REST list

### Mobile push readiness

- Notification model and REST API exist
- **Missing:** Device token model, FCM/APNs integration, push dispatch service
- Future: store device tokens per user, hook `createNotification` to push dispatcher

---

## 14. Storage Architecture

**Not implemented.** No file upload routes, no cloud storage, no local file serving.

Profile images and logos are external URLs stored in MongoDB and validated with `isURL()`.

---

## 15. Error Handling

| Layer | Mechanism |
|-------|-----------|
| Validators | 400 + `errors` array |
| Controllers | catch → `{ success: false, message }` with `error.statusCode` |
| Global errorHandler | Mongoose ValidationError, CastError, duplicate key (11000) |
| notFound | 404 for unknown routes |

Service errors use `const error = new Error("..."); error.statusCode = N; throw error`.

---

## 16. Security

| Area | Implementation |
|------|----------------|
| Password hashing | bcrypt, 12 salt rounds |
| JWT | HS256 via jsonwebtoken, secret from env |
| Auth | Bearer token header |
| Authorization | Role middleware + service-level ownership |
| Input validation | express-validator on routes |
| CORS | Whitelist: FRONTEND_URL, localhost:5173, localhost:3000 |
| Rate limiting | 20/15min on signup/login |
| Helmet | Enabled |
| File access | N/A (no uploads) |

---

## 17. Deployment / Configuration

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Optional | Server port (default 7000 in code, 5000 in .env.example) |
| `MONGO_URI` | **Required** | MongoDB connection string |
| `JWT_SECRET` | **Required** | JWT signing secret |
| `JWT_EXPIRES_IN` | Optional | Token TTL (default `7d`) |
| `NODE_ENV` | Optional | Logged at startup |
| `FRONTEND_URL` | Optional | CORS allowed origin |

### Scripts

- `npm start` → `node server.js`
- `npm run dev` → `node --watch server.js`

No Docker, CI, or test scripts in backend.

---

## 18. Mobile Readiness

| Area | Status |
|------|--------|
| JSON REST API | ✅ Ready |
| JWT Bearer auth | ✅ Ready (no refresh token) |
| Role-based access | ✅ Ready |
| CORS | ✅ Native apps unaffected by browser CORS |
| Cookies/session | ❌ Not required (header auth) |
| File upload | ❌ URL-only profiles |
| Push notifications | ❌ DB only; needs backend extension |
| Dashboard API | ❌ Client aggregation required |
| Geolocation search | ❌ Coordinates stored, no geo queries |
| Refresh tokens | ❌ Not implemented |

---

## 19. Potential Issues

| Issue | Area | Severity | Notes |
|-------|------|----------|-------|
| No refresh token | Auth | Medium | Mobile must re-login after JWT expiry |
| Logout is no-op server-side | Auth | Low | Token valid until expiry |
| `GET /jobs/:jobId/completion-status` unauthenticated | Jobs | Medium | Exposes completion progress publicly |
| No file upload API | Profiles | Medium | Mobile needs external image host or future backend work |
| `IN_PROGRESS` never auto-set | Jobs | Low | Enum exists but unused in transitions |
| `Assignment.CANCELLED` unused | Assignments | Low | No cancel workflow |
| CORS whitelist may block web-based Expo | CORS | Low | Native RN unaffected; Expo web may need origin added |
| `FRONTEND_URL` not in .env.example | Config | Low | Documented only in app.js |
| PORT mismatch (.env.example 5000 vs code 7000) | Config | Low | Confusing for new developers |
| Employer dashboard stats from paginated subset | Dashboard | Low | Frontend computes stats from first page only |
| `withCredentials: true` on web frontend | Frontend | Info | Backend supports credentials but uses Bearer, not cookies |
| Debug console.log in auth middleware | Security/ops | Low | Logs auth presence in production |
| No tests | Quality | Medium | No automated API contract verification |

---

## Route Mount Summary (`app.js`)

| Mount | Routes file |
|-------|-------------|
| `/api/auth` | auth.routes |
| `/api/jobs` | job.routes |
| `/api/worker` | assignment, workerProfile, workerReview |
| `/api/employer` | employerApplication, employerProfile, employerReview |
| `/api/notifications` | notification.routes |
| `/api` | application (worker), user (reviews) |
