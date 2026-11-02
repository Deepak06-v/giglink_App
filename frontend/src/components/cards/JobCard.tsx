import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { JobListItem } from '@/types/jobs';
import {
  formatCompensation,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
  getEmployerName,
  getStatusLabel,
} from '@/utils/formatJob';

export interface JobCardProps {
  job: JobListItem;
  onPress?: () => void;
  onClick?: () => void;
  customRoute?: string;
}

function statusVariant(status: string): BadgeVariant {
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

export const JobCard: React.FC<JobCardProps> = ({ job, onPress, onClick, customRoute }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (onPress) {
      onPress();
    } else if (customRoute) {
      navigate(customRoute);
    } else {
      navigate(`/jobs/${job._id}`);
    }
  };

  const scheduleText = formatScheduleRange(job.schedule);
  const timeText = formatTimeRange(job.schedule);
  const employerName = getEmployerName(job.employer);

  return (
    <Card interactive onClick={handleClick} className="flex flex-col gap-3 group">
      {/* Header: Category & Status */}
      <div className="flex items-center justify-between gap-2">
        <Badge label={getCategoryLabel(job.category)} variant="brand" />
        <Badge label={getStatusLabel(job.status)} variant={statusVariant(job.status)} dot />
      </div>

      {/* Title & Employer */}
      <div>
        <h3 className="text-[17px] font-bold text-[#191B23] tracking-tight group-hover:text-[#6C5CE7] transition-colors line-clamp-1">
          {job.title}
        </h3>
        <p className="text-[13px] text-[#5A5F6E] mt-0.5 font-medium">{employerName}</p>
      </div>

      {/* Meta Info: Schedule & Location */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#5A5F6E] pt-0.5">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span>{scheduleText}</span>
        </div>
        {timeText && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#9BA1AE]" />
            <span>{timeText}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span>{job.location.city}</span>
        </div>
      </div>

      {/* Bottom Bar: Compensation & Workers Required */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E9EAF0]">
        <div className="text-[16px] font-extrabold text-[#6C5CE7] tracking-tight">
          {formatCompensation(job.compensation)}
        </div>
        <div className="text-[12px] font-medium text-[#5A5F6E]">
          {job.workersRequired} {job.workersRequired === 1 ? 'Worker needed' : 'Workers needed'}
        </div>
      </div>
    </Card>
  );
};
