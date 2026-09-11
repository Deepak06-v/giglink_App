# GigLink Part 2 — Account Deletion & Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver production-ready account deletion (backend `DELETE /api/auth/account` + anonymized soft-delete preserving marketplace history, and a mobile settings flow with confirmation) plus backend-hosted legal pages (Privacy, Terms, Contact, Delete-Account).

**Architecture:** The User document is NOT hard-deleted — it is anonymized (name `Deleted User`, email/password/authProviders cleared, `deletedAt` set) so that Job, Application, Assignment, and Review references keep resolving and history stays intact. Logged-in identity comes strictly from the JWT (`req.user.userId`), never from the client. Deletion removes personal records (WorkerProfile, EmployerProfile, DeviceToken, Notification, PhoneOtp) and blocks re-login. Legal pages are served as plain HTML from Express at the root (non-`/api`) paths, using `SUPPORT_EMAIL` from env (never an invented address).

**Tech Stack:** Express.js, MongoDB/Mongoose, node:test, Expo SDK 53 / RN 0.79, TypeScript

**Spec:** `C:\dev\giglink\docs\superpowers\plans\2026-09-11-giglink-part2-account-deletion-legal.md`

---

## Audit Findings (from prior session)

- No settings screen exists in the mobile app. The shared `OwnProfileCard` Settings card (Edit Profile / Notifications / Logout at `OwnProfileCard.tsx:428-452`) is the existing "settings design" — extend it with legal links + Delete Account.
- `authenticate` middleware (`auth.middleware.js:3`) is stateless: JWT → `req.user = { userId, role }`. No DB lookup, so a deleted user's still-valid token WOULD pass `authenticate` until expiry — deletion flow clears the token client-side; the `deletedAt` guard in `getCurrentUser` adds server-side protection for `/auth/me`.
- `User` model (`User.js`): `email` is `unique: true, sparse: true`, `password` is `select: false`. `authProviders` has partial unique indexes on `providerId` for phone and google. Clearing `email` + `authProviders` frees indexes so the same email/Google/phone CAN be re-registered later (matches requirement) while the old account can never log in.
- `getUserReviews` (`review.service.js:180`) enriched `review.reviewer._id` unconditionally — reviewers whose User doc is anonymized (or removed) would crash it. Part 1 Task 3 adds the null-reviewer guard; Part 2 DEPENDS on that guard being present (run Part 1 first).
- `getJobByIdPublic` (`job.service.js:460`) populates employer from `EmployerProfile.findOne({user})` then `User.findById(job.employer)` — an anonymized User still resolves (name body kept as "Deleted User"), no crash.
- `mobile/lib/config/env.ts`: `env.apiUrl` = `https://giglink-app.onrender.com/api` in `.env`. Legal URLs derive by stripping the trailing `/api`.
- `ConfirmDialog` (`ui/ConfirmDialog.tsx`) already supports `destructive`, `loading`, custom labels — reuse it, no new component.
- Backend test runner (`backend/package.json` `"test"` / `"test:coverage"`) uses an EXPLICIT file list — any new test file MUST be appended to both.

---

## File Map

### Backend (Modify)
- `backend/src/models/User.js` — add `deletedAt` timestamp field
- `backend/src/services/auth.service.js` — `getCurrentUser` rejects `deletedAt` accounts
- `backend/src/controllers/auth.controller.js` — add `deleteAccountController`
- `backend/src/routes/auth.routes.js` — add `DELETE /account`
- `backend/src/app.js` — mount legal routes before `notFound`
- `backend/.env.example` — document `SUPPORT_EMAIL`
- `backend/package.json` — add `account.service.test.js` to test lists

### Backend (Create)
- `backend/src/services/account.service.js` — `deleteAccount(userId)` deletion/anonymization service
- `backend/src/services/account.service.test.js` — deletion service tests
- `backend/src/routes/legal.routes.js` — `/privacy`, `/terms`, `/contact`, `/delete-account`

### Frontend (Modify)
- `mobile/lib/api/auth.ts` — add `deleteAccount()`
- `mobile/lib/config/env.ts` — add `legalBaseUrl` derivation
- `mobile/components/profiles/OwnProfileCard.tsx` — legal rows + Delete Account (ConfirmDialog) in Settings card
- `mobile/app/(worker)/(tabs)/profile.tsx` — wire `onDeleteAccount` + legal links
- `mobile/app/(employer)/(tabs)/profile.tsx` — wire `onDeleteAccount` + legal links
- `mobile/locales/en.ts` + `mobile/locales/kn.ts` — new `legal` + `account` keys (Translations keys are type-driven from `en`, and `kn` must mirror the shape)

---

## Global Constraints
- Expo SDK 53.0.27, RN 0.79.6, Node >= 22 — do not upgrade anything
- Backend test runner uses an EXPLICIT file list — new test files MUST be appended to `test` and `test:coverage` in `backend/package.json`
- Mobile has NO eslint; typecheck is `cd mobile && npx tsc --noEmit`
- NEVER trust a client-supplied user id for account deletion — identity comes only from `req.user.userId`
- NEVER invent a support email or legal domain — `SUPPORT_EMAIL` must be read from env; pages degrade gracefully if unset
- Do NOT hard-delete User docs (breaks reviews/jobs/assignments history); anonymize instead
- One account deleted per call; same email/Google/phone may be re-registered later
- Use existing `mobile/components/ui` primitives (`ConfirmDialog`, `StatRow`, `Card`, `Text`) and theme tokens
- Do not add code comments

---

### Task 1: Add deletedAt to User schema + reject deleted accounts in getCurrentUser

**Files:**
- Modify: `backend/src/models/User.js`
- Modify: `backend/src/services/auth.service.js:95-110`

**Goal:** Give deleted accounts a durable marker and make `/auth/me` reject them server-side.

- [ ] **Step 1: Add the field**

In `backend/src/models/User.js`, inside `userSchema` after `isVerified` (line 29), add:

```js
    deletedAt: {
      type: Date,
      default: null,
    },
```

- [ ] **Step 2: Add the guard**

In `backend/src/services/auth.service.js`, inside `getCurrentUser` after the `if (!user)` block (line 101), add:

```js
  if (user.deletedAt) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
```

- [ ] **Step 3: Run auth service tests**

Run: `cd backend && node --test src/services/auth.service.test.js`
Expected: All existing tests pass (no test constructs a `deletedAt` user, so none break).

- [ ] **Step 4: Commit**

```bash
git add backend/src/models/User.js backend/src/services/auth.service.js
git commit -m "feat: track deletedAt on User; reject deleted accounts in getCurrentUser"
```

---

### Task 2: Create the account deletion service

**Files:**
- Create: `backend/src/services/account.service.js`

**Goal:** Central deletion/anonymization service invoked by the authenticated route. Deletes profile/push/notification/OTP records and anonymizes the User doc while preserving Job/Application/Assignment/Review history.

**Interfaces:**
- Consumes: `User`, `WorkerProfile`, `EmployerProfile`, `DeviceToken`, `Notification`, `PhoneOtp` models
- Produces: `deleteAccount(userId)` → `{ success: true, message: "Account deleted successfully" }`; throws `{ message: "User not found", statusCode: 404 }` for missing/already-deleted users

- [ ] **Step 1: Create the service**

Create `backend/src/services/account.service.js`:

```js
import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import DeviceToken from "../models/DeviceToken.js";
import Notification from "../models/Notification.js";
import PhoneOtp from "../models/PhoneOtp.js";

const DELETED_USER_NAME = "Deleted User";

const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const phoneProvider = (user.authProviders || []).find(
    (provider) => provider.provider === "phone"
  );

  await WorkerProfile.deleteMany({ user: userId });
  await EmployerProfile.deleteMany({ user: userId });
  await DeviceToken.deleteMany({ userId });
  await Notification.deleteMany({ recipient: userId });
  if (phoneProvider?.phone) {
    await PhoneOtp.deleteMany({ phone: phoneProvider.phone });
  }

  user.name = DELETED_USER_NAME;
  user.email = undefined;
  user.password = undefined;
  user.authProviders = [];
  user.isVerified = false;
  user.deletedAt = new Date();
  await user.save();

  return { success: true, message: "Account deleted successfully" };
};

export { deleteAccount };
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `cd backend && node -e "import('./src/services/account.service.js').then(() => console.log('ok'))"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/account.service.js
git commit -m "feat: account deletion service with anonymized soft-delete"
```

---

### Task 3: Add the authenticated DELETE /auth/account route

**Files:**
- Modify: `backend/src/controllers/auth.controller.js`
- Modify: `backend/src/routes/auth.routes.js`

**Goal:** Expose `DELETE /api/auth/account` behind `authenticate`; endpoint identifies the user ONLY from the token.

**Interfaces:**
- Consumes: `deleteAccount` from `account.service.js`, `authenticate` from `auth.middleware.js`
- Produces: `deleteAccountController` → 200 `{ success: true, message }`

- [ ] **Step 1: Add the controller**

In `backend/src/controllers/auth.controller.js`, add the import (line 1):

```js
import { deleteAccount } from "../services/account.service.js";
```

Append the controller after `logoutController` (line 58):

```js
export const deleteAccountController = async (req, res) => {
  try {
    const result = await deleteAccount(req.user.userId);
    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
```

- [ ] **Step 2: Add the route**

In `backend/src/routes/auth.routes.js`, on the line that imports the controllers, add `deleteAccountController`, then append:

```js
router.delete("/account", authenticate, deleteAccountController);
```

- [ ] **Step 3: Verify the server boots**

Run: `cd backend && node -e "import('./src/app.js').then(() => console.log('app ok'))"`
Expected: prints `app ok`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/auth.controller.js backend/src/routes/auth.routes.js
git commit -m "feat: DELETE /auth/account authenticated endpoint"
```

---

### Task 4: Backend tests for deletion service

**Files:**
- Create: `backend/src/services/account.service.test.js`
- Modify: `backend/package.json` (add the test file to `test` AND `test:coverage`)

**Goal:** Lock deletion semantics: profile/push/notification/OTP records removed, user anonymized with `deletedAt`, history-bearing docs UNTOUCHED, and 404 for missing/deleted users.

**Interfaces:**
- Consumes: `deleteAccount(userId)` from `account.service.js`
- Produces: verified deletion behavior

- [ ] **Step 1: Create the test file**

Create `backend/src/services/account.service.test.js`:

```js
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import DeviceToken from "../models/DeviceToken.js";
import Notification from "../models/Notification.js";
import PhoneOtp from "../models/PhoneOtp.js";
import { deleteAccount } from "./account.service.js";

describe("deleteAccount", () => {
  let savedUser;

  beforeEach(() => {
    mock.restoreAll();
    savedUser = {
      _id: { toString: () => "user-1" },
      name: "Ravi",
      email: "ravi@example.com",
      password: "hashed",
      isVerified: true,
      deletedAt: null,
      authProviders: [
        { provider: "email", providerId: "ravi@example.com" },
        { provider: "phone", providerId: "91-1234567890", phone: "911234567890" },
      ],
      save: async () => {},
    };

    mock.method(User, "findById", async () => savedUser);
    mock.method(WorkerProfile, "deleteMany", async () => ({ deletedCount: 1 }));
    mock.method(EmployerProfile, "deleteMany", async () => ({ deletedCount: 1 }));
    mock.method(DeviceToken, "deleteMany", async () => ({ deletedCount: 1 }));
    mock.method(Notification, "deleteMany", async () => ({ deletedCount: 2 }));
    mock.method(PhoneOtp, "deleteMany", async () => ({ deletedCount: 1 }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("deletes profile, device, notification, and OTP records", async () => {
    await deleteAccount("user-1");

    assert.equal(WorkerProfile.deleteMany.mock.calls[0].arguments[0].user, "user-1");
    assert.equal(EmployerProfile.deleteMany.mock.calls[0].arguments[0].user, "user-1");
    assert.equal(DeviceToken.deleteMany.mock.calls[0].arguments[0].userId, "user-1");
    assert.equal(Notification.deleteMany.mock.calls[0].arguments[0].recipient, "user-1");
    assert.deepEqual(PhoneOtp.deleteMany.mock.calls[0].arguments[0], {
      phone: "911234567890",
    });
  });

  it("anonymizes the user document and sets deletedAt", async () => {
    await deleteAccount("user-1");

    assert.equal(savedUser.name, "Deleted User");
    assert.equal(savedUser.email, undefined);
    assert.equal(savedUser.password, undefined);
    assert.deepEqual(savedUser.authProviders, []);
    assert.equal(savedUser.isVerified, false);
    assert.ok(savedUser.deletedAt instanceof Date);
  });

  it("does not touch Jobs, Applications, Assignments, or Reviews", async () => {
    await deleteAccount("user-1");

    assert.equal(WorkerProfile.deleteMany.mock.calls.length, 1);
    assert.equal(EmployerProfile.deleteMany.mock.calls.length, 1);
    assert.equal(DeviceToken.deleteMany.mock.calls.length, 1);
    assert.equal(Notification.deleteMany.mock.calls.length, 1);
    assert.equal(PhoneOtp.deleteMany.mock.calls.length, 1);
  });

  it("throws 404 for a missing user", async () => {
    mock.method(User, "findById", async () => null);

    await assert.rejects(
      () => deleteAccount("missing"),
      (err) => err.statusCode === 404 && err.message === "User not found"
    );
  });

  it("throws 404 for an already-deleted user", async () => {
    savedUser.deletedAt = new Date();

    await assert.rejects(
      () => deleteAccount("user-1"),
      (err) => err.statusCode === 404 && err.message === "User not found"
    );
  });
});
```

- [ ] **Step 2: Add the file to both test scripts**

In `backend/package.json`, both `test` and `test:coverage` scripts currently end with `... src/utils/phone.test.js`. Append ` src/services/account.service.test.js` to BOTH lists.

- [ ] **Step 3: Run the new tests**

Run: `cd backend && node --test src/services/account.service.test.js`
Expected: 5 tests pass.

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/account.service.test.js backend/package.json
git commit -m "test: lock account deletion service semantics"
```

---

### Task 5: Legal pages served from the backend

**Files:**
- Create: `backend/src/routes/legal.routes.js`
- Modify: `backend/src/app.js`
- Modify: `backend/.env.example`

**Goal:** Serve `/privacy`, `/terms`, `/contact`, `/delete-account` as plain HTML at the root (NOT under `/api`). Content must be accurate to the real data model; the support email must come from `SUPPORT_EMAIL` env and never be invented.

**Interfaces:**
- Produces: `legalRoutes` router with GET handlers for the four paths; mounted via `app.use(legalRoutes)` before `notFound`

- [ ] **Step 1: Create the legal routes file**

Create `backend/src/routes/legal.routes.js`:

```js
import express from "express";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim();

const page = (title, body) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — GigLink</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #1a1a1a; }
      h1 { font-size: 1.5rem; }
      h2 { font-size: 1.15rem; margin-top: 1.5rem; }
      a { color: #2563eb; }
      footer { margin-top: 2rem; font-size: 0.85rem; color: #666; }
    </style>
  </head>
  <body>
    ${body}
    <footer>GigLink</footer>
  </body>
</html>`;

const router = express.Router();

router.get("/privacy", (req, res) => {
  res.send(
    page(
      "Privacy Policy",
      `<h1>Privacy Policy</h1>
       <p>GigLink helps workers and employers connect for gig work.</p>
       <h2>Information we collect</h2>
       <p>When you use GigLink we may collect: your name, email address, phone number, your role (worker or employer), and the profile information you add (for example bio, skills, company name, location, and profile photo or logo). We also store the jobs you post or apply to, assignments, ratings and reviews, and device push-notification tokens so we can alert you about activity on your account.</p>
       <h2>How we use it</h2>
       <p>We use this information to operate the marketplace: matching workers with jobs, processing applications and assignments, showing profiles and reviews, and sending you notifications about activity relevant to you.</p>
       <h2>Account deletion</h2>
       <p>You can delete your account from the Profile tab in the GigLink app. Personal profile data is removed and your account can no longer be used to sign in. Job history, applications, assignments, and reviews you were part of are kept in anonymized form so other users' records remain intact.</p>`
    )
  );
});

router.get("/terms", (req, res) => {
  res.send(
    page(
      "Terms of Service",
      `<h1>Terms of Service</h1>
       <p>By using GigLink you agree to use the marketplace for its intended purpose: posting and applying to gig work, managing assignments, and rating completed work.</p>
       <h2>Your responsibilities</h2>
       <p>You are responsible for the accuracy of the information you provide, and for completing the work or payments you agree to. Misuse, fraud, or interfering with other users' accounts may result in your account being removed.</p>
       <h2>Accounts</h2>
       <p>You must keep your login details secure. You can delete your account at any time from the Profile tab.</p>`
    )
  );
});

router.get("/contact", (req, res) => {
  const contact = SUPPORT_EMAIL
    ? `<p>For support or questions, email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`
    : `<p>For support, please use the contact options available inside the GigLink app.</p>`;
  res.send(
    page(
      "Contact & Support",
      `<h1>Contact & Support</h1>
       ${contact}
       <p>Before contacting us, try the in-app FAQ and profile settings.</p>`
    )
  );
});

router.get("/delete-account", (req, res) => {
  res.send(
    page(
      "Deleting your GigLink account",
      `<h1>Deleting your account</h1>
       <p>You can delete your GigLink account from the app: open your Profile tab, scroll to the Account section, and tap &ldquo;Delete Account&rdquo;. You will be asked to confirm.</p>
       <h2>What happens</h2>
       <p>Your personal profile data is removed and you can no longer sign in with that account. Jobs, applications, assignments, and reviews you were part of remain in anonymized form so other users' records are not broken.</p>
       <h2>Can I come back?</h2>
       <p>Deletion is permanent. You may create a new account later, but the deleted account itself cannot be restored.</p>`
    )
  );
});

export default router;
```

- [ ] **Step 2: Mount the router**

In `backend/src/app.js`, import the router right after the other route imports (line 22):

```js
import legalRoutes from "./routes/legal.routes.js";
```

Mount it just before the Error Handling block (before `app.use(notFound)` at line 268):

```js
app.use(legalRoutes);
```

- [ ] **Step 3: Document SUPPORT_EMAIL**

In `backend/.env.example`, append:

```
# Support email shown on the Contact page (/contact). Optional — if unset the
# page directs users to in-app contact instead. Never hardcode an invented email.
SUPPORT_EMAIL=
```

- [ ] **Step 4: Verify the app boots with legal routes**

Run: `cd backend && node -e "import('./src/app.js').then(async (m) => { const req = { originalUrl: '/privacy', get: () => 'localhost' }; const res = { status: (c) => ({ json: (b) => JSON.stringify(b) }) }; const app = m.default; console.log(app ? 'app ok' : 'no app'); })"`
Expected: prints `app ok`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/legal.routes.js backend/src/app.js backend/.env.example
git commit -m "feat: backend-hosted privacy, terms, contact, and delete-account pages"
```

---

### Task 6: Mobile deleteAccount API + legal base URL

**Files:**
- Modify: `mobile/lib/api/auth.ts`
- Modify: `mobile/lib/config/env.ts`

**Goal:** Client-side API call to delete the account (token attached automatically by the apiClient interceptor) and a derived legal URL base.

**Interfaces:**
- Produces: `deleteAccount(): Promise<void>` in `mobile/lib/api/auth.ts`; `env.legalBaseUrl: string` in `mobile/lib/config/env.ts`

- [ ] **Step 1: Add the API function**

In `mobile/lib/api/auth.ts`, append after `logout` (line 47):

```ts
export async function deleteAccount(): Promise<void> {
  await apiClient.delete('/auth/account');
}
```

- [ ] **Step 2: Derive the legal base URL**

In `mobile/lib/config/env.ts`, after the `apiUrl` const (line 10), add:

```ts
const legalBaseUrl = apiUrl ? apiUrl.replace(/\/api\/?$/, '') : DEFAULT_API_URL.replace(/\/api\/?$/, '');
```

Add it to the `env` object (line 27) as `legalBaseUrl`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/api/auth.ts mobile/lib/config/env.ts
git commit -m "feat: mobile deleteAccount API and legal base URL"
```

---

### Task 7: Mobile settings — legal links + Delete Account flow

**Files:**
- Modify: `mobile/components/profiles/OwnProfileCard.tsx`
- Modify: `mobile/app/(worker)/(tabs)/profile.tsx`
- Modify: `mobile/app/(employer)/(tabs)/profile.tsx`
- Modify: `mobile/locales/en.ts`
- Modify: `mobile/locales/kn.ts`

**Goal:** In the existing Settings card, add Privacy Policy / Terms of Service / Contact Support rows (open the backend-hosted pages) and a destructive Delete Account row with a confirmation dialog, deleting states, and error surfacing. Wired in both profile tabs via `onDeleteAccount`.

**Interfaces:**
- Consumes: `ConfirmDialog` + `StatRow` + `Card` from `@/components/ui`, `Linking` from `react-native`, `env.legalBaseUrl`, `deleteAccount` + `logout` from parent, new i18n keys
- Produces: extended `OwnProfileCardProps` with optional `legalLinks?: { privacy?: string; terms?: string; contact?: string }` and `onDeleteAccount?: () => Promise<void>`

- [ ] **Step 1: Add i18n keys (en)**

In `mobile/locales/en.ts`, inside the top-level dictionary (after the existing `review` block), append:

```ts
  legal: {
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    contactSupport: 'Contact & Support',
  },
  account: {
    profileTitle: 'Account',
    deleteAccount: 'Delete Account',
    deleteDialogTitle: 'Delete your account?',
    deleteDialogMessage:
      'This permanently deletes your account and personal data. Jobs, applications, assignments, and reviews you were part of remain anonymized for other users. This action cannot be undone.',
    deleteConfirm: 'Delete Account',
    deleteFailed: 'Unable to delete account',
    deleting: 'Deleting...',
  },
```

- [ ] **Step 2: Mirror keys in kn**

Add the same `legal` + `account` key paths to `mobile/locales/kn.ts` with Kannada translations (structural keys MUST match `en` — `TranslationKey` is `Path<typeof en>`, and `kn` is typed as the same dictionary shape). If unsure of a good Kannada phrase, use a faithful short translation.

- [ ] **Step 3: Extend OwnProfileCardProps**

In `mobile/components/profiles/OwnProfileCard.tsx`, add to `OwnProfileCardProps` (line 43):

```ts
  legalLinks?: {
    privacy?: string;
    terms?: string;
    contact?: string;
  };
  onDeleteAccount?: () => Promise<void>;
```

- [ ] **Step 4: Add imports and state**

Add imports:
```ts
import { useState } from 'react';
import { Linking, RefreshControl, StyleSheet, View } from 'react-native';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FileText, LogOut, Mail, Pencil, Star, Trash2 } from '@/components/icons';
```

In the component body, before `const user = useAuthStore(...)` (line 159), add:

```ts
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!onDeleteAccount) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
      setDeleteVisible(false);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, translate('account.deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };
```

Import `getApiErrorMessage` from `@/lib/api/errors` and add it to the destructured props.

- [ ] **Step 5: Render the new Settings rows**

Inside the Settings card (currently lines 428-452), insert AFTER the Edit Profile row (line 435) the legal rows, and AFTER the Logout row (line 451) the Delete Account row. Final card structure:

```tsx
      <SectionHeader label={translate('profile.sections.settings')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={Pencil}
          title={translate('profile.editProfile')}
          showChevron
          onPress={onEditProfile}
        />
        <View style={styles.divider} />
        <StatRow
          icon={Bell}
          title={translate('common.notifications')}
          showChevron
          onPress={() => navigate(notificationsRoute)}
        />
        {legalLinks?.privacy ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={FileText}
              title={translate('legal.privacyPolicy')}
              showChevron
              onPress={() => void Linking.openURL(legalLinks.privacy!)}
            />
          </>
        ) : null}
        {legalLinks?.terms ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={FileText}
              title={translate('legal.termsOfService')}
              showChevron
              onPress={() => void Linking.openURL(legalLinks.terms!)}
            />
          </>
        ) : null}
        {legalLinks?.contact ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={Mail}
              title={translate('legal.contactSupport')}
              showChevron
              onPress={() => void Linking.openURL(legalLinks.contact!)}
            />
          </>
        ) : null}
        {onDeleteAccount ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={Trash2}
              iconColor={colors.semantic.error}
              iconBackground={colors.semanticTint.error}
              title={translate('account.deleteAccount')}
              showChevron
              onPress={() => {
                setDeleteError(null);
                setDeleteVisible(true);
              }}
            />
          </>
        ) : null}
        <View style={styles.divider} />
        <StatRow
          icon={LogOut}
          iconColor={colors.semantic.error}
          iconBackground={colors.semanticTint.error}
          title={translate('profile.logout')}
          showChevron
          onPress={onLogout}
        />
      </Card>

      {onDeleteAccount ? (
        <ConfirmDialog
          visible={deleteVisible}
          title={translate('account.deleteDialogTitle')}
          message={deleteError ?? translate('account.deleteDialogMessage')}
          confirmLabel={translate('account.deleteConfirm')}
          destructive
          loading={deleting}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleteVisible(false)}
        />
      ) : null}
```

- [ ] **Step 6: Wire the worker profile tab**

In `mobile/app/(worker)/(tabs)/profile.tsx`:
- Add imports: `import * as authApi from '@/lib/api/auth';` and `import { env } from '@/lib/config/env';`
- Add a handler inside the component:

```tsx
  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    await logout();
  }, [logout]);
```

- Pass to `OwnProfileCard`:

```tsx
      onDeleteAccount={() => void deleteAccount()}
      legalLinks={{
        privacy: `${env.legalBaseUrl}/privacy`,
        terms: `${env.legalBaseUrl}/terms`,
        contact: `${env.legalBaseUrl}/contact`,
      }}
```

- [ ] **Step 7: Wire the employer profile tab**

In `mobile/app/(employer)/(tabs)/profile.tsx`, apply the SAME three changes as Task 6 Step 6 (currently it does not exist with the same exact code — read the file first to place the handler and props correctly; it mirrors the worker tab's structure).

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add mobile/components/profiles/OwnProfileCard.tsx mobile/app/\(worker\)/\(tabs\)/profile.tsx mobile/app/\(employer\)/\(tabs\)/profile.tsx mobile/locales/en.ts mobile/locales/kn.ts
git commit -m "feat: legal links and delete-account flow in profile settings"
```

---

### Task 8: Full verification

**Files:**
- All modified files

- [ ] **Step 1: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass (job.service.test.js, review.service.test.js, account.service.test.js and the rest).

- [ ] **Step 2: Run mobile type check**

Run: `cd mobile && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Manual/API sanity checks (documented, not committed)**

Describe in the final report (do NOT run against production):
- `POST /api/auth/login` with a deleted account's email → 401 "Invalid credentials" (email was cleared).
- `GET /api/auth/me` with the deleted account's old token → 404 "User not found".
- `DELETE /api/auth/account` with no token → 401; with a worker's token → 200 and the worker record is anonymized.
- Re-register with the SAME email → 201 (new account) works.

- [ ] **Step 4: Review diff**

Run: `git diff --stat && git status`
Expected: Only the intended files changed.

- [ ] **Step 5: Final commit if review fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback from part 2 verification"
```

---

## Summary of Changes

### Backend
| File | Change |
|------|--------|
| `models/User.js` | Added `deletedAt` timestamp field |
| `services/auth.service.js` | `getCurrentUser` rejects accounts with `deletedAt` |
| `services/account.service.js` | **New** — `deleteAccount(userId)`: removes profile/device/notification/OTP records, anonymizes User doc |
| `controllers/auth.controller.js` | Added `deleteAccountController` using `req.user.userId` |
| `routes/auth.routes.js` | Added `DELETE /account` (authenticated) |
| `routes/legal.routes.js` | **New** — `/privacy`, `/terms`, `/contact`, `/delete-account` HTML pages |
| `app.js` | Mounted `legalRoutes` before `notFound` |
| `.env.example` | Documented `SUPPORT_EMAIL` |
| `services/account.service.test.js` | **New** — 5 tests (delete, anonymize, untouch history, 404 missing, 404 already-deleted) |
| `package.json` | Added `account.service.test.js` to `test` + `test:coverage` |

### Frontend
| File | Change |
|------|--------|
| `lib/api/auth.ts` | Added `deleteAccount()` (DELETE `/auth/account`) |
| `lib/config/env.ts` | Added `env.legalBaseUrl` (apiUrl minus `/api`) |
| `components/profiles/OwnProfileCard.tsx` | Legal rows + Delete Account row with `ConfirmDialog`, deleting/error states |
| `(worker)/(tabs)/profile.tsx` | Wired `onDeleteAccount` + legal links |
| `(employer)/(tabs)/profile.tsx` | Wired `onDeleteAccount` + legal links |
| `locales/en.ts` + `locales/kn.ts` | New `legal` + `account` keys |

### What Was NOT Changed
- Authentication internals / JWT signing (`utils/jwt.js`)
- OTP send/verify flow
- Notification sending / Pushy push service
- Job/Application/Assignment/Review reference integrity (User docs are anonymized, not removed)
- Review eligibility logic
- Marketplace profile routes
- CORS / rate-limit config beyond `.env.example` documentation

### Deployment / Config Flags
- `SUPPORT_EMAIL` must be set in the Render backend env to show a real contact address on `/contact`. If unset, the page degrades to "use in-app contact". The mobile `EXPO_PUBLIC_API_URL` must point at the deployed backend for legal links to resolve (`env.legalBaseUrl` derives from it). Documented in the final report.