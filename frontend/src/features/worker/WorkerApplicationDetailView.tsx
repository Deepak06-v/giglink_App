import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, CheckCircle2, AlertCircle, XCircle, Trash2 } from 'lucide-react';
import { getApplicationById, withdrawApplication } from '@/lib/api/applications';
import type { Application, Job } from '@/types/jobs';
import { formatCurrency, formatJobDate, formatJobTime } from '@/utils/formatJob';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export const WorkerApplicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getApplicationById(id)
      .then((data) => setApplication(data))
      .catch((err) => setError(err.message || 'Failed to load application'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleWithdraw = async () => {
    if (!id) return;
    setIsWithdrawing(true);
    try {
      await withdrawApplication(id);
      showToast({
        title: 'Application Withdrawn',
        description: 'You have withdrawn your application for this gig.',
        type: 'info',
      });
      navigate('/worker/applications', { replace: true });
    } catch (err: any) {
      showToast({
        title: 'Withdraw Failed',
        description: err.message || 'Unable to withdraw application.',
        type: 'error',
      });
    } finally {
      setIsWithdrawing(false);
      setIsWithdrawOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-4">
        <Skeleton className="h-8 w-1/3 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
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
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const job = typeof application.job === 'object' ? (application.job as Job) : null;
  const status = application.status;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Application Details
        </span>
      </div>

      {/* Status Banner */}
      <div
        className={`p-4 rounded-3xl border flex items-center gap-3 ${
          status === 'ACCEPTED'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : status === 'REJECTED'
            ? 'bg-red-50 border-red-200 text-red-800'
            : status === 'WITHDRAWN'
            ? 'bg-gray-100 border-gray-200 text-gray-700'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        {status === 'ACCEPTED' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
        {status === 'REJECTED' && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
        {status === 'WITHDRAWN' && <AlertCircle className="w-5 h-5 text-gray-600 shrink-0" />}
        {status === 'PENDING' && <Clock className="w-5 h-5 text-amber-600 shrink-0" />}

        <div>
          <h4 className="text-sm font-bold capitalize">Application {status.toLowerCase()}</h4>
          <p className="text-xs mt-0.5 opacity-90">
            {status === 'ACCEPTED'
              ? 'Congratulations! The employer accepted your application.'
              : status === 'REJECTED'
              ? 'The employer chose another candidate for this gig.'
              : status === 'WITHDRAWN'
              ? 'You withdrew your proposal.'
              : 'The employer has received your profile and will review it.'}
          </p>
        </div>
      </div>

      {/* Job Summary */}
      {job && (
        <Card title="Gig Overview">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{job.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">{job.location.city}, {job.location.state}</p>
              </div>
              <span className="text-base font-black text-primary">
                {formatCurrency(job.compensation.amount)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-secondary pt-2 border-t border-border">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {formatJobDate(job.schedule.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)}
              </span>
            </div>

            <div className="pt-2">
              <Link
                to={`/jobs/${job._id || (job as any).id}`}
                className="text-xs font-bold text-primary hover:underline"
              >
                View Full Gig Posting →
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Worker's Cover Note */}
      {application.coverNote && (
        <Card title="Your Note / Proposal">
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
            {application.coverNote}
          </p>
        </Card>
      )}

      {/* Actions */}
      {status === 'PENDING' && (
        <div className="pt-4">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => setIsWithdrawOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Withdraw Application
          </Button>
        </div>
      )}

      {status === 'ACCEPTED' && (
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/worker/assignments')}
          >
            Go to My Assignments
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onConfirm={handleWithdraw}
        title="Withdraw Application?"
        message="Are you sure you want to withdraw your application? The employer will no longer consider your profile for this gig."
        confirmText="Yes, Withdraw"
        cancelText="Keep Application"
        variant="danger"
        loading={isWithdrawing}
      />
    </div>
  );
};
