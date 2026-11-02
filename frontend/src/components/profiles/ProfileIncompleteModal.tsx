import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { CompletionRing } from '../ui/CompletionRing';
import { Button } from '../ui/Button';
import { useAuthStore } from '@/stores/authStore';

interface ProfileIncompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  completionPercentage?: number;
  missingFields?: string[];
  title?: string;
  description?: string;
}

export const ProfileIncompleteModal: React.FC<ProfileIncompleteModalProps> = ({
  isOpen,
  onClose,
  completionPercentage = 40,
  missingFields = ['Full Name', 'Phone Number', 'City / Location', 'Primary Skills'],
  title = 'Complete Your Profile',
  description = 'To apply for jobs and connect with employers, you need to complete the essential sections of your profile.',
}) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  if (!isOpen) return null;

  const handleEditProfile = () => {
    onClose();
    if (user?.role === 'employer') {
      navigate('/employer/profile/edit');
    } else {
      navigate('/worker/profile/edit');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-text-muted hover:bg-bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <CompletionRing
              percentage={completionPercentage}
              size={88}
              strokeWidth={8}
            />
          </div>

          <h3 className="text-xl font-bold text-text-primary tracking-tight">{title}</h3>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {description}
          </p>

          {missingFields.length > 0 && (
            <div className="w-full mt-5 bg-bg-primary rounded-2xl p-4 text-left">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                Recommended to add:
              </span>
              <ul className="space-y-2">
                {missingFields.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-xs font-medium text-text-primary">
                    <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="w-full flex flex-col gap-2.5 mt-6">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleEditProfile}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Profile Now
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
