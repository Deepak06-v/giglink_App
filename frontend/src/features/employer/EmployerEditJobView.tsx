import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getJobById, updateJob } from '@/lib/api/jobs';
import {
  jobToFormState,
  jobFormStateToPayload,
  validateStep,
  type JobFormState,
} from '@/lib/jobForm';
import { JOB_CATEGORIES } from '@/constants/jobs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { IndianStatesField } from '@/components/profiles/IndianStatesField';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { useToast } from '@/components/ui/Toast';
import { useLanguageStore } from '@/stores/languageStore';

export const EmployerEditJobView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const t = useLanguageStore((s) => s.t);

  const [form, setForm] = useState<JobFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getJobById(id)
      .then((job) => {
        setForm(jobToFormState(job));
      })
      .catch((err) => {
        showToast({
          title: 'Error',
          description: err.message || 'Could not load gig for editing',
          type: 'error',
        });
        navigate(-1);
      })
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  const updateField = (field: keyof JobFormState, val: string) => {
    if (!form) return;
    setForm({ ...form, [field]: val });
    setErrors([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;

    // Validate essential steps
    const step0 = validateStep(form, 0);
    const step2 = validateStep(form, 2);
    const step4 = validateStep(form, 4);
    const allErrors = [...step0.errors, ...step2.errors, ...step4.errors];

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    setIsSaving(true);
    try {
      const payload = jobFormStateToPayload(form);
      await updateJob(id, payload);
      showToast({
        title: 'Gig Updated',
        description: 'Changes have been saved successfully.',
        type: 'success',
      });
      navigate(`/employer/jobs/${id}`, { replace: true });
    } catch (err: any) {
      showToast({
        title: 'Update Failed',
        description: err.message || 'Could not save changes.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !form) {
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
          Edit Gig
        </span>
      </div>

      {errors.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
          {errors.map((err, i) => (
            <p key={i}>• {err}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card title="Basic Details">
          <div className="space-y-4">
            <Input
              label="Job Title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
            />

            <Select
              label="Category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value as any)}
              options={JOB_CATEGORIES.map((c) => ({
                value: c.value,
                label: t(c.labelKey),
              }))}
              required
            />

            <Textarea
              label="Description"
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              required
            />

            <Input
              label="Workers Needed"
              type="number"
              min="1"
              value={form.workersRequired}
              onChange={(e) => updateField('workersRequired', e.target.value)}
              required
            />
          </div>
        </Card>

        <Card title="Compensation">
          <Input
            label={form.compensationType === 'hourly' ? 'Rate per Hour (₹)' : 'Fixed Total Amount (₹)'}
            type="number"
            value={form.compensationAmount}
            onChange={(e) => updateField('compensationAmount', e.target.value)}
            required
          />
        </Card>

        <Card title="Location">
          <div className="space-y-4">
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                required
              />
              <Input
                label="Pincode"
                value={form.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
                required
              />
            </div>

            <IndianStatesField
              value={form.state}
              onChange={(val) => updateField('state', val)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Update Pin on Map
              </label>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onCoordinatesChange={(lat, lng) => {
                  updateField('latitude', lat);
                  updateField('longitude', lng);
                }}
              />
            </div>
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
          Save Changes
        </Button>
      </form>
    </div>
  );
};
