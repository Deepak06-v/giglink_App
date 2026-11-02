import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, RefreshCw, MapPin, X } from 'lucide-react';
import { getJobs } from '@/lib/api/jobs';
import type { Job, JobCategory, JobSortOption } from '@/types/jobs';
import { JOB_CATEGORIES, JOB_SORT_OPTIONS } from '@/constants/jobs';
import { JobCard } from '@/components/cards/JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useLanguageStore } from '@/stores/languageStore';

export const JobBrowseView: React.FC = () => {
  const navigate = useNavigate();
  const t = useLanguageStore((s) => s.t);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | ''>('');
  const [selectedSort, setSelectedSort] = useState<JobSortOption>('newest');
  const [cityFilter, setCityFilter] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const fetchJobs = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const response = await getJobs({
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        sortBy: selectedSort,
        city: cityFilter || undefined,
        limit: 30,
      });
      setJobs(response.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, selectedCategory, selectedSort, cityFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedSort('newest');
    setCityFilter('');
    setSearchTerm('');
    setIsFilterSheetOpen(false);
  };

  const hasActiveFilters = Boolean(selectedCategory || cityFilter || selectedSort !== 'newest');

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Search & Filter Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Explore Gigs</h1>
            <p className="text-xs text-text-secondary mt-0.5">Find flexible local opportunities near you</p>
          </div>

          <button
            onClick={() => fetchJobs(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-all active:scale-95 shadow-xs"
            aria-label="Refresh jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        {/* Search input with filter trigger */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by role, skills, keywords..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-xs shadow-xs transition-all ${
              hasActiveFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-primary border-border hover:bg-bg-secondary'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
        </div>

        {/* Category Horizontal Scroll Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === ''
                ? 'bg-text-primary text-white shadow-xs'
                : 'bg-white border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            All Gigs
          </button>
          {JOB_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value === selectedCategory ? '' : cat.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? 'bg-primary text-white shadow-xs shadow-primary/25'
                  : 'bg-white border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonJobCard />
          <SkeletonJobCard />
          <SkeletonJobCard />
          <SkeletonJobCard />
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
            hasActiveFilters || searchTerm
              ? "Try adjusting your search terms or clearing your filters."
              : "There are currently no active gigs posted. Check back soon!"
          }
          actionLabel={hasActiveFilters ? "Reset Filters" : "Refresh"}
          onAction={hasActiveFilters ? handleResetFilters : () => fetchJobs(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job._id || job.id}
              job={job}
              onClick={() => navigate(`/jobs/${job._id || job.id}`)}
            />
          ))}
        </div>
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter & Sort Gigs"
      >
        <div className="space-y-5 pt-2">
          {/* Sort By */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
              Sort By
            </label>
            <div className="grid grid-cols-2 gap-2">
              {JOB_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedSort(opt.value)}
                  className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all ${
                    selectedSort === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* City / Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
              Location / City
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="e.g. Bengaluru, Mysuru"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg-primary border border-border text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={handleResetFilters}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setIsFilterSheetOpen(false);
                fetchJobs();
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
