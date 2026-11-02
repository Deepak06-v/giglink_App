import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Megaphone, Users, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { markOnboardingCompleted } from '@/utils/onboarding';
import { getRoleHomeRoute } from '@/utils/routing';

const SLIDES = [
  {
    icon: Search,
    color: 'bg-violet-50 text-primary border-violet-100',
    title: 'Discover Local Gigs',
    description:
      'Browse available tasks in your neighborhood with upfront pay rates, clear location details, and direct contact.',
  },
  {
    icon: Megaphone,
    color: 'bg-orange-50 text-accent border-orange-100',
    title: 'Post Jobs with Ease',
    description:
      'Describe your requirement, set a fair daily or task wage, place the location pin, and receive applications quickly.',
  },
  {
    icon: Users,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    title: 'Track Assignments',
    description:
      'Manage candidates, assign workers, track job completion status, and keep all communications structured.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: 'Build Verified Reputation',
    description:
      'Every completed gig earns authentic community reviews, building mutual trust between workers and employers.',
  },
];

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleFinish = () => {
    if (user?.id) {
      markOnboardingCompleted(user.id);
    }
    const target = user?.role ? getRoleHomeRoute(user.role) : '/browse';
    navigate(target, { replace: true });
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-between p-6 sm:p-10 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-xs">
            <span className="text-white text-sm font-black">FM</span>
          </div>
          <span className="text-sm font-bold text-text-primary">FixMate</span>
        </div>

        <button
          onClick={handleFinish}
          className="text-xs font-semibold text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full hover:bg-bg-secondary transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide Content */}
      <div className="my-auto py-8 text-center flex flex-col items-center">
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center border mb-8 shadow-lg shadow-black/5 ${slide.color} animate-in zoom-in-90 duration-300`}
        >
          <Icon className="w-12 h-12" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight max-w-xs">
          {slide.title}
        </h2>

        <p className="text-sm sm:text-base text-text-secondary mt-3 max-w-sm leading-relaxed">
          {slide.description}
        </p>

        {/* Carousel indicator dots */}
        <div className="flex items-center gap-2 mt-8">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-border hover:bg-text-muted'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pb-6">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleNext}
          rightIcon={
            currentSlide === SLIDES.length - 1 ? (
              <Check className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )
          }
        >
          {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
};
