import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { getEmployerJobs } from '@/lib/api/jobs';
import type { Job } from '@/types/jobs';
import { EMPLOYER_JOB_STATUS_FILTERS } from '@/constants/jobs';
import { EmployerJobCard } from '@/components/cards/EmployerJobCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useLanguageStore } from '@/stores/languageStore';

export const EmployerJobsView: React.FC = () => {
  const navigate = useNavigate();
  const t = useLanguageStore((s) => s.t);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const statusParam = selectedStatus === 'ALL' ? undefined : (selectedStatus as any);
      const res = await getEmployerJobs({
        status: statusParam,
        limit: 50,
      });
      setJobs(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your gigs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Manage Gigs</h1>
          <p className="text-xs text-text-secondary mt-0.5">Track, edit, and review your posted jobs</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchJobs(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-all active:scale-95 shadow-xs"
            aria-label="Refresh jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/employer/jobs/create')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post Gig
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {EMPLOYER_JOB_STATUS_FILTERS.map((filt) => (
          <button
            key={filt.value}
            onClick={() => setSelectedStatus(filt.value)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedStatus === filt.value
                ? 'bg-primary text-white shadow-xs shadow-primary/25'
                : 'bg-white border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(filt.labelKey)}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load jobs"
          message={error}
          onRetry={() => fetchJobs()}
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No gigs found"
          description={
            selectedStatus === 'ALL'
              ? "You haven't posted any gigs yet. Tap below to create your first gig listing."
              : `You have no gigs with status "${selectedStatus}".`
          }
          actionLabel="Create New Gig"
          onAction={() => navigate('/employer/jobs/create')}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <EmployerJobCard key={job._id || (job as any).id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
};
