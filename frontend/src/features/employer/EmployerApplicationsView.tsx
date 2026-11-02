import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getEmployerAllApplications } from '@/lib/api/applications';
import type { Application, ApplicationStatus } from '@/types/jobs';
import { APPLICATION_STATUS_FILTERS } from '@/constants/jobs';
import { EmployerApplicationCard } from '@/components/cards/EmployerApplicationCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useLanguageStore } from '@/stores/languageStore';

export const EmployerApplicationsView: React.FC = () => {
  const t = useLanguageStore((s) => s.t);

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const statusParam = selectedStatus === 'ALL' ? undefined : (selectedStatus as ApplicationStatus);
      const res = await getEmployerAllApplications(1, 50, statusParam);
      setApplications(res.applications || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load received applications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Applications</h1>
          <p className="text-xs text-text-secondary mt-0.5">Review candidates who applied for your gigs</p>
        </div>

        <button
          onClick={() => fetchApps(true)}
          disabled={isLoading || isRefreshing}
          className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-all active:scale-95 shadow-xs"
          aria-label="Refresh applications"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
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
          onRetry={() => fetchApps()}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description={
            selectedStatus === 'ALL'
              ? 'When workers apply to your posted gigs, their profiles will appear here for review.'
              : `No applications with status "${selectedStatus}".`
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <EmployerApplicationCard key={app._id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
};
