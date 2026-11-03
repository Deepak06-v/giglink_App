import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  Star,
  Building,
  AlertCircle,
} from 'lucide-react';
import { getAssignmentById, completeAssignment } from '@/lib/api/assignments';
import type { Assignment, AssignmentCompletion } from '@/types/jobs';
import { formatCurrency, formatJobDate, formatJobTime } from '@/utils/formatJob';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useToast } from '@/components/ui/Toast';

export const WorkerAssignmentDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [completion, setCompletion] = useState<AssignmentCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const loadData = () => {
    if (!id) return;
    setIsLoading(true);
    getAssignmentById(id)
      .then((data) => {
        setAssignment(data.assignment);
        setCompletion(data.completion);
      })
      .catch((err) => setError(err.message || 'Failed to load assignment'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      await completeAssignment(id);
      showToast({
        title: 'Marked as Completed!',
        description: 'You have verified completion of your part of this gig.',
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      showToast({
        title: 'Completion Failed',
        description: err.message || 'Could not update assignment status.',
        type: 'error',
      });
    } finally {
      setIsCompleting(false);
      setIsConfirmOpen(false);
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

  if (error || !assignment) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState
          title="Assignment Not Found"
          message={error || 'Unable to retrieve assignment details.'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const job = assignment.job;
  const employer = job?.employer;
  const employerName = (typeof employer === 'object' && employer ? employer.name : 'FixMate Employer');
  const employerPhone = (employer as any)?.phone;
  const isCompleted =
    assignment.status === 'COMPLETED' ||
    Boolean(completion?.completion?.isCompleted || (completion as any)?.workerCompleted);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-48 md:pb-16">
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
            assignment.status === 'COMPLETED'
              ? 'success'
              : assignment.status === 'ACTIVE'
              ? 'brand'
              : 'default'
          }
        >
          {assignment.status}
        </Badge>
      </div>

      {/* Main Gig Details Card */}
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
              Agreed Compensation
            </span>
            <span className="text-2xl font-black text-primary">
              {formatCurrency(job.compensation.amount)}
            </span>
          </div>
          <span className="text-xs font-semibold text-text-muted capitalize">
            {job.compensation.type} rate
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
              <span className="text-[10px] uppercase font-bold text-text-muted block">Hours</span>
              <span className="text-xs font-bold text-text-primary truncate block">
                {formatJobTime(job.schedule.startTime)} - {formatJobTime(job.schedule.endTime)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Completion Status Card */}
      <Card title="Assignment Status">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-bg-primary border border-border text-xs">
            <span className="font-semibold text-text-secondary">Worker Confirmation</span>
            <span className="flex items-center gap-1 font-bold">
              {completion?.completion?.workersCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Completed</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-600">Pending your confirmation</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-bg-primary border border-border text-xs">
            <span className="font-semibold text-text-secondary">Employer Confirmation</span>
            <span className="flex items-center gap-1 font-bold">
              {completion?.completion?.employerCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Completed</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-600">Pending employer sign-off</span>
                </>
              )}
            </span>
          </div>
        </div>
      </Card>

      {/* Employer Contact Info */}
      <Card title="Employer Contact">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileAvatar name={employerName} size="md" />
            <div>
              <h4 className="text-sm font-bold text-text-primary">{employerName}</h4>
              <p className="text-xs text-text-muted flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                <span>Job Employer</span>
              </p>
            </div>
          </div>

          {employerPhone && (
            <a
              href={`tel:${employerPhone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
          )}
        </div>
      </Card>

      {/* Map & Location */}
      <Card title="Work Location">
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
          height="200px"
        />
      </Card>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-[calc(56px+var(--sab))] md:bottom-0 left-0 right-0 z-30 p-4 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {!isCompleted ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setIsConfirmOpen(true)}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Mark Job Completed
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={() => navigate(`/worker/reviews/submit/${assignment._id}`)}
              leftIcon={<Star className="w-4 h-4" />}
            >
              Review Employer
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleComplete}
        title="Mark Gig Completed?"
        message="Please confirm that you have finished the scheduled work for this gig. This notifies the employer to confirm and release compensation."
        confirmText="Confirm Completion"
        cancelText="Not Yet"
        variant="primary"
        loading={isCompleting}
      />
    </div>
  );
};
