import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save } from 'lucide-react';
import { getWorkerProfile, updateWorkerProfile } from '@/lib/api/profiles';
import type { WorkerProfile } from '@/types/jobs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ImagePickerField } from '@/components/ui/ImagePickerField';
import { IndianStatesField } from '@/components/profiles/IndianStatesField';
import { useToast } from '@/components/ui/Toast';

export const WorkerEditProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [profileImage, setProfileImage] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('Karnataka');
  const [pincode, setPincode] = useState<string>('');
  const [availability, setAvailability] = useState<'AVAILABLE' | 'UNAVAILABLE'>('AVAILABLE');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    getWorkerProfile()
      .then((p) => {
        if (p) {
          setProfileImage(p.profileImage || '');
          setPhone(p.phone || '');
          setBio(p.bio || '');
          setCity(p.location?.city || '');
          setState(p.location?.state || 'Karnataka');
          setPincode(p.location?.pincode || '');
          setAvailability(p.availability || 'AVAILABLE');
          setSkills(p.skills || []);
        }
      })
      .catch(() => {
        showToast({
          title: 'Notice',
          description: 'Could not load existing profile. You can create one now.',
          type: 'info',
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (idx: number) => {
    setSkills(skills.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateWorkerProfile({
        profileImage: profileImage || undefined,
        phone: phone || undefined,
        bio: bio || undefined,
        location: {
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
        },
        availability,
        skills,
      });

      showToast({
        title: 'Profile Updated',
        description: 'Your worker profile details have been saved.',
        type: 'success',
      });
      navigate('/worker/profile', { replace: true });
    } catch (err: any) {
      showToast({
        title: 'Save Failed',
        description: err.message || 'Unable to update profile. Please try again.',
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
        <Skeleton className="h-48 w-full rounded-3xl" />
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
          Edit Profile
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar Upload */}
        <Card title="Profile Photo">
          <ImagePickerField
            label="Upload photo"
            value={profileImage}
            onChange={(url) => setProfileImage(url)}
          />
        </Card>

        {/* Basic Details */}
        <Card title="Contact & Bio">
          <div className="space-y-4">
            <Input
              label="Contact Phone"
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Textarea
              label="Bio / Summary"
              placeholder="Describe your background, years of trade experience, special tools you own, or general availability..."
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Work Status
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => setAvailability('AVAILABLE')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    availability === 'AVAILABLE'
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  ● Ready for Gigs
                </button>
                <button
                  type="button"
                  onClick={() => setAvailability('UNAVAILABLE')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    availability === 'UNAVAILABLE'
                      ? 'bg-white text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Busy / Unavailable
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Skills Tag Manager */}
        <Card title="Skills & Trades">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add skill (e.g. Carpentry, Tile Fixing)"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleAddSkill}
                leftIcon={<Plus className="w-4 h-4" />}
                className="shrink-0"
              >
                Add
              </Button>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">No skills added yet.</p>
            )}
          </div>
        </Card>

        {/* Location Card */}
        <Card title="Location Details">
          <div className="space-y-4">
            <Input
              label="City / Town"
              placeholder="e.g. Bengaluru"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <IndianStatesField
              value={state}
              onChange={(val) => setState(val)}
            />

            <Input
              label="Postal Code (Pincode)"
              placeholder="e.g. 560001"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              maxLength={6}
            />
          </div>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Profile Changes
        </Button>
      </form>
    </div>
  );
};
