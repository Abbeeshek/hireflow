import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading...', size = 'default' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
        <Loader2 className={`${sizeClasses[size] || sizeClasses.default} text-indigo animate-spin`} />
      </div>
      {text && <p className="text-sm font-medium text-slate-500">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
