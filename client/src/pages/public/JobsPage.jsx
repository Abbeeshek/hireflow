import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicJobs } from '../../api/jobsApi.js';
import { formatDate } from '../../utils/formatters.js';
import { WORK_MODES, EMPLOYMENT_TYPES } from '../../utils/constants.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import {
  Search,
  MapPin,
  Briefcase,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export const JobsPage = () => {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [skills, setSkills] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 6,
    ...(search && { search }),
    ...(location && { location }),
    ...(employmentType && { employmentType }),
    ...(workMode && { workMode }),
    ...(skills && { skills })
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['publicJobs', queryParams],
    queryFn: () => getPublicJobs(queryParams),
    keepPreviousData: true
  });

  const handleReset = () => {
    setSearch('');
    setLocation('');
    setEmploymentType('');
    setWorkMode('');
    setSkills('');
    setPage(1);
  };

  const jobs = data?.data?.items || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-ink">
          Explore Job Openings
        </h1>
        <p className="text-sm text-slate-500">
          Discover high-impact opportunities published by top hiring companies.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-6 rounded-card border border-slate-100 shadow-soft space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search title, tech, department..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo focus:ring-2 focus:ring-indigo/10 outline-none transition"
            />
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="City, State, or Country..."
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo focus:ring-2 focus:ring-indigo/10 outline-none transition"
            />
          </div>

          {/* Skills Filter */}
          <div className="relative">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Filter by skills (e.g. React, Docker)"
              value={skills}
              onChange={(e) => {
                setSkills(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo focus:ring-2 focus:ring-indigo/10 outline-none transition"
            />
          </div>
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none"
            >
              <option value="">All Employment Types</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={workMode}
              onChange={(e) => {
                setWorkMode(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none"
            >
              <option value="">All Work Modes</option>
              {WORK_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {(search || location || employmentType || workMode || skills) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-semibold text-danger hover:text-danger/80 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Jobs Grid or States */}
      {isLoading ? (
        <LoadingSpinner text="Searching available openings..." />
      ) : isError ? (
        <EmptyState
          title="Failed to load jobs"
          description="Could not connect to the job repository. Please check your network or try again."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg shadow-sm"
            >
              Try Again
            </button>
          }
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No open positions found"
          description="Try adjusting your keywords, work mode, or location filters."
          action={
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg shadow-sm"
            >
              Clear All Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="text-xs font-medium text-slate-500">
            Showing {jobs.length} of {pagination.total} published jobs
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="group p-6 bg-white rounded-card border border-slate-100 shadow-soft hover:shadow-hover transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-ink group-hover:text-indigo transition">
                        {job.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        {job.company?.name || 'Company'} • {job.department}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-lavender-light text-indigo capitalize border border-lavender/50">
                      {job.workMode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Skills Chips */}
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.requiredSkills.slice(0, 4).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.requiredSkills.length > 4 && (
                        <span className="px-1.5 py-0.5 text-[11px] text-slate-400">
                          +{job.requiredSkills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{job.employmentType}</span>
                  </div>

                  <Link
                    to={`/jobs/${job._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-hover group-hover:translate-x-0.5 transition"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600 px-3">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobsPage;
