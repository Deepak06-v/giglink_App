# Task 3 Report: Create Shared OwnProfileCard Component

**Status:** DONE

## Summary

Created `mobile/components/profiles/OwnProfileCard.tsx` — a single reusable component for displaying the current user's own profile, used by both employer and worker self-profile tabs. The component renders its own `Screen` with pull-to-refresh and handles all four states internally.

## Verification

- `npx tsc --noEmit` in `mobile/` passes cleanly (no errors, no unused imports).
- No new npm dependencies added.
- No existing files modified (only the new file was created).
- Commit: `3923df8` feat(profile): add shared OwnProfileCard component

## What Was Built

### Props interface (matches the brief exactly)
`role`, `profile`, `ratingSummary`, `stats?`, `loading`, `refreshing`, `error`, `onRefresh`, `onRetry`, `onEditProfile`, `onLogout`, `onViewReviews`, `onNavigate?`, `completion?`.

### States handled
1. **Loading** — `ProfileSkeleton` (horizontal avatar skeleton + completion ring card + body rows), ported from the existing worker profile.
2. **Error** — `ErrorState` with `onRetry`.
3. **Empty** (`profile === null`) — `EmptyState` (marketplace.notAvailable / notAvailableMessage) with an Edit Profile action button.
4. **Loaded** — full scrollable content with `RefreshControl` wired to `refreshing` / `onRefresh`.

### Layout (consistent structure for both roles)
- **Header** — horizontal: `ProfileAvatar` (size 72, round for worker, square for employer) left, name + location + badges right. Worker gets a brand `Badge` (profile.worker) plus availability badge (AVAILABLE success / UNAVAILABLE error / default "set availability"). Employer gets a brand `Badge` (profile.employer).
- **Completion** — `CompletionRing` (existing component) with percentage text, "next missing field" hint, dotted missing-fields list, and Edit Profile button. Uses `completion` prop falling back to `profile.completion`. Worker and employer have their own missing-field hint mappings (ported from both existing screens).
- **Reviews** — `StatRow` with Star icon (warning tint), rating subtitle, chevron, `onViewReviews`.
- **Profile Information** — worker: email + phone. employer: email + phone + address + city + state + pincode.
- **About** — worker: bio; employer: companyDescription.
- **Skills & Experience** — worker only: `SkillTag` chips (accent) + experience row.
- **Activity** — worker only, when `stats` provided: applications / assignments / completed `StatRow`s (FileText, ClipboardList, CheckCircle2).
- **Settings** — Edit Profile (Pencil), Notifications (Bell), Logout (LogOut, error tint).

### Conventions followed
- All UI from `components/ui` (Card, Text, Button, Badge, StatRow, SkillTag, CompletionRing, Skeleton, ErrorState, EmptyState).
- Theming via `constants/theme` tokens (`colors`, `spacing`, `radius`).
- `ProfileAvatar`, `translate`/`TranslationKey`, `Screen`, `useAuthStore` for user name/email (same source as the existing screens), `utils/routing` for role-appropriate navigation targets.
- Typography variants and section-header style (uppercase caption) mirror the existing profile screens.
- No comments added (matches "no comments unless necessary").

## Design Decisions / Notes for Later Tasks

1. **Navigation contract**: The brief's `onNavigate?: (route: string) => void` is used for Notifications (role-specific: workerNotificationsRoute / employerNotificationsRoute) and worker Activity tab rows (workerApplicationsTabRoute / workerAssignmentsTabRoute). A small wrapper `navigate(route: Href)` passes the path string through. The parent screens (future tasks) should wire `onNavigate` into the router (e.g. `(route) => router.navigate(route as Href)`).
2. **Employer also uses horizontal header and the CompletionRing** per the brief, replacing the old centered layout — this intentionally unifies the visual language.
3. Employer location in the header falls back to empty (text is omitted) rather than a hint string; worker keeps the existing "Add your location" fallback hint to preserve current behavior.
4. Empty state assumes a null `profile` with no error — parent screens should only pass null when no profile data exists, and pass an error string otherwise.
5. `completion` prop takes precedence over `profile.completion`; the prop lets callers pass the latest completion before the profile object itself updates.

## Concerns

- `navigate` casts `Href` → `string` (`route as string`). This is safe for the string-literal paths used here (notifications / tabs), which are all plain path strings. If a future caller passes an object-shaped `Href` (pathname + params), the cast would be lossy — the parent wiring should only use plain path strings for this prop.
- The component uses `useAuthStore` internally for the user's name/email since the props interface does not include a `user` field and profile objects do not carry those fields (matching the existing screens' behavior).

## Test Summary

`npx tsc --noEmit` passes with zero errors. No automated test suite exists in this repo for components (only `typecheck` script); runtime/expo validation was not run in this environment.