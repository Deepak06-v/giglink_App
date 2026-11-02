import React, { useState, useEffect, useCallback } from 'react';
import { getMyApplications } from '@/lib/api/applications';
import type { Application } from '@/types/jobs';
import { APPLICATION_STATUS_FILTERS } from '@/constants/jobs';
import { ApplicationCard } from '@/components/cards/ApplicationCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';

export const WorkerApplicationsView: React.FC = () => {
  const navigate = useNavigate();
  const t = useLanguageStore((s) => s.t);

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const statusParam = selectedStatus === 'ALL' ? undefined : (selectedStatus as any);
      const res = await getMyApplications(statusParam);
      setApplications((res as any).applications || (res as any).items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">My Applications</h1>
          <p className="text-xs text-text-secondary mt-0.5">Track your submitted gig proposals and status</p>
        </div>

        <button
          onClick={() => fetchApplications(true)}
          disabled={isLoading || isRefreshing}
          className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-all active:scale-95 shadow-xs"
          aria-label="Refresh applications"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Status Segmented Control Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {APPLICATION_STATUS_FILTERS.map((filt) => (
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
          title="Could not load applications"
          message={error}
          onRetry={() => fetchApplications()}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description={
            selectedStatus === 'ALL'
              ? "You haven't applied for any gigs yet. Explore open gigs in your area to get started!"
              : `No applications with status "${selectedStatus}".`
          }
          actionLabel="Explore Open Gigs"
          onAction={() => navigate('/worker/jobs')}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app._id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
};
