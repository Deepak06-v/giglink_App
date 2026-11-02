import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Edit3,
  Star,
  Globe,
  LogOut,
  Trash2,
  Phone,
  MapPin,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { getEmployerProfile } from '@/lib/api/profiles';
import type { EmployerProfile } from '@/types/jobs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CompletionRing } from '@/components/ui/CompletionRing';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useToast } from '@/components/ui/Toast';

export const EmployerProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, deleteAccount } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getEmployerProfile()
      .then((data) => setProfile(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    showToast({
      title: 'Signed Out',
      description: 'You have been signed out.',
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
        description: 'Your employer account has been permanently removed.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete account.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const displayName = profile?.companyName || user?.name || 'FixMate Employer';
  const completionPct = profile?.completion?.percentage ?? 70;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Header Card */}
      <Card className="flex flex-col items-center text-center p-6 relative">
        <div className="relative mb-3">
          <ProfileAvatar
            name={displayName}
            imageUrl={profile?.logo}
            size="lg"
          />
          <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs">
            <CompletionRing percentage={completionPct} size={36} strokeWidth={4} />
          </div>
        </div>

        <h2 className="text-xl font-black text-text-primary">{displayName}</h2>
        <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="primary" size="sm">
            Employer Account
          </Badge>
          <Badge variant="success" size="sm">
            Verified Partner
          </Badge>
        </div>

        <div className="w-full mt-5 pt-4 border-t border-border flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employer/profile/edit')}
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

      {/* Completion Banner */}
      {completionPct < 100 && profile?.completion?.missingFields?.length ? (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
          <div className="text-xs text-amber-900 pr-2">
            <span className="font-bold block">Complete your employer profile ({completionPct}%)</span>
            <span className="text-amber-700 mt-0.5 block">
              Missing: {profile.completion.missingFields.slice(0, 3).join(', ')}
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/employer/profile/edit')}
            className="shrink-0"
          >
            Complete
          </Button>
        </div>
      ) : null}

      {/* Company Info */}
      <Card title="Organization Information">
        <div className="space-y-3 text-xs">
          {profile?.phone && (
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Phone
              </span>
              <span className="font-bold text-text-primary">{profile.phone}</span>
            </div>
          )}

          {profile?.city && (
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> City & State
              </span>
              <span className="font-bold text-text-primary">
                {profile.city}, {profile.state}
              </span>
            </div>
          )}

          {profile?.companyDescription && (
            <div className="pt-2">
              <span className="text-text-muted block mb-1">About Company</span>
              <p className="text-text-secondary leading-relaxed bg-bg-primary p-3 rounded-2xl">
                {profile.companyDescription}
              </p>
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
                <span>Reviews & Community Reputation</span>
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
              <span>Language</span>
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
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Account?"
        message="This action is permanent. All posted gigs and applications will be deleted."
        confirmText="Yes, Permanently Delete"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
