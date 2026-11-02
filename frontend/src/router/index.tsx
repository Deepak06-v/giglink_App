import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import {
  AuthBootstrap,
  AuthGuard,
  WorkerGuard,
  EmployerGuard,
  PublicOnlyGuard,
} from './guards';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/stores/authStore';
import { getRoleHomeRoute } from '@/utils/routing';

// Auth & Onboarding Views
import { LoginView } from '@/features/auth/LoginView';
import { SignupView } from '@/features/auth/SignupView';
import { PhoneAuthView } from '@/features/auth/PhoneAuthView';
import { OtpView } from '@/features/auth/OtpView';
import { OnboardingView } from '@/features/onboarding/OnboardingView';

// Public & Jobs
import { JobBrowseView } from '@/features/jobs/JobBrowseView';
import { JobDetailView } from '@/features/jobs/JobDetailView';

// Worker Views
import { WorkerApplicationsView } from '@/features/worker/WorkerApplicationsView';
import { WorkerApplicationDetailView } from '@/features/worker/WorkerApplicationDetailView';
import { WorkerAssignmentsView } from '@/features/worker/WorkerAssignmentsView';
import { WorkerAssignmentDetailView } from '@/features/worker/WorkerAssignmentDetailView';
import { WorkerProfileView } from '@/features/worker/WorkerProfileView';
import { WorkerEditProfileView } from '@/features/worker/WorkerEditProfileView';
import { WorkerReviewSubmitView } from '@/features/worker/WorkerReviewSubmitView';

// Employer Views
import { EmployerDashboardView } from '@/features/employer/EmployerDashboardView';
import { EmployerJobsView } from '@/features/employer/EmployerJobsView';
import { EmployerCreateJobView } from '@/features/employer/EmployerCreateJobView';
import { EmployerJobDetailView } from '@/features/employer/EmployerJobDetailView';
import { EmployerEditJobView } from '@/features/employer/EmployerEditJobView';
import { EmployerApplicationsView } from '@/features/employer/EmployerApplicationsView';
import { EmployerApplicationDetailView } from '@/features/employer/EmployerApplicationDetailView';
import { EmployerProfileView } from '@/features/employer/EmployerProfileView';
import { EmployerEditProfileView } from '@/features/employer/EmployerEditProfileView';
import { EmployerReviewSubmitView } from '@/features/employer/EmployerReviewSubmitView';

// Shared
import { NotificationsView } from '@/features/notifications/NotificationsView';
import { MarketplaceProfileView } from '@/features/profiles/MarketplaceProfileView';
import { ReviewsListView } from '@/features/reviews/ReviewsListView';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isGuest } = useAuthStore();
  if (isAuthenticated && user?.role) {
    return <Navigate to={getRoleHomeRoute(user.role)} replace />;
  }
  if (isGuest) {
    return <Navigate to="/browse" replace />;
  }
  return <Navigate to="/login" replace />;
};

export const router = createBrowserRouter([
  {
    element: (
      <AuthBootstrap>
        <Outlet />
      </AuthBootstrap>
    ),
    children: [
      {
        path: '/',
        element: <RootRedirect />,
      },

      // Guest / Public Auth
      {
        path: '/login',
        element: (
          <PublicOnlyGuard>
            <LoginView />
          </PublicOnlyGuard>
        ),
      },
      {
        path: '/signup',
        element: (
          <PublicOnlyGuard>
            <SignupView />
          </PublicOnlyGuard>
        ),
      },
      {
        path: '/phone',
        element: (
          <PublicOnlyGuard>
            <PhoneAuthView />
          </PublicOnlyGuard>
        ),
      },
      {
        path: '/otp',
        element: (
          <PublicOnlyGuard>
            <OtpView />
          </PublicOnlyGuard>
        ),
      },
      {
        path: '/onboarding',
        element: (
          <AuthGuard>
            <OnboardingView />
          </AuthGuard>
        ),
      },

      // Shared Public Browsing (within AppLayout)
      {
        element: <AppLayout />,
        children: [
          {
            path: '/browse',
            element: <JobBrowseView />,
          },
          {
            path: '/jobs/:id',
            element: <JobDetailView />,
          },
          {
            path: '/profile/:userId',
            element: <MarketplaceProfileView />,
          },
          {
            path: '/reviews/:userId',
            element: <ReviewsListView />,
          },
        ],
      },

      // Worker Routes
      {
        path: '/worker',
        element: (
          <WorkerGuard>
            <AppLayout />
          </WorkerGuard>
        ),
        children: [
          {
            path: 'jobs',
            element: <JobBrowseView />,
          },
          {
            path: 'applications',
            element: <WorkerApplicationsView />,
          },
          {
            path: 'applications/:id',
            element: <WorkerApplicationDetailView />,
          },
          {
            path: 'assignments',
            element: <WorkerAssignmentsView />,
          },
          {
            path: 'assignments/:id',
            element: <WorkerAssignmentDetailView />,
          },
          {
            path: 'profile',
            element: <WorkerProfileView />,
          },
          {
            path: 'profile/edit',
            element: <WorkerEditProfileView />,
          },
          {
            path: 'reviews/submit/:assignmentId',
            element: <WorkerReviewSubmitView />,
          },
          {
            path: 'notifications',
            element: <NotificationsView />,
          },
        ],
      },

      // Employer Routes
      {
        path: '/employer',
        element: (
          <EmployerGuard>
            <AppLayout />
          </EmployerGuard>
        ),
        children: [
          {
            path: 'dashboard',
            element: <EmployerDashboardView />,
          },
          {
            path: 'jobs',
            element: <EmployerJobsView />,
          },
          {
            path: 'jobs/create',
            element: <EmployerCreateJobView />,
          },
          {
            path: 'jobs/:id',
            element: <EmployerJobDetailView />,
          },
          {
            path: 'jobs/:id/edit',
            element: <EmployerEditJobView />,
          },
          {
            path: 'jobs/:id/reviews',
            element: <EmployerReviewSubmitView />,
          },
          {
            path: 'applications',
            element: <EmployerApplicationsView />,
          },
          {
            path: 'applications/:id',
            element: <EmployerApplicationDetailView />,
          },
          {
            path: 'profile',
            element: <EmployerProfileView />,
          },
          {
            path: 'profile/edit',
            element: <EmployerEditProfileView />,
          },
          {
            path: 'notifications',
            element: <NotificationsView />,
          },
        ],
      },

      // Fallback
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
