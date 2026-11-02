import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { Application, ApplicationStatus, Job } from '@/types';
import {
  formatAppliedDate,
  formatCompensation,
  formatScheduleRange,
  getCategoryLabel,
  getEmployerName,
  getStatusLabel,
} from '@/utils/formatJob';

export interface ApplicationCardProps {
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

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  const navigate = useNavigate();
  const job = typeof application.job === 'object' ? (application.job as Job) : null;

  if (!job) return null;

  const handleClick = () => {
    navigate(`/worker/applications/${application._id}`);
  };

  return (
    <Card interactive onClick={handleClick} className="flex flex-col gap-3 group">
      <div className="flex items-center justify-between gap-2">
        <Badge label={getCategoryLabel(job.category)} variant="brand" />
        <Badge
          label={getStatusLabel(application.status)}
          variant={statusVariant(application.status)}
          dot
        />
      </div>

      <div>
        <h3 className="text-[17px] font-bold text-[#191B23] tracking-tight group-hover:text-[#6C5CE7] transition-colors line-clamp-1">
          {job.title}
        </h3>
        <p className="text-[13px] text-[#5A5F6E] mt-0.5 font-medium">{getEmployerName(job.employer)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#5A5F6E]">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span>{formatScheduleRange(job.schedule)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span>{job.location.city}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E9EAF0]">
        <div className="text-[15px] font-bold text-[#6C5CE7]">
          {formatCompensation(job.compensation)}
        </div>
        <div className="flex items-center text-[12px] text-[#9BA1AE] gap-1 group-hover:text-[#6C5CE7] transition-colors">
          <span>Applied {formatAppliedDate(application.appliedAt)}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Card>
  );
};
