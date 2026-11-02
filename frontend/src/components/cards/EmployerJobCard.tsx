import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { Job, JobStatus } from '@/types';
import {
  formatCompensation,
  formatScheduleRange,
  getCategoryLabel,
  getStatusLabel,
} from '@/utils/formatJob';

export interface EmployerJobCardProps {
  job: Job;
}

export function employerJobStatusVariant(status: JobStatus): BadgeVariant {
  switch (status) {
    case 'OPEN':
      return 'success';
    case 'FILLED':
    case 'IN_PROGRESS':
      return 'brand';
    case 'COMPLETED':
      return 'neutral';
    case 'CANCELLED':
      return 'error';
    case 'DRAFT':
      return 'warning';
    default:
      return 'default';
  }
}

export const EmployerJobCard: React.FC<EmployerJobCardProps> = ({ job }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/employer/jobs/${job._id}`);
  };

  return (
    <Card interactive onClick={handleClick} className="flex flex-col gap-3 group">
      <div className="flex items-center justify-between gap-2">
        <Badge label={getCategoryLabel(job.category)} variant="brand" />
        <Badge label={getStatusLabel(job.status)} variant={employerJobStatusVariant(job.status)} dot />
      </div>

      <div>
        <h3 className="text-[17px] font-bold text-[#191B23] tracking-tight group-hover:text-[#6C5CE7] transition-colors line-clamp-1">
          {job.title}
        </h3>
        <p className="text-[13px] text-[#5A5F6E] mt-0.5 line-clamp-1">{job.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#5A5F6E]">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span>{formatScheduleRange(job.schedule)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span>{job.workersRequired} required</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E9EAF0]">
        <div className="text-[15px] font-bold text-[#6C5CE7]">
          {formatCompensation(job.compensation)}
        </div>
        <div className="flex items-center text-[12px] text-[#9BA1AE] gap-1 group-hover:text-[#6C5CE7] transition-colors">
          <span>Manage</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Card>
  );
};
