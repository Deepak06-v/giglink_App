import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User as UserIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { Application, ApplicationStatus, Job } from '@/types';
import { formatAppliedDate, getStatusLabel } from '@/utils/formatJob';

export interface EmployerApplicationCardProps {
  application: Application;
}

function statusVariant(status: ApplicationStatus): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'WITHDRAWN':
      return 'neutral';
    default:
      return 'default';
  }
}

export const EmployerApplicationCard: React.FC<EmployerApplicationCardProps> = ({
  application,
}) => {
  const navigate = useNavigate();
  const job = typeof application.job === 'object' ? (application.job as Job) : null;
  const worker =
    typeof application.worker === 'object' && application.worker !== null
      ? application.worker
      : null;

  const handleClick = () => {
    navigate(`/employer/applications/${application._id}`);
  };

  return (
    <Card interactive onClick={handleClick} className="flex flex-col gap-3 group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#5A5F6E] truncate max-w-[60%]">
          {job?.title || 'Job Application'}
        </span>
        <Badge
          label={getStatusLabel(application.status)}
          variant={statusVariant(application.status)}
          dot
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#EDEBFC] text-[#6C5CE7] flex items-center justify-center font-bold text-sm shrink-0 border border-[#6C5CE7]/20">
          <UserIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <h4 className="text-[16px] font-bold text-[#191B23] tracking-tight truncate group-hover:text-[#6C5CE7] transition-colors">
            {worker?.name || 'Applicant'}
          </h4>
          <span className="text-[12px] text-[#5A5F6E] truncate">
            {worker?.email || 'Applied for gig'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E9EAF0] text-[12px] text-[#9BA1AE]">
        <span>Applied {formatAppliedDate(application.appliedAt)}</span>
        <div className="flex items-center gap-1 group-hover:text-[#6C5CE7] transition-colors">
          <span>Review</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Card>
  );
};
