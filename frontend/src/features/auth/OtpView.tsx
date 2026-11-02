import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck, Hammer, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';
import { getRoleHomeRoute } from '@/utils/routing';
import type { UserRole } from '@/types/auth';

export const OtpView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as any)?.phone || '';

  const { verifyOtp, sendOtp, pendingIntent, clearPendingIntent } = useAuthStore();
  const { showToast } = useToast();

  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone) {
      navigate('/phone', { replace: true });
      return;
    }

    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [phone, timer, navigate]);

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await sendOtp(phone);
      setTimer(30);
      setCanResend(false);
      showToast({
        title: 'New Code Sent',
        description: `We sent another verification code to ${phone}`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Resend Failed',
        description: err.message || 'Please wait before requesting again',
        type: 'error',
      });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the verification code');
      return;
    }
    setError('');

    setIsLoading(true);
    try {
      const user = await verifyOtp(phone, otp.trim(), name.trim() || undefined, role);
      showToast({
        title: 'Verified Successfully',
        description: `Welcome, ${user.name || 'User'}!`,
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

      navigate(getRoleHomeRoute(user.role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please try again.');
      showToast({
        title: 'Verification Failed',
        description: err.message || 'The code entered is incorrect.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/phone')}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Number</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Verification</span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 border border-border/80">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>

          <h2 className="text-2xl font-black text-text-primary tracking-tight">
            Verify code
          </h2>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            Enter the code sent to <span className="font-semibold text-text-primary">{phone}</span>.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Input
                label="One-Time Password (OTP)"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                error={error}
                maxLength={6}
                className="text-center tracking-widest text-xl font-bold font-mono"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {/* If new user onboarding metadata */}
            <div className="pt-2 border-t border-border/60 space-y-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                If you are new to FixMate:
              </p>
              <Input
                label="Your Name (Optional)"
                placeholder="e.g. Anand Gowda"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Role
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
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Verify & Continue
            </Button>
          </form>

          <div className="mt-6 text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="text-xs font-bold text-primary hover:underline"
              >
                Resend verification code
              </button>
            ) : (
              <span className="text-xs text-text-muted">
                Resend code in <strong className="text-text-secondary">{timer}s</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="w-full max-w-md mx-auto text-center pb-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>FixMate will never call to ask for your verification code</span>
        </div>
      </div>
    </div>
  );
};
