import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecruiterJobs, updateJobStatus } from '../../api/recruiterApi.js';
import { formatDate } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import toast from 'react-hot-toast';
import {
  Briefcase,
  PlusCircle,
  Users,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const RecruiterJobsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 10,
    ...(statusFilter && { status: statusFilter })
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recruiterJobs', queryParams],
    queryFn: () => getRecruiterJobs(queryParams)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateJobStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(`Job marked as ${variables.status}!`);
      queryClient.invalidateQueries(['recruiterJobs']);
      queryClient.invalidateQueries(['recruiterDashboard']);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update job status');
    }
  });

  const jobs = data?.data?.items || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Job Openings</h1>
          <p className="text-sm text-slate-500">
            Manage your company job postings, application pipelines, and statuses.
          </p>
        </div>
        <Link
          to="/recruiter/jobs/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo text-white text-xs font-semibold shadow-soft hover:bg-indigo-hover transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Job
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { label: 'All Jobs', value: '' },
          { label: 'Published', value: 'published' },
          { label: 'Drafts', value: 'draft' },
          { label: 'Closed', value: 'closed' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              statusFilter === tab.value
                ? 'bg-indigo text-white shadow-soft'
                : 'text-slate-500 hover:text-ink hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Jobs List / Table */}
      {isLoading ? (
        <LoadingSpinner text="Loading company job postings..." />
      ) : isError ? (
        <EmptyState
          title="Failed to load jobs"
          description="Could not load jobs for your company."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
            >
              Retry
            </button>
          }
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No job postings found"
          description={
            statusFilter
              ? `No jobs found with status '${statusFilter}'.`
              : 'You have not created any job postings yet.'
          }
          action={
            <Link
              to="/recruiter/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo text-white rounded-xl shadow-soft"
            >
              <PlusCircle className="w-4 h-4" />
              Create Your First Job
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-card border border-slate-100 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Title & Department</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Location & Mode</th>
                  <th className="py-3.5 px-4 text-center">Applicants</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const statusColors = {
                    published: 'bg-success-light text-success border-emerald-300',
                    draft: 'bg-amber-light text-amber-800 border-amber-300',
                    closed: 'bg-slate-100 text-slate-500 border-slate-200'
                  };

                  return (
                    <tr key={job._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4">
                        <Link
                          to={`/recruiter/jobs/${job._id}/applicants`}
                          className="font-bold text-ink hover:text-indigo transition text-sm flex items-center gap-1.5"
                        >
                          {job.title}
                        </Link>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {job.department} • {job.openings} opening{job.openings > 1 ? 's' : ''}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-[11px] font-semibold capitalize border ${
                            statusColors[job.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-slate-700">{job.location}</div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {job.workMode} • {job.employmentType}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Link
                          to={`/recruiter/jobs/${job._id}/applicants`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo font-bold rounded-pill text-xs transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {job.applicationsCount || 0}
                        </Link>
                      </td>

                      <td className="py-4 px-4 text-slate-500">
                        {formatDate(job.createdAt)}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/recruiter/jobs/${job._id}/applicants`}
                            title="View Applicants"
                            className="p-1.5 text-slate-400 hover:text-indigo hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Users className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/recruiter/jobs/${job._id}/edit`}
                            title="Edit Job"
                            className="p-1.5 text-slate-400 hover:text-ink hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {job.status === 'draft' && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: job._id, status: 'published' })
                              }
                              title="Publish Job"
                              className="px-2 py-1 bg-success-light text-success text-[11px] font-semibold rounded-md hover:bg-emerald-200 transition"
                            >
                              Publish
                            </button>
                          )}

                          {job.status === 'published' && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: job._id, status: 'closed' })
                              }
                              title="Close Job"
                              className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md hover:bg-slate-200 transition"
                            >
                              Close
                            </button>
                          )}

                          {job.status === 'closed' && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: job._id, status: 'published' })
                              }
                              title="Re-open Job"
                              className="px-2 py-1 bg-indigo-50 text-indigo text-[11px] font-semibold rounded-md hover:bg-indigo-100 transition"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterJobsPage;
