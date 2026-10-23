import React from 'react';
import { Briefcase, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo flex items-center justify-center text-white">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="font-heading font-bold text-ink">HireFlow</span>
          <span className="text-xs text-slate-400 ml-2">Phase 1 ATS Architecture</span>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1">
          Built with <Heart className="w-3.5 h-3.5 text-danger fill-danger" /> for high-velocity hiring teams.
        </p>

        <div className="text-xs text-slate-400">
          Running on localhost • No external cloud dependencies
        </div>
      </div>
    </footer>
  );
};

export default Footer;
