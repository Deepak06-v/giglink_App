import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getEmployerProfile, updateEmployerProfile } from '@/lib/api/profiles';
import type { EmployerProfile } from '@/types/jobs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ImagePickerField } from '@/components/ui/ImagePickerField';
import { IndianStatesField } from '@/components/profiles/IndianStatesField';
import { useToast } from '@/components/ui/Toast';

export const EmployerEditProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [logo, setLogo] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [companyDescription, setCompanyDescription] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('Karnataka');
  const [pincode, setPincode] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    getEmployerProfile()
      .then((p) => {
        if (p) {
          setLogo(p.logo || '');
          setCompanyName(p.companyName || '');
          setCompanyDescription(p.companyDescription || '');
          setPhone(p.phone || '');
          setAddress(p.address || '');
          setCity(p.city || '');
          setState(p.state || 'Karnataka');
          setPincode(p.pincode || '');
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateEmployerProfile({
        logo: logo || undefined,
        companyName: companyName.trim() || undefined,
        companyDescription: companyDescription.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });

      showToast({
        title: 'Profile Saved',
        description: 'Employer details have been updated.',
        type: 'success',
      });
      navigate('/employer/profile', { replace: true });
    } catch (err: any) {
      showToast({
        title: 'Save Failed',
        description: err.message || 'Unable to update profile.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-4">
        <Skeleton className="h-8 w-1/3 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Edit Employer Profile
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card title="Organization Logo">
          <ImagePickerField
            label="Upload company logo"
            assetType="employer_logo"
            value={logo}
            onChange={(url) => setLogo(url)}
          />
        </Card>

        <Card title="Company Information">
          <div className="space-y-4">
            <Input
              label="Business or Company Name"
              placeholder="e.g. BlueStar Event Services"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <Input
              label="Contact Phone"
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Textarea
              label="Company Overview"
              placeholder="Tell workers about your business, projects, payment reliability, etc."
              rows={4}
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Office / Business Location">
          <div className="space-y-4">
            <Input
              label="Address"
              placeholder="Street or building address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                placeholder="e.g. Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="Pincode"
                placeholder="560001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
              />
            </div>

            <IndianStatesField
              value={state}
              onChange={(val) => setState(val)}
            />
          </div>
        </Card>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Employer Profile
        </Button>
      </form>
    </div>
  );
};
