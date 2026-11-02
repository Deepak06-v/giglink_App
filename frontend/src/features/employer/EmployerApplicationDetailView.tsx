import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Star,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  getEmployerApplicationById,
  acceptApplication,
  rejectApplication,
} from '@/lib/api/applications';
import type { Application, Job } from '@/types/jobs';
import { formatCurrency, formatJobDate, formatJobTime } from '@/utils/formatJob';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useToast } from '@/components/ui/Toast';

export const EmployerApplicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const loadData = () => {
    if (!id) return;
    setIsLoading(true);
    getEmployerApplicationById(id)
      .then((data) => setApplication(data))
      .catch((err) => setError(err.message || 'Failed to load application'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAccept = async () => {
    if (!id) return;
    setIsAccepting(true);
    try {
      await acceptApplication(id);
      showToast({
        title: 'Application Accepted',
        description: 'An assignment has been created for this worker.',
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      showToast({
        title: 'Accept Failed',
        description: err.message || 'Could not accept application.',
        type: 'error',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setIsRejecting(true);
    try {
      await rejectApplication(id);
      showToast({
        title: 'Application Rejected',
        description: 'Candidate has been notified.',
        type: 'info',
      });
      loadData();
    } catch (err: any) {
      showToast({
        title: 'Reject Failed',
        description: err.message || 'Could not reject application.',
        type: 'error',
      });
    } finally {
      setIsRejecting(false);
      setIsRejectOpen(false);
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

  if (error || !application) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState
          title="Application Not Found"
          message={error || 'Unable to retrieve application details.'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const job = typeof application.job === 'object' ? (application.job as Job) : null;
  const worker =
    typeof application.worker === 'object' && application.worker !== null
      ? application.worker
      : null;

  const workerName = worker?.name || 'Applicant';
  const workerId = worker?._id || (worker as any)?.id;
  const status = application.status;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <Badge
          variant={
            status === 'ACCEPTED'
              ? 'success'
              : status === 'REJECTED'
              ? 'error'
              : 'warning'
          }
        >
          {status}
        </Badge>
      </div>

      {/* Candidate Card */}
      <Card title="Candidate Profile">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              name={workerName}
              imageUrl={(worker as any)?.profileImage}
              size="lg"
            />
            <div>
              <h3 className="text-base font-bold text-text-primary">{workerName}</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {(worker as any)?.location?.city || 'Local Area'}
              </p>
            </div>
          </div>

          {workerId && (
            <Link
              to={`/profile/${workerId}`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-bg-secondary transition-colors"
            >
              <span>Full Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Candidate Cover Note */}
        {application.coverNote && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1">
              Applicant Proposal
            </span>
            <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed bg-bg-primary p-3 rounded-2xl">
              {application.coverNote}
            </p>
          </div>
        )}
      </Card>

      {/* Job Reference Card */}
      {job && (
        <Card title="Target Gig">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-bold text-text-primary">{job.title}</h4>
              <p className="text-xs text-text-muted mt-0.5">{job.location.city}</p>
            </div>
            <span className="text-sm font-black text-primary">
              {formatCurrency(job.compensation.amount)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary pt-3 mt-3 border-t border-border">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {formatJobDate(job.schedule.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)}
            </span>
          </div>
        </Card>
      )}

      {/* Actions Bar */}
      {status === 'PENDING' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 backdrop-blur-md border-t border-border shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsRejectOpen(true)}
              className="w-1/3"
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isAccepting}
              onClick={handleAccept}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Accept Candidate
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
        title="Reject Application?"
        message="Are you sure you want to decline this applicant? They will receive an update that this gig is no longer available to them."
        confirmText="Reject Application"
        cancelText="Cancel"
        variant="danger"
        loading={isRejecting}
      />
    </div>
  );
};
