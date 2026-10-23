import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ForbiddenPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-danger-light flex items-center justify-center text-danger mb-6">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <h1 className="font-heading text-3xl font-bold text-ink mb-2">403 - Access Forbidden</h1>
      <p className="text-slate-600 max-w-md mb-8">
        You do not have the required permissions or role to view this section of the HireFlow ATS.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo text-white font-medium shadow-soft hover:bg-indigo-hover transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
};

export default ForbiddenPage;
