# GigLink Mobile Gaps Analysis

> Phase 0 findings: what works today vs what needs work later.  
> **No backend changes made in this phase.**

---

## Already Supported

These backend capabilities are ready for React Native consumption without modification:

- **JSON REST API** with consistent `{ success, message, data }` envelope
- **JWT Bearer authentication** (signup, login, me, role in token)
- **Two roles:** `worker` and `employer` with route-level authorization
- **Full job lifecycle:** create (DRAFT), publish (OPEN), discover, detail, update, delete
- **Job search & filters:** `q`, category, city, pay range, compensation type, date range, sort, pagination
- **Application workflow:** apply, list, detail, withdraw, accept, reject
- **Assignment workflow:** auto-created on accept, list, detail, worker completion
- **Employer job completion** confirmation endpoint
- **Dual completion model** (worker + employer) → job COMPLETED
- **Worker & employer profiles** (GET/PATCH with upsert)
- **Review system** (bidirectional, eligibility checks, public user reviews)
- **In-app notifications** (CRUD read state, 9 event types, DB persistence)
- **Rate limiting** on auth endpoints
- **Input validation** with structured error responses
- **Optional auth** on public job endpoints (worker enrichment when token present)
- **Coordinates field** on job location (storage only)

---

## Needs Frontend Work Only

Mobile app can implement these without backend changes:

| Item | Approach |
|------|----------|
| JWT storage | Expo SecureStore instead of localStorage |
| Auth state | Zustand store + Axios interceptor (`Authorization: Bearer`) |
| Role-based navigation | Expo Router guards using `user.role` from `/auth/me` |
| Dashboard / home stats | Aggregate existing list endpoints; use `pagination.total` |
| Job search UI | Pass query params documented in `MOBILE_API_CONTRACT.md` |
| Pull-to-refresh notifications | Poll `GET /notifications` + `unread-count` on screen focus |
| Profile images | User provides image URL (external host) via PATCH until upload API exists |
| Employer logo | Same URL-based approach |
| Offline handling | Client-side cache / queue (backend has no offline support) |
| Token expiry UX | Detect 401 → redirect to login (no refresh token to handle silently) |
| Error toasts | Parse `message` and `errors[]` from API responses |
| Completed jobs history | `GET /jobs/employer/jobs/completed` (employer), assignments list (worker) |
| Review screens | Use existing review + review-status endpoints |
| CORS | Not applicable to native HTTP clients |

---

## Needs Backend Changes Later

| Gap | Current state | Likely backend work |
|-----|---------------|---------------------|
| **Push notifications** | DB notifications only | Device token model, FCM/APNs service, register/unregister endpoints, hook on `createNotification` |
| **File / image upload** | URL strings only | Upload endpoint, storage provider (S3/Cloudinary), return URL for profile PATCH |
| **Refresh tokens** | Single JWT, 7d expiry | Refresh token model, `/auth/refresh`, rotation/revocation |
| **Server-side logout** | No-op | Token blacklist or refresh revocation |
| **Dashboard API** | None | Optional `GET /api/worker/dashboard`, `GET /api/employer/dashboard` aggregates |
| **Dedicated job publish** | Manual PATCH `status: OPEN` | Optional `POST /jobs/:id/publish` |
| **Assignment cancellation** | Enum exists, unused | Cancel endpoint + status transitions |
| **Job IN_PROGRESS transition** | Enum exists, never auto-set | Business rule for when job moves to IN_PROGRESS |
| **Geospatial job search** | Coordinates stored, no 2dsphere index | GeoNear query + `lat/lng/radius` params |
| **Email verification** | `isVerified` field unused | Verification flow + email provider |
| **Employer assignment list** | No employer assignment endpoints | `GET /api/employer/assignments` or include in job detail |
| **Notification delete** | Not implemented | `DELETE /notifications/:id` |
| **Tests / OpenAPI spec** | None | Contract tests, Swagger for mobile code gen |

---

## Future Device Features

These are **out of scope for Phase 0** and require both mobile + likely backend work:

### Push Notifications
- **Backend:** Device registration, FCM integration (see above)
- **Mobile:** `expo-notifications`, permission prompts, token registration on login
- **Trigger:** Existing notification events already fire on apply/accept/complete/review

### Location
- **Backend:** Geo queries on `location.coordinates`; optional worker location on profile
- **Mobile:** `expo-location` for map view, distance sorting, near-me filter
- **Current:** City string filter only (`?city=`)

### Camera / Gallery
- **Backend:** Upload API (see file storage gap)
- **Mobile:** `expo-image-picker` → upload → store URL in profile
- **Current:** PATCH accepts URL only

### Deep Linking
- **Backend:** Optional short links or notification payload with `relatedJob` IDs (already in model)
- **Mobile:** Expo Router linking config → `giglink://jobs/:id`, `giglink://applications/:id`
- **Current:** Notification records include `relatedJob`, `relatedApplication`, `relatedAssignment` ObjectIds

### Secure Device Registration
- **Backend:** `DeviceToken` collection, tie to `userId`, platform, last active
- **Mobile:** Register on login, unregister on logout, handle token refresh from FCM

---

## Frontend Independence Notes

The **web frontend** (deleted from working tree, present in git) uses patterns the mobile app must **not** copy:

| Web pattern | Mobile replacement |
|-------------|-------------------|
| `localStorage` for JWT | Expo SecureStore |
| `window.dispatchEvent('auth:logout')` | Zustand action + router navigate |
| `withCredentials: true` | Not needed (Bearer header, not cookies) |
| `import.meta.env.VITE_API_BASE_URL` | `expo-constants` / `.env` for API URL |
| Vite dev proxy CORS | Direct API URL in native app |

The **backend** has no `localStorage`, `window`, or cookie-session dependencies. Auth is header-based — mobile-compatible.

**CORS note:** `app.js` whitelists browser origins. React Native native HTTP is not subject to browser CORS. Expo Web preview may need `FRONTEND_URL` updated.

---

## Priority Recommendations for Phase 1+

1. **Phase 1 (mobile MVP):** Auth + SecureStore + jobs + applications + assignments + profiles (URL images) + notification list polling
2. **Phase 2:** Image upload backend + mobile picker
3. **Phase 3:** Push notifications (device tokens + FCM)
4. **Phase 4:** Location-based discovery, deep linking, refresh tokens

---

## Verification Checklist (Phase 0)

- [x] Backend inspected read-only
- [x] No routes, models, or services modified
- [x] No React Native / Expo project created
- [x] Five documentation files created
- [x] All endpoints traced to actual code
- [x] No secrets exposed in documentation
