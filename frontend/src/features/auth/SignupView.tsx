import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Briefcase, Hammer, ArrowRight, ShieldCheck, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';
import { getRoleHomeRoute } from '@/utils/routing';
import type { UserRole } from '@/types/auth';

export const SignupView: React.FC = () => {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [isLoading, setIsLoading] = useState(false);
  const [conflictError, setConflictError] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validate = () => {
    const errs: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setConflictError(false);
    setIsLoading(true);
    try {
      const user = await signup(name.trim(), email.trim(), password, role);
      showToast({
        title: 'Account Created',
        description: `Welcome to FixMate, ${user.name}!`,
        type: 'success',
      });
      navigate(getRoleHomeRoute(user.role), { replace: true });
    } catch (err: any) {
      if (err.isConflict || err.statusCode === 409 || err.message?.includes('already registered')) {
        setConflictError(true);
        showToast({
          title: 'Account Exists',
          description: 'This email is already registered. Please sign in instead.',
          type: 'warning',
        });
      } else {
        showToast({
          title: 'Sign Up Failed',
          description: err.message || 'Unable to create account. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', { state: { email: email.trim() } });
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <Link to="/login" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white text-lg font-black tracking-tight">FM</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight leading-none">FixMate</h1>
            <p className="text-xs text-text-muted mt-0.5">Local Gigs & Tasks</p>
          </div>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 border border-border/80">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              Create Account
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Join FixMate to find work or hire reliable local professionals.
            </p>
          </div>

          {/* Conflict 409 Notice */}
          {conflictError && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Email Already Registered</span>
              </div>
              <p className="text-amber-700 leading-relaxed">
                An account associated with <span className="font-semibold">{email}</span> already exists.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleGoToLogin}
                leftIcon={<LogIn className="w-4 h-4" />}
                className="mt-1"
              >
                Sign In to Existing Account
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                I want to:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => setRole('worker')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                    role === 'worker'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Hammer className="w-4 h-4" />
                  <span>Work & Earn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('employer')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                    role === 'employer'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Hire Workers</span>
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setConflictError(false);
              }}
              error={errors.name}
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setConflictError(false);
              }}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <Input
              label="Create Password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="mt-2"
            >
              Sign Up as {role === 'worker' ? 'Worker' : 'Employer'}
            </Button>
          </form>

          <div className="mt-8 pt-4 border-t border-border text-center">
            <p className="text-xs text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="w-full max-w-md mx-auto text-center pb-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>By signing up, you agree to FixMate's Terms of Service</span>
        </div>
      </div>
    </div>
  );
};
