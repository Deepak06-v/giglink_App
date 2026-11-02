import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  XCircle,
  CheckCircle,
  Share2,
  Sparkles,
} from 'lucide-react';
import {
  getJobById,
  publishJob,
  cancelJob,
  completeJob,
  deleteJob,
} from '@/lib/api/jobs';
import { getJobApplications } from '@/lib/api/applications';
import type { Job, Application } from '@/types/jobs';
import { formatCurrency, formatJobDate, formatJobTime } from '@/utils/formatJob';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { EmployerApplicationCard } from '@/components/cards/EmployerApplicationCard';
import { ProfileIncompleteModal } from '@/components/profiles/ProfileIncompleteModal';
import { useToast } from '@/components/ui/Toast';

export const EmployerJobDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [jobData, appsData] = await Promise.all([
        getJobById(id),
        getJobApplications(id).catch(() => ({ applications: [] })),
      ]);
      setJob(jobData);
      setApplications((appsData as any).applications || (appsData as any).items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load gig details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePublish = async () => {
    if (!id) return;
    setIsPublishing(true);
    try {
      await publishJob(id);
      showToast({
        title: 'Gig Published',
        description: 'Your gig is now live and accepting worker applications.',
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      if (err.isProfileIncomplete || err.code === 'PROFILE_INCOMPLETE') {
        setShowIncompleteModal(true);
      } else {
        showToast({
          title: 'Could Not Publish',
          description: err.message || 'Please verify profile details.',
          type: 'error',
        });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      await cancelJob(id);
      showToast({
        title: 'Gig Cancelled',
        description: 'The job posting has been cancelled.',
        type: 'info',
      });
      loadData();
    } catch (err: any) {
      showToast({
        title: 'Cancel Failed',
        description: err.message || 'Could not cancel job.',
        type: 'error',
      });
    } finally {
      setIsCancelling(false);
      setIsCancelOpen(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      await completeJob(id);
      showToast({
        title: 'Gig Marked Completed',
        description: 'You can now leave reviews for the assigned workers.',
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      showToast({
        title: 'Completion Failed',
        description: err.message || 'Could not complete job.',
        type: 'error',
      });
    } finally {
      setIsCompleting(false);
      setIsCompleteOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteJob(id);
      showToast({
        title: 'Job Deleted',
        description: 'The gig has been removed from your dashboard.',
        type: 'info',
      });
      navigate('/employer/jobs', { replace: true });
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete job.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-4">
        <Skeleton className="h-8 w-1/3 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState
          title="Gig Not Found"
          message={error || 'Unable to retrieve gig details.'}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-28 md:pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employer/jobs')}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Gigs</span>
        </button>

        <div className="flex items-center gap-2">
          {job.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/employer/jobs/${id}/edit`)}
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
          )}

          <Badge
            variant={
              job.status === 'OPEN'
                ? 'success'
                : job.status === 'DRAFT'
                ? 'warning'
                : job.status === 'COMPLETED'
                ? 'neutral'
                : 'default'
            }
          >
            {job.status}
          </Badge>
        </div>
      </div>

      {/* Hero Overview */}
      <Card className="space-y-4">
        <div className="space-y-1">
          <Badge variant="primary" size="sm">
            {job.category.replace(/_/g, ' ')}
          </Badge>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">
            {job.title}
          </h1>
        </div>

        <div className="flex items-baseline justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
              Budget / Pay
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-primary">
                {formatCurrency(job.compensation.amount)}
              </span>
              <span className="text-xs font-semibold text-text-secondary">
                / {job.compensation.type}
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-text-muted bg-white px-2.5 py-1 rounded-full border border-border">
            {job.workersRequired} worker(s) required
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-bg-primary border border-border">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Date</span>
              <span className="text-xs font-bold text-text-primary truncate block">
                {formatJobDate(job.schedule.date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-2xl bg-bg-primary border border-border">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Schedule</span>
              <span className="text-xs font-bold text-text-primary truncate block">
                {formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Description */}
      <Card title="Description">
        <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
          {job.description}
        </p>
      </Card>

      {/* Location */}
      <Card title="Location">
        <div className="flex items-start gap-2 mb-3 text-xs text-text-secondary">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            {job.location.address}, {job.location.city}, {job.location.state} {job.location.pincode}
          </span>
        </div>

        <JobMapPreview
          latitude={job.location.coordinates?.latitude || 12.9716}
          longitude={job.location.coordinates?.longitude || 77.5946}
          title={job.title}
          address={job.location.address}
          height="180px"
        />
      </Card>

      {/* Applicants Section */}
      <Card title={`Applicants (${applications.length})`}>
        {applications.length === 0 ? (
          <p className="text-xs text-text-muted py-2">
            No workers have applied for this gig yet.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {applications.map((app) => (
              <EmployerApplicationCard key={app._id} application={app} />
            ))}
          </div>
        )}
      </Card>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 backdrop-blur-md border-t border-border shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {job.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsDeleteOpen(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete Draft
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={isPublishing}
                onClick={handlePublish}
                rightIcon={<Sparkles className="w-4 h-4" />}
              >
                Publish Gig
              </Button>
            </>
          )}

          {job.status === 'OPEN' && (
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => setIsCancelOpen(true)}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Cancel Gig
            </Button>
          )}

          {job.status === 'IN_PROGRESS' && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setIsCompleteOpen(true)}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Mark Gig Completed
            </Button>
          )}

          {job.status === 'COMPLETED' && (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={() => navigate(`/employer/jobs/${id}/reviews`)}
            >
              Review Workers
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Gig?"
        message="Are you sure you want to cancel this gig? Active applicants will be notified."
        confirmText="Yes, Cancel Gig"
        cancelText="Keep Open"
        variant="danger"
        loading={isCancelling}
      />

      <ConfirmDialog
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        onConfirm={handleComplete}
        title="Complete Gig?"
        message="Confirm that all work has been delivered. This will transition the gig to completed and open worker reviews."
        confirmText="Confirm Completion"
        cancelText="Not Yet"
        variant="primary"
        loading={isCompleting}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Draft?"
        message="This draft gig will be permanently deleted."
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
        loading={isDeleting}
      />

      <ProfileIncompleteModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        title="Profile Incomplete"
        description="Please complete your employer profile with business name and contact number before publishing."
      />
    </div>
  );
};
