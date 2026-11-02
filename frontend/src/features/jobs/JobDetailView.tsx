import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Share2,
  Building,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { getJobById } from '@/lib/api/jobs';
import { applyForJob } from '@/lib/api/applications';
import type { Job } from '@/types/jobs';
import { formatCurrency, formatJobDate, formatJobTime } from '@/utils/formatJob';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Textarea } from '@/components/ui/Textarea';
import { ProfileIncompleteModal } from '@/components/profiles/ProfileIncompleteModal';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';

export const JobDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, setPendingIntent } = useAuthStore();
  const { showToast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Application flow state
  const [isApplySheetOpen, setIsApplySheetOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAppliedLocally, setHasAppliedLocally] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getJobById(id)
      .then((data) => {
        setJob(data);
        if (data.hasApplied) setHasAppliedLocally(true);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load job details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title || 'Gig on FixMate',
          text: `Check out this gig: ${job?.title} on FixMate`,
          url: window.location.href,
        });
      } catch {
        // Ignored or dismissed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast({
        title: 'Link Copied',
        description: 'Job link copied to your clipboard',
        type: 'info',
      });
    }
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      if (id) {
        setPendingIntent({ action: 'apply', jobId: id });
      }
      navigate('/login');
      return;
    }

    if (user?.role === 'employer') {
      const empObj = typeof job?.employer === 'object' && job.employer !== null ? job.employer : null;
      const empId = empObj?._id || (job as any)?.employerId;
      if (empId === user?.id) {
        navigate(`/employer/jobs/${id}`);
      } else {
        showToast({
          title: 'Employers Cannot Apply',
          description: 'You are signed in with an employer account. Switch to a worker account to apply.',
          type: 'warning',
        });
      }
      return;
    }

    // Check if worker profile is complete enough (if available)
    if (user?.profileCompletion && user.profileCompletion < 50) {
      setShowIncompleteModal(true);
      return;
    }

    setIsApplySheetOpen(true);
  };

  const handleSubmitApplication = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await applyForJob(id, coverNote.trim() || undefined);
      setHasAppliedLocally(true);
      setIsApplySheetOpen(false);
      showToast({
        title: 'Application Submitted!',
        description: 'The employer will review your profile shortly.',
        type: 'success',
      });
    } catch (err: any) {
      if (err.isProfileIncomplete || err.code === 'PROFILE_INCOMPLETE') {
        setIsApplySheetOpen(false);
        setShowIncompleteModal(true);
      } else {
        showToast({
          title: 'Could Not Apply',
          description: err.message || 'Please check your connection and try again.',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-2">
        <Skeleton className="h-8 w-1/3 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState
          title="Job Not Found"
          message={error || 'The job you are looking for does not exist or has been removed.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const empObj = typeof job.employer === 'object' && job.employer !== null ? job.employer : null;
  const employerId = empObj?._id || (job as any).employerId || (typeof job.employer === 'string' ? job.employer : undefined);
  const isOwner = Boolean(user?.id && (employerId === user.id || empObj?._id === user.id));
  const employerName = empObj?.name || empObj?.companyName || (job as any).employerName || 'Verified Employer';

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-28 md:pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handleShare}
          className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-colors shadow-xs"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Header Card */}
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Badge variant="primary" size="md">
              {job.category.replace(/_/g, ' ')}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {job.title}
            </h1>
          </div>
          <Badge
            variant={
              job.status === 'OPEN'
                ? 'success'
                : job.status === 'COMPLETED'
                ? 'neutral'
                : 'warning'
            }
          >
            {job.status}
          </Badge>
        </div>

        {/* Compensation Box */}
        <div className="flex items-baseline justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              Offered Compensation
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black text-primary tracking-tight">
                {formatCurrency(job.compensation.amount)}
              </span>
              <span className="text-xs font-semibold text-text-secondary">
                / {job.compensation.type === 'hourly' ? 'hour' : 'task'}
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-text-muted bg-white px-2.5 py-1 rounded-full border border-border">
            {job.compensation.type === 'hourly' ? 'Hourly Rate' : 'Fixed Lump-sum'}
          </span>
        </div>

        {/* Time & Date */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-bg-primary border border-border">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                Date
              </span>
              <span className="text-xs font-bold text-text-primary truncate block">
                {formatJobDate(job.schedule.date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-bg-primary border border-border">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                Schedule
              </span>
              <span className="text-xs font-bold text-text-primary truncate block">
                {formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Description */}
      <Card title="Gig Description">
        <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
          {job.description}
        </p>

        {job.requirements?.skills && job.requirements.skills.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2.5">
              Key Requirements
            </span>
            <ul className="space-y-2">
              {job.requirements.skills.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs font-medium text-text-primary">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Location Card with Leaflet Map Preview */}
      <Card title="Location">
        <div className="flex items-start gap-2.5 mb-3 text-text-secondary">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-text-primary">{job.location.address}</p>
            <p className="text-text-muted mt-0.5">
              {job.location.city}, {job.location.state} {job.location.pincode}
            </p>
          </div>
        </div>

        <JobMapPreview
          latitude={job.location.coordinates?.latitude || 12.9716}
          longitude={job.location.coordinates?.longitude || 77.5946}
          title={job.title}
          address={job.location.address}
          height="220px"
        />
      </Card>

      {/* Employer Info Card */}
      <Card title="Posted By">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileAvatar name={employerName} size="md" />
            <div>
              <h4 className="text-sm font-bold text-text-primary">{employerName}</h4>
              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5" />
                <span>FixMate Verified Employer</span>
              </p>
            </div>
          </div>

          {employerId && (
            <Link
              to={`/profile/${employerId}`}
              className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-full hover:bg-bg-secondary transition-colors"
            >
              View Profile
            </Link>
          )}
        </div>
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 backdrop-blur-md border-t border-border shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="min-w-0 hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-text-muted block">Compensation</span>
            <span className="text-lg font-black text-primary">
              {formatCurrency(job.compensation.amount)}
            </span>
          </div>

          <div className="flex-1">
            {isOwner ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate(`/employer/jobs/${id}`)}
              >
                Manage This Job
              </Button>
            ) : hasAppliedLocally ? (
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                disabled
                leftIcon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
              >
                Applied Already
              </Button>
            ) : job.status !== 'OPEN' ? (
              <Button variant="secondary" size="lg" fullWidth disabled>
                Job is {job.status}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleApplyClick}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Apply for this Gig
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Apply Bottom Sheet */}
      <BottomSheet
        isOpen={isApplySheetOpen}
        onClose={() => setIsApplySheetOpen(false)}
        title="Submit Application"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wide">
              Applying for: {job.title}
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Offered rate: {formatCurrency(job.compensation.amount)} ({job.compensation.type})
            </p>
          </div>

          <Textarea
            label="Cover Note / Proposal (Optional)"
            placeholder="Tell the employer why you are a great fit for this task, relevant experience, or availability..."
            rows={4}
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
          />

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onClick={handleSubmitApplication}
            >
              Confirm Application
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Profile Incomplete Modal */}
      <ProfileIncompleteModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        title="Profile Incomplete"
        description="To submit applications, employers require verified profile details including your name, contact phone, and key skills."
      />
    </div>
  );
};
