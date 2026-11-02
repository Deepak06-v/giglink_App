import React from 'react';
import { Select } from '../ui/Select';
import { INDIAN_STATES_AND_UTS } from '@/constants/indianStates';

interface IndianStatesFieldProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const IndianStatesField: React.FC<IndianStatesFieldProps> = ({
  value,
  onChange,
  label = 'State / Union Territory',
  error,
  disabled = false,
}) => {
  const options = INDIAN_STATES_AND_UTS.map((st) => ({
    label: st,
    value: st,
  }));

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder="Select state / UT"
      error={error}
      disabled={disabled}
    />
  );
};
