import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';

export const PhoneAuthView: React.FC = () => {
  const navigate = useNavigate();
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const { showToast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');

    const fullPhone = `${countryCode}${cleanNumber.slice(-10)}`;

    setIsLoading(true);
    try {
      await sendOtp(fullPhone);
      showToast({
        title: 'OTP Sent',
        description: `Verification code sent to ${fullPhone}`,
        type: 'success',
      });
      navigate('/otp', { state: { phone: fullPhone } });
    } catch (err: any) {
      showToast({
        title: 'Failed to Send OTP',
        description: err.message || 'Please check your phone number and try again.',
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
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Mobile Sign In</span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 border border-border/80">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Phone className="w-6 h-6 text-primary" />
          </div>

          <h2 className="text-2xl font-black text-text-primary tracking-tight">
            Enter your mobile number
          </h2>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            We will send a 6-digit one-time password (OTP) to verify your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-3 py-3 rounded-2xl bg-bg-primary border border-border text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>

                <div className="flex-1">
                  <Input
                    type="tel"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    error={error}
                    maxLength={14}
                  />
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
              Send OTP
            </Button>
          </form>

          <div className="mt-8 pt-4 border-t border-border text-center">
            <p className="text-xs text-text-secondary">
              Prefer password login?{' '}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Sign In with Email
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="w-full max-w-md mx-auto text-center pb-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Standard SMS carrier rates may apply</span>
        </div>
      </div>
    </div>
  );
};
