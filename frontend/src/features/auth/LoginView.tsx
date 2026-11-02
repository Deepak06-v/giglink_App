import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, Phone, ArrowRight, ShieldCheck, Globe, Hammer, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useToast } from '@/components/ui/Toast';
import { getRoleHomeRoute } from '@/utils/routing';
import type { UserRole } from '@/types/auth';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsGuest, pendingIntent, clearPendingIntent } = useAuthStore();
  const { language, setLanguage, t } = useLanguageStore();
  const { showToast } = useToast();

  const prefillEmail = (location.state as any)?.email || '';
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password, role);
      showToast({
        title: 'Welcome back!',
        description: `Signed in as ${user.name || user.email}`,
        type: 'success',
      });

      if (pendingIntent) {
        const intent = pendingIntent;
        clearPendingIntent();
        if ('action' in intent && intent.action === 'apply') {
          navigate(`/jobs/${intent.jobId}`);
          return;
        }
      }

      const redirectPath = (location.state as any)?.from || getRoleHomeRoute(user.role);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      showToast({
        title: 'Sign In Failed',
        description: err.message || 'Invalid email or password. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate('/browse');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white text-lg font-black tracking-tight">FM</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight leading-none">FixMate</h1>
            <p className="text-xs text-text-muted mt-0.5">Local Gigs & Tasks</p>
          </div>
        </div>

        {/* Language Pill */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary shadow-xs transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 border border-border/80">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              {t('auth.welcomeBack')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Sign in to manage gigs, applications, and connect locally.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Signing in as:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => setRole('worker')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    role === 'worker'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Worker</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('employer')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    role === 'employer'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Employer</span>
                </button>
              </div>
            </div>

            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('auth.login')}
            </Button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-white px-3 text-xs font-semibold uppercase text-text-muted tracking-wider">
              or continue with
            </span>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => navigate('/phone')}
              leftIcon={<Phone className="w-4 h-4 text-primary" />}
            >
              Sign In with Mobile OTP
            </Button>

            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={handleGuest}
              className="text-text-secondary hover:text-text-primary"
            >
              Browse Jobs as Guest
            </Button>
          </div>

          <div className="mt-8 pt-4 border-t border-border text-center">
            <p className="text-xs text-text-secondary">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="w-full max-w-md mx-auto text-center pb-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secure marketplace with verified profiles</span>
        </div>
      </div>
    </div>
  );
};
