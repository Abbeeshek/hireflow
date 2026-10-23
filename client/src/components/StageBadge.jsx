import React from 'react';
import { STAGE_CONFIG } from '../utils/constants.js';

export const StageBadge = ({ stage = 'applied', size = 'default' }) => {
  const config = STAGE_CONFIG[stage] || {
    label: stage,
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-xs',
    large: 'px-4 py-1.5 text-sm'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-pill border ${config.color} ${sizeClasses[size] || sizeClasses.default}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {config.label}
    </span>
  );
};

export default StageBadge;
