import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, Sparkles } from 'lucide-react';
import { createJob, publishJob } from '@/lib/api/jobs';
import {
  emptyJobFormState,
  jobFormStateToPayload,
  validateStep,
  getSchedulePreview,
  type JobFormState,
} from '@/lib/jobForm';
import { JOB_CATEGORIES } from '@/constants/jobs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { IndianStatesField } from '@/components/profiles/IndianStatesField';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { ProfileIncompleteModal } from '@/components/profiles/ProfileIncompleteModal';
import { useToast } from '@/components/ui/Toast';
import { useLanguageStore } from '@/stores/languageStore';

const STEP_TITLES = ['Basic Info', 'Schedule', 'Pay', 'Requirements', 'Location'];

export const EmployerCreateJobView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const t = useLanguageStore((s) => s.t);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<JobFormState>(() => {
    const s = emptyJobFormState();
    s.state = 'Karnataka';
    return s;
  });
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  const updateField = (field: keyof JobFormState, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setStepErrors([]);
  };

  const handleNext = () => {
    const validation = validateStep(form, step);
    if (!validation.valid) {
      setStepErrors(validation.errors);
      return;
    }
    setStepErrors([]);
    setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1));
  };

  const handleBack = () => {
    setStepErrors([]);
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    const validation = validateStep(form, 4);
    if (!validation.valid) {
      setStepErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = jobFormStateToPayload(form);
      const created = await createJob(payload);

      if (publishImmediately) {
        try {
          await publishJob(created._id || (created as any).id);
          showToast({
            title: 'Gig Published!',
            description: 'Your job is now live and accepting worker applications.',
            type: 'success',
          });
        } catch (pubErr: any) {
          if (pubErr.isProfileIncomplete || pubErr.code === 'PROFILE_INCOMPLETE') {
            setShowIncompleteModal(true);
            return;
          }
          throw pubErr;
        }
      } else {
        showToast({
          title: 'Draft Saved',
          description: 'Your gig has been saved as a draft.',
          type: 'info',
        });
      }

      navigate(`/employer/jobs/${created._id || (created as any).id}`, { replace: true });
    } catch (err: any) {
      if (err.isProfileIncomplete || err.code === 'PROFILE_INCOMPLETE') {
        setShowIncompleteModal(true);
      } else {
        showToast({
          title: 'Failed to Create Gig',
          description: err.message || 'Please verify the fields and try again.',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const schedulePreview = getSchedulePreview(form);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Top Bar with Stepper */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 0 ? 'Cancel' : 'Back'}</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
          </span>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-5 gap-1.5">
          {STEP_TITLES.map((title, idx) => (
            <div
              key={title}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Errors banner if any */}
      {stepErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1 animate-in fade-in">
          {stepErrors.map((err, i) => (
            <p key={i}>• {err}</p>
          ))}
        </div>
      )}

      {/* STEP 0: Basic Info */}
      {step === 0 && (
        <Card title="Gig Basics">
          <div className="space-y-4">
            <Input
              label="Job Title"
              placeholder="e.g. Catering Helper for Wedding"
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
              placeholder="Select job category"
              required
            />

            <Textarea
              label="Detailed Description"
              placeholder="Explain the work required, specific tools provided or needed, expectations, breaks, etc."
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Workers Needed"
                type="number"
                min="1"
                placeholder="1"
                value={form.workersRequired}
                onChange={(e) => updateField('workersRequired', e.target.value)}
                required
              />

              <Input
                label="Hiring Deadline (Optional)"
                type="date"
                value={form.hiringDeadline}
                onChange={(e) => updateField('hiringDeadline', e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* STEP 1: Schedule */}
      {step === 1 && (
        <Card title="Date & Timing">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={form.scheduleStartDate}
                onChange={(e) => updateField('scheduleStartDate', e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={form.scheduleEndDate}
                onChange={(e) => updateField('scheduleEndDate', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Daily Start Time"
                type="time"
                value={form.scheduleStartTime}
                onChange={(e) => updateField('scheduleStartTime', e.target.value)}
                required
              />
              <Input
                label="Daily End Time"
                type="time"
                value={form.scheduleEndTime}
                onChange={(e) => updateField('scheduleEndTime', e.target.value)}
                required
              />
            </div>

            {schedulePreview && (
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 text-xs">
                <span className="font-bold text-primary block mb-1">Schedule Summary</span>
                <div className="flex justify-between text-text-secondary">
                  <span>Duration: {schedulePreview.numberOfDays} day(s)</span>
                  <span>{schedulePreview.hoursPerDay} hrs/day</span>
                  <span className="font-bold text-text-primary">
                    Total: {schedulePreview.totalHours} hrs
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* STEP 2: Compensation */}
      {step === 2 && (
        <Card title="Compensation Rate">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Rate Structure
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => updateField('compensationType', 'hourly')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    form.compensationType === 'hourly'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Hourly Rate (₹/hr)
                </button>
                <button
                  type="button"
                  onClick={() => updateField('compensationType', 'fixed')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    form.compensationType === 'fixed'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Fixed Lump-sum (₹)
                </button>
              </div>
            </div>

            <Input
              label={form.compensationType === 'hourly' ? 'Rate per Hour (₹)' : 'Fixed Total Amount (₹)'}
              type="number"
              placeholder="e.g. 500"
              value={form.compensationAmount}
              onChange={(e) => updateField('compensationAmount', e.target.value)}
              required
            />
          </div>
        </Card>
      )}

      {/* STEP 3: Requirements */}
      {step === 3 && (
        <Card title="Job Requirements (Optional)">
          <div className="space-y-4">
            <Input
              label="Required Skills (Comma separated)"
              placeholder="e.g. Heavy lifting, Good communication, English"
              value={form.skills}
              onChange={(e) => updateField('skills', e.target.value)}
            />

            <Input
              label="Prior Experience Required"
              placeholder="e.g. 1 year in event handling or freshers welcome"
              value={form.experience}
              onChange={(e) => updateField('experience', e.target.value)}
            />

            <Input
              label="Dress Code"
              placeholder="e.g. Black shirt, dark trousers, closed shoes"
              value={form.dressCode}
              onChange={(e) => updateField('dressCode', e.target.value)}
            />

            <Input
              label="Languages (Comma separated)"
              placeholder="e.g. Kannada, English, Hindi"
              value={form.languages}
              onChange={(e) => updateField('languages', e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* STEP 4: Location */}
      {step === 4 && (
        <Card title="Work Location & Map Pin">
          <div className="space-y-4">
            <Input
              label="Street Address / Building"
              placeholder="e.g. #42, 80 Feet Road, Koramangala 4th Block"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                placeholder="Bengaluru"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                required
              />

              <Input
                label="Pincode"
                placeholder="560034"
                value={form.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <IndianStatesField
              value={form.state}
              onChange={(val) => updateField('state', val)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Pinpoint on Map
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
      )}

      {/* Action Footer */}
      <div className="pt-2">
        {step < STEP_TITLES.length - 1 ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleNext}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue to {STEP_TITLES[step + 1]}
          </Button>
        ) : (
          <div className="space-y-2.5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onClick={() => handleSubmit(true)}
              rightIcon={<Sparkles className="w-4 h-4" />}
            >
              Publish Gig Now
            </Button>

            <Button
              variant="outline"
              size="md"
              fullWidth
              loading={isSubmitting}
              onClick={() => handleSubmit(false)}
            >
              Save as Draft
            </Button>
          </div>
        )}
      </div>

      <ProfileIncompleteModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        title="Employer Profile Incomplete"
        description="Before publishing jobs to the FixMate community, please complete your employer business profile and contact information."
      />
    </div>
  );
};
