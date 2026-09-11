# Unified Profile & Review Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Employer and Worker experiences into one coherent marketplace with shared profile components and reciprocal completion-gated reviews.

**Architecture:** Backend review eligibility is fixed to respect individual completion actions (not just final job status). Frontend self-profile screens are unified into a shared `OwnProfileCard` component. All profile viewing uses the existing `MarketplaceProfileScreen`. No new API endpoints are created.

**Tech Stack:** Expo SDK 53, React Native 0.79, Express.js, MongoDB/Mongoose, TypeScript

**Spec:** `docs/superpowers/plans/2026-09-11-unified-profile-review-architecture.md`

---

## Audit Findings

### What's Already Good
- **Review model** is already reciprocal (`reviewer → reviewee`, tied to `job` + `assignment`)
- **Rating aggregation** (`getUserRatingSummary`) works for any user regardless of role
- **Backend validation** prevents self-review, duplicate review, unauthorized review
- **`MarketplaceProfileScreen`** is already a shared component used for viewing other users' profiles
- **`ReviewComposer`**, **`ReviewCard`**, **`ReviewListScreen`** are already role-agnostic
- **Completion model** already tracks `employerCompleted` on Job and `workerCompleted` on Assignment
- **Worker → Employer review** service + route already exists

### What's Inconsistent
1. **Review eligibility waits for full job COMPLETED** instead of individual completion actions — workers can't review until employer also completes, and vice versa
2. **Self-profile tabs** (employer vs worker) have completely different visual designs — employer is centered/vertical, worker is horizontal with completion ring/skills/activity
3. **Self-profile tabs** each define their own local `SectionHeader`, `InfoRow`, `ProfileSkeleton` helpers independently
4. **No shared `OwnProfileCard`** component — each self-profile screen reinvents the layout

---

## File Map

### Backend (Modify)
- `backend/src/services/review.service.js:240-327` — Fix eligibility checks

### Frontend (Create)
- `mobile/components/profiles/OwnProfileCard.tsx` — Shared self-profile display component

### Frontend (Modify)
- `mobile/app/(employer)/(tabs)/profile.tsx` — Refactor to use `OwnProfileCard`
- `mobile/app/(worker)/(tabs)/profile.tsx` — Refactor to use `OwnProfileCard`

### Frontend (Modify — minor)
- `mobile/app/(employer)/jobs/[jobId].tsx` — Add review prompt after employer completion
- `mobile/app/(worker)/assignments/[assignmentId].tsx` — Fix review eligibility check timing

---

## Global Constraints
- Expo SDK 53.0.27, React Native 0.79.6 — do not upgrade
- Backend: Node.js + Express, MongoDB Atlas
- Do not break existing API contracts
- Do not touch: auth, OTP, notifications, maps, Android build config
- Preserve all existing working functionality
- Use existing `colors`, `spacing`, `radius`, `typography` from `constants/theme.ts`
- Use existing UI components: `Card`, `Text`, `Button`, `Badge`, `StatRow`, `SkillTag`, `CompletionRing`, `ProfileAvatar`, `RatingStars`, `ReviewCard`
- No new npm dependencies

---

### Task 1: Fix Backend Review Eligibility — Worker

**Files:**
- Modify: `backend/src/services/review.service.js:289-327`

**Goal:** Allow worker to review employer after worker completes their assignment, even if the overall job is not yet COMPLETED.

**Interfaces:**
- Consumes: `Job`, `Assignment`, `Review` models
- Produces: `checkWorkerReviewEligibility(workerId, jobId)` returns `{ canReview, hasReviewed }`

- [ ] **Step 1: Read current implementation**

Read `backend/src/services/review.service.js` lines 289-327. The current logic:
```js
if (job.status !== "COMPLETED") {
  return { canReview: false, hasReviewed: false };
}
```
This blocks worker review until the entire job is COMPLETED.

- [ ] **Step 2: Replace the eligibility check**

Replace `checkWorkerReviewEligibility` with:

```js
const checkWorkerReviewEligibility = async (workerId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status === "CANCELLED") {
    return { canReview: false, hasReviewed: false };
  }

  const assignment = await Assignment.findOne({
    job: jobId,
    worker: workerId,
    status: { $ne: "CANCELLED" },
  }).lean();

  if (!assignment) {
    return { canReview: false, hasReviewed: false };
  }

  // Worker can review once THEY have completed their assignment
  if (!assignment.workerCompleted) {
    return { canReview: false, hasReviewed: false };
  }

  const existingReview = await Review.findOne({
    reviewer: workerId,
    reviewee: job.employer.toString(),
    job: jobId,
  }).lean();

  return {
    canReview: !existingReview,
    hasReviewed: !!existingReview,
  };
};
```

Key change: Check `assignment.workerCompleted` instead of `job.status === "COMPLETED"`.

- [ ] **Step 3: Verify existing tests still pass**

Run: `cd backend && npm test -- --grep "review"` (or equivalent)
Expected: All existing review tests pass. The change is backward-compatible because a COMPLETED job always has `workerCompleted: true` on its assignments.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/review.service.js
git commit -m "fix: allow worker review after worker completion, not just job completion"
```

---

### Task 2: Fix Backend Review Eligibility — Employer

**Files:**
- Modify: `backend/src/services/review.service.js:240-287`

**Goal:** Allow employer to review worker after employer marks job as completed, even if workers haven't all completed yet.

**Interfaces:**
- Consumes: `Job`, `Assignment`, `Review` models
- Produces: `checkEmployerReviewEligibility(employerId, jobId)` returns `{ canReview, workers }`

- [ ] **Step 1: Read current implementation**

Read `backend/src/services/review.service.js` lines 240-287. The current logic:
```js
if (job.status !== "COMPLETED") {
  return { canReview: false, workers: [] };
}
```
This blocks employer review until the entire job is COMPLETED.

- [ ] **Step 2: Replace the eligibility check**

Replace `checkEmployerReviewEligibility` with:

```js
const checkEmployerReviewEligibility = async (employerId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  if (job.status === "CANCELLED") {
    return { canReview: false, workers: [] };
  }

  // Employer can review once THEY have confirmed completion
  if (!job.completion?.employerCompleted) {
    return { canReview: false, workers: [] };
  }

  const assignments = await Assignment.find({
    job: jobId,
    status: { $ne: "CANCELLED" },
  }).lean();

  const workers = await Promise.all(
    assignments.map(async (assignment) => {
      const existingReview = await Review.findOne({
        reviewer: employerId,
        reviewee: assignment.worker.toString(),
        job: jobId,
      }).lean();

      return {
        workerId: assignment.worker.toString(),
        hasReviewed: !!existingReview,
      };
    })
  );

  const canReview = workers.some((w) => !w.hasReviewed);

  return { canReview, workers };
};
```

Key change: Check `job.completion?.employerCompleted` instead of `job.status === "COMPLETED"`.

- [ ] **Step 3: Verify existing tests still pass**

Run: `cd backend && npm test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/review.service.js
git commit -m "fix: allow employer review after employer completion, not just job completion"
```

---

### Task 3: Create Shared OwnProfileCard Component

**Files:**
- Create: `mobile/components/profiles/OwnProfileCard.tsx`

**Goal:** A single reusable component for displaying the current user's own profile, used by both employer and worker self-profile tabs. Uses the same visual language as `MarketplaceProfileScreen`.

**Interfaces:**
- Consumes: `WorkerProfile`, `EmployerProfile`, `TrustSummary` from `types`
- Produces: `<OwnProfileCard>` component

- [ ] **Step 1: Create the component file**

Create `mobile/components/profiles/OwnProfileCard.tsx`:

```tsx
import { Image, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import {
  Badge,
  Button,
  Card,
  CompletionRing,
  ErrorState,
  Skeleton,
  SkillTag,
  StatRow,
  Text,
} from '@/components/ui';
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  FileText,
  LogOut,
  Pencil,
  Star,
} from '@/components/icons';
import { colors, radius, spacing } from '@/constants/theme';
import { translate, type TranslationKey } from '@/lib/i18n';
import type { EmployerProfile, TrustSummary, WorkerProfile } from '@/types';

type OwnProfile = WorkerProfile | EmployerProfile;

interface OwnProfileCardProps {
  role: 'worker' | 'employer';
  profile: OwnProfile | null;
  ratingSummary: TrustSummary;
  stats?: {
    applications: number;
    assignments: number;
    completed: number;
  };
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onViewReviews: () => void;
  onNavigate?: (route: string) => void;
  // Worker-specific
  completion?: OwnProfile['completion'];
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text variant="caption" color="muted" style={styles.sectionHeader}>
      {label.toUpperCase()}
    </Text>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="bodyMd" color="primary">
        {value || '—'}
      </Text>
    </View>
  );
}

const COMPLETION_HINTS: Record<string, TranslationKey> = {
  NAME: 'profile.completion.addName',
  PROFILE_PHOTO: 'profile.completion.addPhoto',
  SKILLS: 'profile.completion.addSkills',
  EXPERIENCE: 'profile.completion.addExperience',
  BIO: 'profile.completion.addBio',
  PHONE: 'profile.completion.addPhone',
  LOCATION: 'profile.completion.addLocation',
  AVAILABILITY: 'profile.completion.setAvailability',
  COMPANY_NAME: 'profile.completion.addCompanyName',
  COMPANY_LOGO: 'profile.completion.addCompanyLogo',
  COMPANY_DESCRIPTION: 'profile.completion.addCompanyDescription',
  ADDRESS: 'profile.completion.addAddress',
};

const WORKER_PROFILE_FIELDS: string[] = [
  'PROFILE_PHOTO', 'SKILLS', 'EXPERIENCE', 'BIO', 'PHONE', 'LOCATION', 'AVAILABILITY', 'NAME',
];

function ProfileSkeleton({ role }: { role: 'worker' | 'employer' }) {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={72} height={72} radiusValue={role === 'worker' ? radius.full : radius.lg} />
        <View style={styles.skeletonHeaderText}>
          <Skeleton width="55%" height={20} />
          <Skeleton width="35%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Card style={styles.completionSkeleton}>
        <Skeleton width={88} height={88} radiusValue={radius.full} />
      </Card>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} height={16} width="94%" />
      ))}
    </View>
  );
}

export function OwnProfileCard({
  role,
  profile,
  ratingSummary,
  stats,
  loading,
  refreshing,
  error,
  onRefresh,
  onRetry,
  onEditProfile,
  onLogout,
  onViewReviews,
  onNavigate,
  completion,
}: OwnProfileCardProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Screen scroll>
        <ProfileSkeleton role={role} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={onRetry} />
      </Screen>
    );
  }

  const isWorker = role === 'worker';
  const workerProfile = isWorker ? (profile as WorkerProfile) : null;
  const employerProfile = !isWorker ? (profile as EmployerProfile) : null;

  // Header data
  const displayName = isWorker
    ? (workerProfile?.bio ? workerProfile.bio.slice(0, 30) : translate('common.worker'))
    : (employerProfile?.companyName || translate('profile.yourCompany'));
  const avatarSource = isWorker ? workerProfile?.profileImage : employerProfile?.logo;
  const avatarSquare = !isWorker;

  // Location
  const locationLabel = isWorker
    ? (workerProfile?.location?.city
        ? [workerProfile.location.city, workerProfile.location.state, workerProfile.location.pincode].filter(Boolean).join(', ')
        : translate('profile.completion.addLocation'))
    : (employerProfile?.city
        ? [employerProfile.city, employerProfile.state, employerProfile.pincode].filter(Boolean).join(', ')
        : translate('profile.completion.addLocation'));

  // Availability (worker only)
  const availabilityBadge = isWorker ? (() => {
    switch (workerProfile?.availability) {
      case 'AVAILABLE':
        return <Badge label={translate('profile.availabilityAvailable')} variant="success" />;
      case 'UNAVAILABLE':
        return <Badge label={translate('profile.availabilityUnavailable')} variant="error" />;
      default:
        return <Badge label={translate('profile.completion.setAvailability')} />;
    }
  })() : null;

  // Completion
  const completionPct = completion?.percentage ?? 0;
  const missingFields = completion?.missingFields ?? [];

  const nextHint = ((): TranslationKey => {
    if (!completion || missingFields.length === 0) return 'profile.completion.done';
    if (isWorker) {
      const firstMissing = WORKER_PROFILE_FIELDS.find((f) => missingFields.includes(f));
      return firstMissing ? (COMPLETION_HINTS[firstMissing] ?? 'profile.completion.addName') : 'profile.completion.addSkills';
    }
    const firstMissing = missingFields.find((f) => COMPLETION_HINTS[f]);
    return firstMissing ? (COMPLETION_HINTS[firstMissing] ?? 'profile.completion.addCompanyName') : 'profile.completion.addCompanyName';
  })();

  // Rating
  const reviewsCount = ratingSummary.totalReviews;
  const ratingSubtitle = reviewsCount > 0 && ratingSummary.averageRating !== null
    ? `${ratingSummary.averageRating.toFixed(1)} · ${reviewsCount} ${reviewsCount === 1 ? 'review' : 'reviews'}`
    : translate('marketplace.noReviews');

  return (
    <Screen
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
          />
        ),
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <ProfileAvatar source={avatarSource} name={displayName} size={72} square={avatarSquare} />
        <View style={styles.headerInfo}>
          <Text variant="headingLg" color="primary" numberOfLines={1}>
            {isWorker ? translate('common.worker') : (employerProfile?.companyName || translate('profile.yourCompany'))}
          </Text>
          <Text variant="bodyMd" color="secondary" numberOfLines={1}>
            {locationLabel}
          </Text>
          <View style={styles.headerMeta}>
            <Badge label={translate(isWorker ? 'profile.worker' : 'profile.employer')} variant="brand" />
            {availabilityBadge}
          </View>
        </View>
      </View>

      {/* Completion */}
      {completion ? (
        <Card style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <CompletionRing percentage={completionPct} label={translate('profile.completion.label')} />
            <View style={styles.completionText}>
              <Text variant="bodyLg" color="primary">
                {translate('profile.completion.percentComplete', { percentage: completionPct })}
              </Text>
              <Text variant="caption" color="secondary" style={styles.completionHint}>
                {translate(nextHint)}
              </Text>
            </View>
          </View>
          {missingFields.length > 0 ? (
            <View style={styles.missingList}>
              {missingFields.map((field) => (
                <View key={field} style={styles.missingRow}>
                  <View style={styles.missingDot} />
                  <Text variant="bodyMd" color="secondary" style={styles.missingText}>
                    {translate((COMPLETION_HINTS[field] ?? 'profile.completion.addName') as TranslationKey)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Button
            label={translate('profile.editProfile')}
            variant="secondary"
            size="sm"
            onPress={onEditProfile}
            style={styles.completionAction}
          />
        </Card>
      ) : null}

      {/* Reviews */}
      <SectionHeader label={translate('review.reviews')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={Star}
          iconColor={colors.semantic.warning}
          iconBackground={colors.semanticTint.warning}
          title={translate('review.reviews')}
          subtitle={ratingSubtitle}
          showChevron
          onPress={onViewReviews}
        />
      </Card>

      {/* Profile Info */}
      <SectionHeader label={translate('profile.profileInformation')} />
      <Card style={styles.groupCard}>
        {isWorker ? (
          <>
            <InfoRow label={translate('profile.email')} value={''} />
            <InfoRow label={translate('profile.phone')} value={workerProfile?.phone ?? ''} />
          </>
        ) : (
          <>
            <InfoRow label={translate('profile.email')} value={''} />
            <InfoRow label={translate('profile.phone')} value={employerProfile?.phone ?? ''} />
            <InfoRow label={translate('profile.address')} value={employerProfile?.address ?? ''} />
            <InfoRow label={translate('profile.city')} value={employerProfile?.city ?? ''} />
            <InfoRow label={translate('profile.state')} value={employerProfile?.state ?? ''} />
            <InfoRow label={translate('profile.pincode')} value={employerProfile?.pincode ?? ''} />
          </>
        )}
      </Card>

      {/* About */}
      {(isWorker ? workerProfile?.bio : employerProfile?.companyDescription) ? (
        <>
          <SectionHeader label={translate('profile.about')} />
          <Card style={styles.groupCard}>
            <Text variant="bodyMd" color="secondary">
              {isWorker ? workerProfile?.bio : employerProfile?.companyDescription}
            </Text>
          </Card>
        </>
      ) : null}

      {/* Worker: Skills & Experience */}
      {isWorker && workerProfile ? (
        <>
          <SectionHeader label={translate('profile.sections.skillsExperience')} />
          <Card style={styles.groupCard}>
            {workerProfile.skills?.length ? (
              <View style={styles.skillsRow}>
                {workerProfile.skills.map((skill) => (
                  <SkillTag key={skill} label={skill} variant="accent" />
                ))}
              </View>
            ) : (
              <Text variant="bodyMd" color="secondary">
                {translate('profile.completion.addSkills')}
              </Text>
            )}
            {workerProfile.experience ? (
              <>
                <View style={styles.divider} />
                <InfoRow label={translate('profile.experience')} value={workerProfile.experience} />
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Worker: Activity Stats */}
      {isWorker && stats ? (
        <>
          <SectionHeader label={translate('profile.sections.activity')} />
          <Card style={styles.groupCard}>
            <StatRow
              icon={FileText}
              title={translate('tabs.applications')}
              value={stats.applications}
              showChevron
              onPress={() => onNavigate?.('/(worker)/(tabs)/applications')}
            />
            <View style={styles.divider} />
            <StatRow
              icon={ClipboardList}
              title={translate('tabs.assignments')}
              value={stats.assignments}
              showChevron
              onPress={() => onNavigate?.('/(worker)/(tabs)/assignments')}
            />
            <View style={styles.divider} />
            <StatRow
              icon={CheckCircle2}
              iconColor={colors.semantic.success}
              iconBackground={colors.semanticTint.success}
              title={translate('profile.completed')}
              value={stats.completed}
            />
          </Card>
        </>
      ) : null}

      {/* Settings / Actions */}
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
          onPress={() => onNavigate?.(isWorker ? '/(worker)/notifications' : '/(employer)/notifications')}
        />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
    marginTop: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.md,
    letterSpacing: 0.6,
  },
  groupCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoRow: {
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
  },
  completionCard: {
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  completionText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  completionHint: {
    lineHeight: 18,
  },
  completionAction: {
    alignSelf: 'flex-start',
  },
  missingList: {
    gap: spacing.xs,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  missingText: {
    flex: 1,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skeleton: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  completionSkeleton: {
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add mobile/components/profiles/OwnProfileCard.tsx
git commit -m "feat: add shared OwnProfileCard for self-profile display"
```

---

### Task 4: Refactor Employer Self-Profile to Use OwnProfileCard

**Files:**
- Modify: `mobile/app/(employer)/(tabs)/profile.tsx`

**Goal:** Replace the employer self-profile screen's custom layout with the shared `OwnProfileCard` component.

**Interfaces:**
- Consumes: `OwnProfileCard`, `getEmployerProfile`, `getUserReviews`, `useAuthStore`
- Produces: Employer self-profile tab uses shared component

- [ ] **Step 1: Rewrite employer profile tab**

Replace the entire content of `mobile/app/(employer)/(tabs)/profile.tsx` with:

```tsx
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { OwnProfileCard } from '@/components/profiles/OwnProfileCard';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerProfile } from '@/lib/api/profiles';
import { getUserReviews } from '@/lib/api/reviews';
import { translate } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { EmployerProfile as EmployerProfileType, TrustSummary } from '@/types';
import { employerEditProfileRoute, employerReviewsListRoute } from '@/utils/routing';

const NO_REVIEWS_SUMMARY: TrustSummary = { averageRating: null, totalReviews: 0 };

export default function EmployerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<EmployerProfileType | null>(null);
  const [ratingSummary, setRatingSummary] = useState<TrustSummary>(NO_REVIEWS_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' | 'focus' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    setError(null);

    try {
      const currentUser = useAuthStore.getState().user;
      const [data, reviewData] = await Promise.all([
        getEmployerProfile(),
        currentUser?.id
          ? getUserReviews(currentUser.id, 1, 1).catch(() => null)
          : Promise.resolve(null),
      ]);
      setProfile(data);
      setRatingSummary(reviewData?.summary ?? NO_REVIEWS_SUMMARY);
    } catch (err) {
      setError(getApiErrorMessage(err, translate('profile.unableLoadProfile')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile('focus');
    }, [loadProfile]),
  );

  return (
    <OwnProfileCard
      role="employer"
      profile={profile}
      ratingSummary={ratingSummary}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => void loadProfile('refresh')}
      onRetry={() => void loadProfile()}
      onEditProfile={() => router.push(employerEditProfileRoute())}
      onLogout={() => void logout()}
      onViewReviews={() => {
        if (user?.id) router.push(employerReviewsListRoute(user.id));
      }}
      completion={profile?.completion}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/\(employer\)/\(tabs\)/profile.tsx
git commit -m "refactor: employer self-profile uses shared OwnProfileCard"
```

---

### Task 5: Refactor Worker Self-Profile to Use OwnProfileCard

**Files:**
- Modify: `mobile/app/(worker)/(tabs)/profile.tsx`

**Goal:** Replace the worker self-profile screen's custom layout with the shared `OwnProfileCard` component.

**Interfaces:**
- Consumes: `OwnProfileCard`, `getWorkerProfile`, `getApplications`, `getAssignments`, `getUserReviews`, `useAuthStore`
- Produces: Worker self-profile tab uses shared component

- [ ] **Step 1: Rewrite worker profile tab**

Replace the entire content of `mobile/app/(worker)/(tabs)/profile.tsx` with:

```tsx
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { OwnProfileCard } from '@/components/profiles/OwnProfileCard';
import { getApplications } from '@/lib/api/applications';
import { getAssignments } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile } from '@/lib/api/profiles';
import { getUserReviews } from '@/lib/api/reviews';
import { translate } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { TrustSummary, WorkerProfile } from '@/types';
import { workerEditProfileRoute, workerReviewsListRoute } from '@/utils/routing';

const NO_REVIEWS_SUMMARY: TrustSummary = { averageRating: null, totalReviews: 0 };

export default function WorkerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [ratingSummary, setRatingSummary] = useState<TrustSummary>(NO_REVIEWS_SUMMARY);
  const [stats, setStats] = useState({ applications: 0, assignments: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' | 'focus' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    setError(null);

    try {
      const currentUser = useAuthStore.getState().user;
      const [profileData, applicationsData, assignmentsData, reviewData] = await Promise.all([
        getWorkerProfile(),
        getApplications(1, 50),
        getAssignments(1, 50),
        currentUser?.id
          ? getUserReviews(currentUser.id, 1, 1).catch(() => null)
          : Promise.resolve(null),
      ]);

      const completed = assignmentsData.assignments.filter(
        (item) => item.status === 'COMPLETED',
      ).length;

      setProfile(profileData);
      setRatingSummary(reviewData?.summary ?? NO_REVIEWS_SUMMARY);
      setStats({
        applications: applicationsData.pagination.total,
        assignments: assignmentsData.pagination.total,
        completed,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, translate('profile.unableLoadProfile')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile('focus');
    }, [loadProfile]),
  );

  return (
    <OwnProfileCard
      role="worker"
      profile={profile}
      ratingSummary={ratingSummary}
      stats={stats}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => void loadProfile('refresh')}
      onRetry={() => void loadProfile()}
      onEditProfile={() => router.push(workerEditProfileRoute())}
      onLogout={() => void logout()}
      onViewReviews={() => {
        if (user?.id) router.push(workerReviewsListRoute(user.id));
      }}
      completion={profile?.completion}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/\(worker\)/\(tabs\)/profile.tsx
git commit -m "refactor: worker self-profile uses shared OwnProfileCard"
```

---

### Task 6: Add Review Prompt After Employer Completion on Job Detail

**Files:**
- Modify: `mobile/app/(employer)/jobs/[jobId].tsx` (lines ~354-402)

**Goal:** Show the "Rate Worker" review prompt immediately after employer marks job as completed, not just when the full job status is COMPLETED. This aligns the UI with the new backend eligibility.

**Interfaces:**
- Consumes: `EmployerReviewStatus` from review API, `getEmployerReviewStatus`
- Produces: Review prompt visible when `employerCompleted` is true, even if `job.status !== "COMPLETED"`

- [ ] **Step 1: Update review status loading and display**

In `mobile/app/(employer)/jobs/[jobId].tsx`, the review status is currently only loaded when `data.job.status === 'COMPLETED'` (line ~68). Change this to also load when `data.completion?.employerCompleted` is true.

Find the block around line 68:
```tsx
if (data.job.status === 'COMPLETED') {
```

Replace with:
```tsx
if (data.job.status === 'COMPLETED' || data.completion?.employerCompleted) {
```

- [ ] **Step 2: Update review section rendering condition**

Find the block around line 368:
```tsx
{job.status === 'COMPLETED' && reviewStatus && reviewStatus.workers.length > 0 ? (
```

Replace with:
```tsx
{(job.status === 'COMPLETED' || completion?.employerCompleted) && reviewStatus && reviewStatus.workers.length > 0 ? (
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(employer\)/jobs/\[jobId\].tsx
git commit -m "fix: show employer review prompt after employer completion, not just job completion"
```

---

### Task 7: Add Review Prompt After Worker Completion on Assignment Detail

**Files:**
- Modify: `mobile/app/(worker)/assignments/[assignmentId].tsx` (lines ~67-75)

**Goal:** Show the "Rate Employer" review prompt immediately after worker marks their assignment as completed, even if the job isn't fully COMPLETED yet. This aligns the UI with the new backend eligibility.

**Interfaces:**
- Consumes: `WorkerReviewStatus` from review API, `getWorkerReviewStatus`
- Produces: Review prompt visible when `assignment.workerCompleted` is true

- [ ] **Step 1: Update review status loading**

In `mobile/app/(worker)/assignments/[assignmentId].tsx`, the review status is currently only loaded when `data.assignment.job.status === 'COMPLETED'` (line ~67). Change this to also load when the worker has completed their assignment.

Find the block around line 67:
```tsx
if (data.assignment.job.status === 'COMPLETED') {
```

Replace with:
```tsx
if (data.assignment.job.status === 'COMPLETED' || data.assignment.workerCompleted) {
```

- [ ] **Step 2: Update review button rendering condition**

Find the footer rendering around lines 187-203. The current logic shows the review button only when `job.status === 'COMPLETED'`. Update it to also show when the worker has completed their assignment.

The current code:
```tsx
) : job.status === 'COMPLETED' && reviewStatus ? (
```

Replace with:
```tsx
) : (job.status === 'COMPLETED' || assignment.workerCompleted) && reviewStatus ? (
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(worker\)/assignments/\[assignmentId\].tsx
git commit -m "fix: show worker review prompt after worker completion, not just job completion"
```

---

### Task 8: Run Full Verification

**Files:**
- All modified files

**Goal:** Verify all changes compile, existing tests pass, and the architecture is consistent.

- [ ] **Step 1: Run backend tests**

```bash
cd backend && npm test
```
Expected: All tests pass.

- [ ] **Step 2: Run frontend type check**

```bash
cd mobile && npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 3: Verify no lint errors**

```bash
cd mobile && npx eslint components/profiles/OwnProfileCard.tsx app/\(employer\)/\(tabs\)/profile.tsx app/\(worker\)/\(tabs\)/profile.tsx app/\(employer\)/jobs/\[jobId\].tsx app/\(worker\)/assignments/\[assignmentId\].tsx
```
Expected: No lint errors (or only pre-existing warnings).

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback from verification"
```

---

## Summary of Changes

### Backend
| File | Change |
|------|--------|
| `review.service.js` | `checkWorkerReviewEligibility`: check `assignment.workerCompleted` instead of `job.status === "COMPLETED"` |
| `review.service.js` | `checkEmployerReviewEligibility`: check `job.completion?.employerCompleted` instead of `job.status === "COMPLETED"` |

### Frontend
| File | Change |
|------|--------|
| `components/profiles/OwnProfileCard.tsx` | **New** — shared self-profile display component |
| `(employer)/(tabs)/profile.tsx` | Refactored to use `OwnProfileCard` |
| `(worker)/(tabs)/profile.tsx` | Refactored to use `OwnProfileCard` |
| `(employer)/jobs/[jobId].tsx` | Review prompt shown after employer completion |
| `(worker)/assignments/[assignmentId].tsx` | Review prompt shown after worker completion |

### State Machine (After Changes)

```
Job Lifecycle:
  OPEN → FILLED → IN_PROGRESS → COMPLETED → CANCELLED

Completion Actions:
  Employer: marks job completed → job.completion.employerCompleted = true
  Worker: marks assignment completed → assignment.workerCompleted = true
  Job COMPLETED when: employerCompleted && allRequiredWorkersCompleted

Review Eligibility:
  Employer → Worker: employerCompleted on job (even if workers still completing)
  Worker → Employer: workerCompleted on assignment (even if employer hasn't completed)

Review Permission Matrix:
  ┌─────────────────────┬──────────────────┬──────────────────┐
  │ Action              │ Employer         │ Worker           │
  ├─────────────────────┼──────────────────┼──────────────────┤
  │ Before completion   │ Cannot review    │ Cannot review    │
  │ After own completion│ CAN review       │ CAN review       │
  │ Already reviewed    │ "Reviewed" badge │ "Reviewed" badge │
  └─────────────────────┴──────────────────┴──────────────────┘
```

### What Was NOT Changed
- Authentication / OTP flow
- Push notifications
- MongoDB connection
- Google Maps
- Android build config
- Navigation structure
- API routes/endpoints (no new endpoints)
- Database schemas (no migrations needed)
- `MarketplaceProfileScreen` (already shared)
- `ReviewComposer` (already shared)
- `ReviewCard` (already shared)
- `ReviewListScreen` (already shared)
- Job creation/application flow
- Assignment creation flow
