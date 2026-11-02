import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Briefcase, Users, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { getEmployerJobs } from '@/lib/api/jobs';
import type { Job } from '@/types/jobs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmployerJobCard } from '@/components/cards/EmployerJobCard';
import { useAuthStore } from '@/stores/authStore';

export const EmployerDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getEmployerJobs({ limit: 10 })
      .then((res) => {
        setJobs(res.items || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const totalPosted = jobs.length;
  const activeGigs = jobs.filter((j) => j.status === 'OPEN' || j.status === 'IN_PROGRESS' || j.status === 'FILLED').length;
  const completedGigs = jobs.filter((j) => j.status === 'COMPLETED').length;
  const draftGigs = jobs.filter((j) => j.status === 'DRAFT').length;

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">
            Employer Dashboard
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Welcome back, {user?.name || 'Partner'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/employer/jobs/create')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Post a Gig
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-border shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-black text-text-primary block">{totalPosted}</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Total Posted
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-border shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-600 block">{activeGigs}</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Active Gigs
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-border shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-blue-600 block">{completedGigs}</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Completed
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-border shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600 block">{draftGigs}</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Drafts
          </span>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="p-5 rounded-3xl bg-linear-to-r from-primary to-primary-dark text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-primary/20">
        <div>
          <h3 className="text-lg font-black tracking-tight">Need help on a new project?</h3>
          <p className="text-xs text-white/80 mt-1 max-w-md">
            Create a gig posting in under 2 minutes. Reach verified local workers ready for immediate deployment.
          </p>
        </div>
        <Button
          variant="accent"
          size="md"
          onClick={() => navigate('/employer/jobs/create')}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          Create New Gig
        </Button>
      </div>

      {/* Recent Gigs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Your Recent Gigs
          </h2>
          <Link
            to="/employer/jobs"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-8">
            <Briefcase className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-text-primary">No gigs posted yet</p>
            <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
              Start by publishing your first job listing to connect with available local workers.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/employer/jobs/create')}
              className="mt-4"
            >
              Post First Gig
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 3).map((job) => (
              <EmployerJobCard key={job._id || (job as any).id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
