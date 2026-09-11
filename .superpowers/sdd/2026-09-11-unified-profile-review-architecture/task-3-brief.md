# Task 3: Create Shared OwnProfileCard Component

## Goal

Create a single reusable component for displaying the current user's own profile, used by both employer and worker self-profile tabs. Uses the same visual language as `MarketplaceProfileScreen`.

## Files

- Create: `mobile/components/profiles/OwnProfileCard.tsx`

## Interfaces

- Consumes: `WorkerProfile`, `EmployerProfile`, `TrustSummary` from `types`
- Consumes: existing UI components from `components/ui/` (Card, Text, Button, Badge, StatRow, SkillTag, CompletionRing, Skeleton, ErrorState)
- Consumes: `ProfileAvatar` from `components/profiles/ProfileAvatar`
- Consumes: icons from `components/icons` (Star, Bell, Pencil, LogOut, FileText, ClipboardList, CheckCircle2)
- Consumes: `colors`, `spacing`, `radius` from `constants/theme`
- Consumes: `translate` from `lib/i18n`
- Consumes: `Screen` from `components/layout/Screen`
- Produces: `<OwnProfileCard>` component

## Props Interface

```tsx
interface OwnProfileCardProps {
  role: 'worker' | 'employer';
  profile: WorkerProfile | EmployerProfile | null;
  ratingSummary: TrustSummary;
  stats?: { applications: number; assignments: number; completed: number };
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onViewReviews: () => void;
  onNavigate?: (route: string) => void;
  completion?: ProfileCompletion;
}
```

## Layout (both roles share this structure)

```
┌──────────────────────────────┐
│  [Avatar]  Name               │
│            Location           │
│            [Worker] [Avail]   │
├──────────────────────────────┤
│  Completion Ring / Progress   │
│  XX% complete                 │
│  Missing: ...                 │
│  [Edit Profile]               │
├──────────────────────────────┤
│  REVIEWS                      │
│  ★ Reviews  →                 │
├──────────────────────────────┤
│  PROFILE INFORMATION          │
│  Email: ...                   │
│  Phone: ...                   │
│  (employer: address, city...) │
├──────────────────────────────┤
│  ABOUT (if bio/description)   │
├──────────────────────────────┤
│  SKILLS & EXPERIENCE          │
│  (worker only)                │
├──────────────────────────────┤
│  ACTIVITY                     │
│  (worker only: stats)         │
├──────────────────────────────┤
│  SETTINGS                     │
│  Edit Profile →               │
│  Notifications →              │
│  Logout →                     │
└──────────────────────────────┘
```

## Implementation Details

1. The component handles loading, error, and empty states internally using existing `Skeleton`, `ErrorState` components
2. Worker profile uses horizontal header layout (avatar left, info right) — matching the existing worker self-profile design
3. Employer profile uses the same horizontal layout (avatar left, company info right)
4. Uses existing `ProfileAvatar` component (handles both round and square avatars)
5. Completion section uses existing `CompletionRing` component
6. All text uses existing `Text` component with proper variants
7. All cards use existing `Card` component
8. Stats use existing `StatRow` component
9. Skills use existing `SkillTag` component
10. Rating uses existing `StatRow` with Star icon

## Existing Patterns to Follow

Look at these files for style reference:
- `mobile/app/(worker)/(tabs)/profile.tsx` — current worker self-profile (horizontal header, completion ring, skills, activity)
- `mobile/app/(employer)/(tabs)/profile.tsx` — current employer self-profile (centered header, reviews, info)
- `mobile/components/profiles/MarketplaceProfileScreen.tsx` — shared marketplace profile view
- `mobile/constants/theme.ts` — design tokens

## What NOT to Do

- Do NOT create separate `WorkerOwnProfileCard` / `EmployerOwnProfileCard` components
- Do NOT add new npm dependencies
- Do NOT create new API functions
- Do NOT modify any existing files — only create the new file
- Do NOT add comments unless absolutely necessary for clarity

## Global Constraints

- Expo SDK 53.0.27, React Native 0.79.6
- Do not break existing API contracts
- Use existing UI components from `components/ui/`
- Use existing design tokens from `constants/theme.ts`
- No new npm dependencies

## Work from: C:\dev\giglink
