import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Edit3,
  Star,
  Globe,
  LogOut,
  Trash2,
  Phone,
  MapPin,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { getWorkerProfile } from '@/lib/api/profiles';
import type { WorkerProfile } from '@/types/jobs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CompletionRing } from '@/components/ui/CompletionRing';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useToast } from '@/components/ui/Toast';

export const WorkerProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, deleteAccount } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getWorkerProfile()
      .then((data) => setProfile(data))
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    showToast({
      title: 'Signed Out',
      description: 'You have been logged out of FixMate.',
      type: 'info',
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
      showToast({
        title: 'Account Deleted',
        description: 'Your account and data have been removed.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete account. Contact support.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const completionPct = profile?.completion?.percentage ?? (user?.profileCompletion ?? 60);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Profile Header Card */}
      <Card className="flex flex-col items-center text-center p-6 relative">
        <div className="relative mb-3">
          <ProfileAvatar
            name={user?.name || 'Worker'}
            imageUrl={profile?.profileImage}
            size="lg"
          />
          <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs">
            <CompletionRing percentage={completionPct} size={36} strokeWidth={4} />
          </div>
        </div>

        <h2 className="text-xl font-black text-text-primary">{user?.name || 'Worker'}</h2>
        <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="primary" size="sm">
            Worker Profile
          </Badge>
          <Badge
            variant={profile?.availability === 'UNAVAILABLE' ? 'neutral' : 'success'}
            size="sm"
          >
            {profile?.availability === 'UNAVAILABLE' ? 'Unavailable' : 'Available for Work'}
          </Badge>
        </div>

        <div className="w-full mt-5 pt-4 border-t border-border flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/worker/profile/edit')}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Edit Profile
          </Button>

          {user?.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/profile/${user.id}`)}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Public View
            </Button>
          )}
        </div>
      </Card>

      {/* Completion status note */}
      {completionPct < 100 && profile?.completion?.missingFields?.length ? (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
          <div className="text-xs text-amber-900 pr-2">
            <span className="font-bold block">Complete your profile ({completionPct}%)</span>
            <span className="text-amber-700 mt-0.5 block">
              Missing: {profile.completion.missingFields.slice(0, 3).join(', ')}
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/worker/profile/edit')}
            className="shrink-0"
          >
            Complete
          </Button>
        </div>
      ) : null}

      {/* Profile Details Card */}
      <Card title="Worker Information">
        <div className="space-y-3 text-xs">
          {profile?.phone && (
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Phone
              </span>
              <span className="font-bold text-text-primary">{profile.phone}</span>
            </div>
          )}

          {profile?.location?.city && (
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Location
              </span>
              <span className="font-bold text-text-primary">
                {profile.location.city}, {profile.location.state}
              </span>
            </div>
          )}

          {profile?.bio && (
            <div className="pt-2">
              <span className="text-text-muted block mb-1">About Me</span>
              <p className="text-text-secondary leading-relaxed bg-bg-primary p-3 rounded-2xl">
                {profile.bio}
              </p>
            </div>
          )}

          {profile?.skills && profile.skills.length > 0 && (
            <div className="pt-2">
              <span className="text-text-muted block mb-1.5">Primary Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Settings & Links */}
      <Card>
        <div className="divide-y divide-border">
          {user?.id && (
            <Link
              to={`/reviews/${user.id}`}
              className="flex items-center justify-between py-3.5 text-xs font-semibold text-text-primary hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-500" />
                <span>My Reviews & Ratings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </Link>
          )}

          <button
            onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
            className="w-full flex items-center justify-between py-3.5 text-xs font-semibold text-text-primary hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-primary" />
              <span>App Language</span>
            </div>
            <span className="text-xs text-text-muted font-bold">
              {language === 'en' ? 'English (ಕನ್ನಡ)' : 'ಕನ್ನಡ (English)'}
            </span>
          </button>

          <button
            onClick={() => setIsLogoutOpen(true)}
            className="w-full flex items-center justify-between py-3.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </Card>

      {/* Danger Zone */}
      <div className="text-center pt-2">
        <button
          onClick={() => setIsDeleteOpen(true)}
          className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline inline-flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete FixMate Account</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your account on this device?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Account?"
        message="This action is irreversible. All your profile data, applications, and reviews will be permanently deleted."
        confirmText="Yes, Permanently Delete"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
