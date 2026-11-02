import React, { useState, useEffect, useCallback } from 'react';
import { getAssignments } from '@/lib/api/assignments';
import type { Assignment } from '@/types/jobs';
import { ASSIGNMENT_STATUS_FILTERS } from '@/constants/jobs';
import { getAssignmentBucket } from '@/utils/formatJob';
import { AssignmentCard } from '@/components/cards/AssignmentCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';

export const WorkerAssignmentsView: React.FC = () => {
  const navigate = useNavigate();
  const t = useLanguageStore((s) => s.t);

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'ACTIVE' | 'COMPLETED'>('UPCOMING');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await getAssignments(1, 50);
      setAllAssignments(res.assignments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = allAssignments.filter((assignment) => {
    const bucket = getAssignmentBucket(assignment);
    return bucket === activeTab;
  });

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Assignments</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage your active and completed gig jobs</p>
        </div>

        <button
          onClick={() => fetchAssignments(true)}
          disabled={isLoading || isRefreshing}
          className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-all active:scale-95 shadow-xs"
          aria-label="Refresh assignments"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {ASSIGNMENT_STATUS_FILTERS.map((filt) => (
          <button
            key={filt.value}
            onClick={() => setActiveTab(filt.value as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === filt.value
                ? 'bg-primary text-white shadow-xs shadow-primary/25'
                : 'bg-white border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(filt.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load assignments"
          message={error}
          onRetry={() => fetchAssignments()}
        />
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} assignments`}
          description={
            activeTab === 'UPCOMING'
              ? 'When an employer accepts your gig application, your assignment will appear here.'
              : `You have no ${activeTab.toLowerCase()} assignments right now.`
          }
          actionLabel="Find More Gigs"
          onAction={() => navigate('/worker/jobs')}
        />
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard key={assignment._id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
};
