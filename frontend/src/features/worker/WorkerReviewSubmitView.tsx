import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getAssignmentById } from '@/lib/api/assignments';
import { submitWorkerReview, getWorkerReviewStatus } from '@/lib/api/reviews';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/ui/Toast';

export const WorkerReviewSubmitView: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [jobId, setJobId] = useState<string | null>(null);
  const [employerName, setEmployerName] = useState<string>('Employer');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    setIsLoading(true);

    getAssignmentById(assignmentId)
      .then(async ({ assignment }) => {
        const jId = (assignment.job as any)._id || (assignment.job as any).id;
        setJobId(jId);
        const emp = assignment.job.employer;
        setEmployerName(typeof emp === 'object' && emp && emp.name ? emp.name : 'Employer');

        try {
          const status = await getWorkerReviewStatus(jId);
          setAlreadyReviewed(status.hasReviewed);
        } catch {
          // If review status check fails, allow user to submit
        }
      })
      .catch((err) => {
        // If not an assignment id, try treating assignmentId as jobId directly
        setJobId(assignmentId);
        getWorkerReviewStatus(assignmentId)
          .then((status) => setAlreadyReviewed(status.hasReviewed))
          .catch(() => {})
          .finally(() => setIsLoading(false));
      })
      .finally(() => setIsLoading(false));
  }, [assignmentId]);

  const handleSubmit = async (rating: number, comment: string) => {
    if (!jobId) return;
    await submitWorkerReview(jobId, { rating, comment });
    showToast({
      title: 'Review Submitted',
      description: 'Thank you for rating your experience with this employer!',
      type: 'success',
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-20 md:pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Leave Review
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-4 pt-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load Review"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <ReviewComposer
          title="Rate Employer"
          subtitle="Your honest review helps keep the FixMate community trustworthy and safe."
          targetName={employerName}
          alreadyReviewed={alreadyReviewed}
          onSubmit={handleSubmit}
          onDone={() => navigate('/worker/assignments')}
        />
      )}
    </div>
  );
};
