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
import { getApiErrorMessage, getProfileCompletionInfo } from '@/lib/api/errors';
import { getWorkerProfile } from '@/lib/api/profiles';
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
  const [completionInfo, setCompletionInfo] = useState<{
    percentage?: number;
    missingFields?: string[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getJobById(id)
      .then((data) => {
        setJob(data);
        if (data.hasApplied) setHasAppliedLocally(true);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Failed to load job details'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  // Optional background fetch of worker completeness info
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'worker') return;
    let active = true;
    getWorkerProfile()
      .then((profile: any) => {
        if (active && profile?.completion) {
          setCompletionInfo({
            percentage: profile.completion.percentage,
            missingFields: profile.completion.missingFields,
          });
        }
      })
      .catch(() => {
        // Optional hint fetch failure never blocks browsing
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.role]);

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

    // Check if worker profile is incomplete
    if (completionInfo && completionInfo.percentage !== undefined && completionInfo.percentage < 100) {
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
    } catch (err: unknown) {
      const info = getProfileCompletionInfo(err);
      if (info) {
        setIsApplySheetOpen(false);
        setCompletionInfo({
          percentage: info.percentage,
          missingFields: info.missingFields,
        });
        setShowIncompleteModal(true);
      } else {
        showToast({
          title: 'Could Not Apply',
          description: getApiErrorMessage(err, 'Unable to submit application. Please check your connection and try again.'),
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
    <div className="max-w-2xl mx-auto space-y-5 pb-48 md:pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant={job.status === 'OPEN' ? 'success' : 'neutral'}>
            {job.status}
          </Badge>
          <button
            onClick={handleShare}
            className="p-2 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-colors shadow-xs"
            aria-label="Share Job"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <Card>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
              <span>{job.category.replace(/_/g, ' ')}</span>
              <span>•</span>
              <span>{job.compensation.type}</span>
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight leading-tight">
              {job.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary pt-1 border-t border-border/60">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formatJobDate(job.schedule.startDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span>{formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{job.location.city}, {job.location.state}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Compensation & Workers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-baseline justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <div>
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Pay Rate
            </span>
            <div className="text-xl font-black text-primary mt-0.5">
              {formatCurrency(job.compensation.amount)}
            </div>
          </div>
          <span className="text-xs font-semibold text-text-secondary">
            /{job.compensation.type.toLowerCase()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-border shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Workers Needed
          </span>
          <div className="text-xl font-black text-text-primary mt-0.5">
            {job.workersRequired} {job.workersRequired === 1 ? 'Worker' : 'Workers'}
          </div>
        </div>
      </div>

      {/* Description */}
      <Card title="Job Description">
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
          {job.description}
        </p>
      </Card>

      {/* Schedule Summary */}
      <Card title="Shift & Working Hours">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-bg-primary border border-border">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase block">
                Shift Schedule
              </span>
              <span className="text-xs font-bold text-text-primary">
                {formatJobDate(job.schedule.startDate)}
                {job.schedule.endDate && ` to ${formatJobDate(job.schedule.endDate)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-bg-primary border border-border">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase block">
                Hours Per Day
              </span>
              <span className="text-xs font-bold text-text-primary">
                {job.schedule.durationHours || job.duration?.hoursPerDay ? `${job.schedule.durationHours || job.duration?.hoursPerDay} hours` : 'Full Shift'} ({formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)})
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Requirements & Skills */}
      {Boolean(job.requirements?.skills?.length || job.requirements?.experience || job.requirements?.dressCode || job.requirements?.languages?.length) && (
        <Card title="Skills & Requirements">
          <div className="space-y-4">
            {job.requirements?.skills && job.requirements.skills.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">
                  Required Skills
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.requirements.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 rounded-xl bg-bg-secondary text-text-primary text-xs font-semibold border border-border"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.requirements?.languages && job.requirements.languages.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">
                  Languages
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.requirements.languages.map((lang: string) => (
                    <span
                      key={lang}
                      className="px-3 py-1.5 rounded-xl bg-bg-secondary text-text-primary text-xs font-semibold border border-border"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(job.requirements?.experience || job.requirements?.dressCode) && (
              <div className="space-y-2 pt-2 border-t border-border">
                {job.requirements.experience && (
                  <div className="text-xs text-text-secondary">
                    <strong className="text-text-primary">Experience:</strong> {job.requirements.experience}
                  </div>
                )}
                {job.requirements.dressCode && (
                  <div className="text-xs text-text-secondary">
                    <strong className="text-text-primary">Dress Code:</strong> {job.requirements.dressCode}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Location Map */}
      <Card title="Work Location">
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs font-medium text-text-secondary">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-text-primary">{job.location.address}</p>
              <p>{job.location.city}, {job.location.state} — {job.location.pincode}</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-border">
            <JobMapPreview
              latitude={job.location.coordinates?.latitude || 12.9716}
              longitude={job.location.coordinates?.longitude || 77.5946}
              title={job.title}
              address={job.location.address}
              height={180}
            />
          </div>
        </div>
      </Card>

      {/* Employer Info */}
      <Card title="Posted By">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileAvatar name={employerName} size="md" />
            <div>
              <h4 className="text-sm font-bold text-text-primary">{employerName}</h4>
              <p className="text-xs font-medium text-text-muted flex items-center gap-1 mt-0.5">
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

      {/* Bottom Sticky Action Bar — Positioned above mobile bottom tab bar */}
      <div className="fixed bottom-[calc(56px+var(--sab))] md:bottom-0 left-0 right-0 z-30 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
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
        completionPercentage={completionInfo?.percentage ?? 50}
        missingFields={completionInfo?.missingFields}
        title="Profile Incomplete"
        description="To submit applications, employers require verified profile details including your name, contact phone, and key skills."
      />
    </div>
  );
};
