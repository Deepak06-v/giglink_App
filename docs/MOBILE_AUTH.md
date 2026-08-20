# GigLink Mobile — Authentication

> Phase 2 implementation. Email/password only. Google Sign-In intentionally deferred.

---

## 1. Authentication architecture

```
App launch
    ↓
AuthBootstrap.initialize()
    ↓
Read JWT from SecureStore
    ↓
┌─────────────┴─────────────┐
│                           │
No token                 Token exists
│                           │
▼                           ▼
Auth screens            GET /auth/me
                              │
                    ┌─────────┴─────────┐
                    │                   │
                  Valid              401
                    │                   │
                    ▼                   ▼
              Restore user        Clear token
                    │                   │
                    ▼                   ▼
            Role routing          Login screen
```

GigLink JWT is the session token. No refresh tokens.

---

## 2. Email/password flow

### Signup — `POST /api/auth/signup`

**Body:** `{ name, email, password, role }` where `role` is `worker` | `employer`

**Response:** `{ success, data: { user, token } }`

### Login — `POST /api/auth/login`

**Body:** `{ email, password, role }`

**Response:** `{ success, data: { user, token } }`

Login requires the role to match the stored account role.

---

## 3. Google authentication

**Not implemented in Phase 2** (per project decision).

The backend has no Google/OAuth endpoints. No backend changes were made.

---

## 4. JWT lifecycle

1. Received from signup/login response (`data.token`)
2. Stored in SecureStore (`SECURE_STORAGE_KEYS.ACCESS_TOKEN`)
3. Attached to requests via Axios interceptor (`Authorization: Bearer <token>`)
4. Validated on app launch via `GET /auth/me`
5. Cleared on logout, 401, or failed session restore

---

## 5. SecureStore

**File:** `lib/storage/secureStorage.ts`

| Key | Value |
|-----|-------|
| `giglink_access_token` | GigLink JWT only |

Passwords are never stored.

---

## 6. Zustand store

**File:** `store/authStore.ts`

| State | Purpose |
|-------|---------|
| `user` | Current user from API |
| `token` | In-memory JWT (also in SecureStore) |
| `isAuthenticated` | Session active |
| `isInitializing` | App launch session check |
| `isLoading` | Login/signup/logout in progress |
| `error` | Last auth form error |

| Action | Purpose |
|--------|---------|
| `initialize` | Restore session on launch |
| `login` | Email/password login |
| `signup` | Create account |
| `logout` | Clear session + navigate to login |
| `clearAuth` | Clear token/state (401 handler) |
| `setUser` | Update user object |
| `clearError` | Clear form error |

---

## 7. Axios interceptor

**File:** `lib/api/client.ts`

- **Request:** Reads JWT from SecureStore, sets `Authorization` header
- **Response (401):** Calls `clearAuth` + redirects to login (except `/auth/login` and `/auth/signup`)

**Setup:** `lib/api/setupAuth.ts` called from `AuthBootstrap`

---

## 8. GET /auth/me

**Endpoint:** `GET /api/auth/me`  
**Auth:** Required

Used during `initialize()` to restore user after reading token from SecureStore.

On 401: token deleted, user sent to login.

---

## 9. Role routing

| Role | Route group | Placeholder screen |
|------|-------------|-------------------|
| `worker` | `/(worker)` | Worker Application |
| `employer` | `/(employer)` | Employer Application |

**Guards:** `components/auth/AuthGuards.tsx`

- Authenticated users cannot access `(auth)` screens
- Workers cannot access `(employer)` and vice versa

---

## 10. Logout

Client-side only (backend does not invalidate JWT):

1. Optional `POST /auth/logout`
2. Delete JWT from SecureStore
3. Clear Zustand state
4. Navigate to `/(auth)/login`

---

## 11. 401 handling

Triggered when any authenticated API call returns 401 (except login/signup).

1. `clearAuth()`
2. `router.replace('/(auth)/login')`
3. Loop guard via `isHandlingUnauthorized` flag

---

## 12. Environment variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | API base URL (e.g. `http://localhost:7000/api`) |

**Android emulator:** `http://10.0.2.2:7000/api`

Copy `mobile/.env.example` to `mobile/.env`.

---

## 13. Screens

| Screen | Path |
|--------|------|
| Login | `/(auth)/login` |
| Signup | `/(auth)/signup` |
| Worker placeholder | `/(worker)` |
| Employer placeholder | `/(employer)` |

Both auth screens include **role selection** (required by backend for login and signup).

---

## 14. Testing

### TESTED (automated)

- TypeScript (`npx tsc --noEmit`)
- Expo Android bundle export

### NOT TESTED (requires running backend + device/emulator)

- Live signup against backend
- Live login against backend
- Session persistence across app restart
- Logout flow on device
- 401 handling with expired token
- Role routing on physical emulator

To test manually:

1. Start backend (`cd backend && npm run dev`)
2. Set `EXPO_PUBLIC_API_URL` in `mobile/.env`
3. Run `cd mobile && npm start`
4. Open on Android emulator or device

---

## 15. Known limitations

- No refresh tokens — user must re-login after JWT expiry (`JWT_EXPIRES_IN`, default 7d)
- No Google Sign-In (deferred)
- Server logout does not invalidate JWT
- Login requires selecting correct role before signing in
- No password reset flow in backend

---

## File reference

| File | Purpose |
|------|---------|
| `lib/api/auth.ts` | Auth API calls |
| `lib/api/client.ts` | Axios + interceptors |
| `lib/api/errors.ts` | Error message parsing |
| `lib/api/setupAuth.ts` | 401 handler wiring |
| `store/authStore.ts` | Auth state |
| `components/auth/*` | Auth UI + guards |
| `app/(auth)/*` | Login/signup routes |
| `app/(worker)/*` | Worker protected routes |
| `app/(employer)/*` | Employer protected routes |
