import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyApplications } from '../../api/candidateApi.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import { APPLICATION_STAGES } from '../../utils/constants.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StageBadge from '../../components/StageBadge.jsx';
import {
  Briefcase,
  Calendar,
  Building,
  MapPin,
  Clock,
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock4,
  XCircle
} from 'lucide-react';

export const CandidateDashboard = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['myApplications'],
    queryFn: getMyApplications
  });

  const applications = data?.data?.applications || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">My Applications</h1>
          <p className="text-sm text-slate-500">
            Track your application statuses and interview progression in real time.
          </p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo text-white text-xs font-semibold shadow-soft hover:bg-indigo-hover transition self-start sm:self-auto"
        >
          <Briefcase className="w-4 h-4" />
          Browse More Jobs
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner text="Fetching your submitted applications..." />
      ) : isError ? (
        <EmptyState
          title="Could not load applications"
          description="We had trouble retrieving your application records."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
            >
              Retry
            </button>
          }
        />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications submitted yet"
          description="You haven't applied to any job openings yet. Explore our open roles to get started!"
          action={
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo text-white rounded-xl shadow-soft"
            >
              Explore Open Positions
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {applications.map((app) => (
            <div
              key={app._id}
              className="bg-white rounded-card border border-slate-100 shadow-soft p-6 sm:p-8 space-y-6 hover:shadow-hover transition"
            >
              {/* Job Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo uppercase tracking-wider">
                      {app.job?.company?.name || 'Company'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{app.job?.department}</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-ink">
                    {app.job?.title || 'Job Opening'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {app.job?.location}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{app.job?.workMode}</span>
                    <span>•</span>
                    <span className="capitalize">{app.job?.employmentType}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Applied {formatDate(app.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="text-xs font-medium text-slate-400">Current Status</div>
                  <StageBadge stage={app.stage} size="large" />
                </div>
              </div>

              {/* Stage Progress Bar / Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Progression Timeline
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-lavender">
                  {app.stageHistory && app.stageHistory.length > 0 ? (
                    app.stageHistory.map((step, sIdx) => {
                      const isRejected = step.stage === 'rejected';
                      const isHired = step.stage === 'hired';

                      return (
                        <div key={sIdx} className="relative flex items-start gap-4">
                          {/* Dot Icon */}
                          <div
                            className={`absolute -left-6 mt-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                              isRejected
                                ? 'border-danger text-danger'
                                : isHired
                                ? 'border-success text-success'
                                : 'border-indigo text-indigo'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isRejected ? 'bg-danger' : isHired ? 'bg-success' : 'bg-indigo'
                              }`}
                            />
                          </div>

                          {/* Content */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-ink uppercase tracking-wide">
                                {step.stage.replace('_', ' ')}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {formatDate(step.at)} ({formatRelativeTime(step.at)})
                              </span>
                            </div>
                            {step.note && (
                              <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                                "{step.note}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400">Application submitted.</p>
                  )}
                </div>
              </div>

              {/* Resume & Cover Note attached */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo" />
                  <span>Resume Attached:</span>
                  <span className="font-semibold text-ink">
                    {app.resume?.originalName || 'Candidate Resume'}
                  </span>
                </div>
                {app.coverNote && (
                  <div className="italic text-slate-400">
                    Cover note submitted with application
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
