import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getEmployerReviewStatus, submitEmployerReview } from '@/lib/api/reviews';
import { getJobById } from '@/lib/api/jobs';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export const EmployerReviewSubmitView: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [workers, setWorkers] = useState<Array<{ workerId: string; hasReviewed: boolean; name?: string }>>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setIsLoading(true);

    Promise.all([
      getJobById(jobId).catch(() => null),
      getEmployerReviewStatus(jobId).catch(() => null),
    ])
      .then(([job, status]) => {
        if (job) setJobTitle(job.title);
        if (status?.workers && status.workers.length > 0) {
          setWorkers(status.workers);
          // Pick the first unreviewed worker by default
          const firstUnreviewed = status.workers.find((w) => !w.hasReviewed);
          setSelectedWorkerId(firstUnreviewed?.workerId || status.workers[0].workerId);
        }
      })
      .finally(() => setIsLoading(false));
  }, [jobId]);

  const handleSubmit = async (rating: number, comment: string) => {
    if (!jobId || !selectedWorkerId) return;
    await submitEmployerReview(jobId, selectedWorkerId, { rating, comment });
    showToast({
      title: 'Review Submitted',
      description: 'Your rating and feedback have been recorded.',
      type: 'success',
    });

    // Mark worker as reviewed locally
    setWorkers((prev) =>
      prev.map((w) => (w.workerId === selectedWorkerId ? { ...w, hasReviewed: true } : w))
    );
  };

  const currentWorker = workers.find((w) => w.workerId === selectedWorkerId);

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
          Review Workers
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-4 pt-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
      ) : workers.length === 0 ? (
        <Card className="text-center py-8">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-text-primary">No workers pending review</p>
          <p className="text-xs text-text-muted mt-1">
            Either no workers were assigned or reviews have already been submitted.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Worker Picker if multiple */}
          {workers.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {workers.map((w, idx) => (
                <button
                  key={w.workerId}
                  onClick={() => setSelectedWorkerId(w.workerId)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedWorkerId === w.workerId
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white border border-border text-text-secondary'
                  }`}
                >
                  Worker #{idx + 1} {w.hasReviewed ? '✓' : ''}
                </button>
              ))}
            </div>
          )}

          {currentWorker && (
            <ReviewComposer
              title="Rate Worker"
              subtitle={`For gig: ${jobTitle}`}
              targetName={currentWorker.name || 'Assigned Worker'}
              alreadyReviewed={currentWorker.hasReviewed}
              onSubmit={handleSubmit}
              onDone={() => navigate(`/employer/jobs/${jobId}`)}
            />
          )}
        </div>
      )}
    </div>
  );
};
