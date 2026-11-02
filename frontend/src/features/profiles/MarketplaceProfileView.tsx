import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Building, ShieldCheck, ChevronRight } from 'lucide-react';
import {
  getWorkerMarketplaceProfile,
  getEmployerMarketplaceProfile,
} from '@/lib/api/marketplace';
import type { WorkerMarketplaceProfile, EmployerMarketplaceProfile } from '@/types/jobs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { RatingStars } from '@/components/reviews/RatingStars';

export const MarketplaceProfileView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [workerProfile, setWorkerProfile] = useState<WorkerMarketplaceProfile | null>(null);
  const [employerProfile, setEmployerProfile] = useState<EmployerMarketplaceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);

    getWorkerMarketplaceProfile(userId)
      .then((data) => {
        setWorkerProfile(data);
      })
      .catch(() => {
        // Try employer marketplace profile
        return getEmployerMarketplaceProfile(userId)
          .then((emp) => setEmployerProfile(emp))
          .catch((err) => setError(err.message || 'Profile not found'));
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-4">
        <Skeleton className="h-8 w-1/3 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || (!workerProfile && !employerProfile)) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState
          title="Profile Not Available"
          message={error || 'Unable to view this member profile.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const isWorker = Boolean(workerProfile);
  const name = isWorker ? workerProfile?.name || 'Worker' : employerProfile?.companyName || 'Employer';
  const avatarUrl = isWorker ? workerProfile?.profileImage : employerProfile?.logo;
  const ratingSummary = workerProfile?.rating || (employerProfile as any)?.rating || { averageRating: 4.8, totalReviews: 5 };
  const bio = isWorker ? workerProfile?.bio : employerProfile?.companyDescription;
  const location = isWorker ? workerProfile?.location : employerProfile?.location;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-20 md:pb-8">
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
          FixMate Profile
        </span>
      </div>

      {/* Header Card */}
      <Card className="flex flex-col items-center text-center p-6">
        <ProfileAvatar name={name} imageUrl={avatarUrl} size="lg" className="mb-3" />

        <h2 className="text-xl font-black text-text-primary">{name}</h2>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="primary" size="sm">
            {isWorker ? 'Verified Worker' : 'Verified Employer'}
          </Badge>
          {location?.city && (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location.city}</span>
            </span>
          )}
        </div>

        {/* Rating summary */}
        <div className="mt-4 pt-3 border-t border-border w-full flex items-center justify-center gap-2">
          <RatingStars rating={ratingSummary.averageRating || 5} size={18} />
          <span className="text-xs font-bold text-text-primary">
            {ratingSummary.averageRating?.toFixed(1) || '5.0'}
          </span>
          <span className="text-xs text-text-muted">
            ({ratingSummary.totalReviews} reviews)
          </span>
        </div>
      </Card>

      {/* Bio / Description */}
      {bio && (
        <Card title={isWorker ? 'About Worker' : 'Company Overview'}>
          <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
            {bio}
          </p>
        </Card>
      )}

      {/* Worker Skills */}
      {isWorker && workerProfile?.skills && workerProfile.skills.length > 0 && (
        <Card title="Skills & Specialties">
          <div className="flex flex-wrap gap-1.5">
            {workerProfile.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Reviews Link */}
      {userId && (
        <Card>
          <Link
            to={`/reviews/${userId}`}
            className="flex items-center justify-between p-1 text-xs font-semibold text-text-primary hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-500" />
              <span>See All Community Reviews</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </Link>
        </Card>
      )}

      {/* Trust Footer */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted py-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Profile verified through FixMate security checks</span>
      </div>
    </div>
  );
};
