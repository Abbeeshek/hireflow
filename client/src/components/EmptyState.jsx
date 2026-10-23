import React from 'react';
import { FolderSearch } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderSearch,
  title = 'No items found',
  description = 'There are no records matching your criteria.',
  action = null
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-card border border-slate-100 shadow-soft my-4">
      <div className="w-16 h-16 rounded-full bg-lavender-light flex items-center justify-center text-indigo mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="font-heading text-xl text-ink font-semibold mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
