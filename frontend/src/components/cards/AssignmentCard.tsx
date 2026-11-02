import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { Assignment } from '@/types';
import {
  formatCompensation,
  formatScheduleRange,
  formatTimeRange,
  getAssignmentBucket,
  getCategoryLabel,
  getEmployerName,
  getStatusLabel,
} from '@/utils/formatJob';

export interface AssignmentCardProps {
  assignment: Assignment;
}

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'UPCOMING':
      return 'brand';
    case 'COMPLETED':
      return 'neutral';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment }) => {
  const navigate = useNavigate();
  const job = assignment.job;
  const bucket = getAssignmentBucket(assignment);

  const handleClick = () => {
    navigate(`/worker/assignments/${assignment._id}`);
  };

  const scheduleText = formatScheduleRange(job.schedule);
  const timeText = formatTimeRange(job.schedule);

  return (
    <Card interactive onClick={handleClick} className="flex flex-col gap-3 group">
      <div className="flex items-center justify-between gap-2">
        <Badge label={getCategoryLabel(job.category)} variant="brand" />
        <Badge label={getStatusLabel(bucket)} variant={statusVariant(bucket)} dot />
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

      <div className="flex items-center justify-between pt-2 border-t border-[#E9EAF0]">
        <div className="text-[15px] font-bold text-[#6C5CE7]">
          {formatCompensation(job.compensation)}
        </div>
        <div className="flex items-center text-[12px] text-[#9BA1AE] gap-1 group-hover:text-[#6C5CE7] transition-colors">
          <span>{assignment.workerCompleted ? 'Completed by you' : 'View Details'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Card>
  );
};
