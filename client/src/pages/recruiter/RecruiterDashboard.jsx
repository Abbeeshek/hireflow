import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../../api/recruiterApi.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StageBadge from '../../components/StageBadge.jsx';
import {
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  ArrowRight,
  PlusCircle,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

export const RecruiterDashboard = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recruiterDashboard'],
    queryFn: getDashboard
  });

  const dashboard = data?.data;

  if (isLoading) return <LoadingSpinner text="Loading recruiter dashboard analytics..." />;
  if (isError || !dashboard) {
    return (
      <EmptyState
        title="Failed to load dashboard"
        description="Could not aggregate your company analytics."
        action={
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
          >
            Retry
          </button>
        }
      />
    );
  }

  const {
    jobCounts = {},
    totalApplications = 0,
    newThisWeek = 0,
    funnel = [],
    applicationsPerJob = [],
    recentApplications = []
  } = dashboard;

  // Funnel data formatted for Recharts
  const funnelChartData = funnel.map((f) => ({
    name: f.stage.replace('_', ' ').toUpperCase(),
    count: f.count,
    rawStage: f.stage
  }));

  // Top jobs bar chart data
  const jobsChartData = applicationsPerJob.map((j) => ({
    name: j.title.length > 18 ? `${j.title.substring(0, 18)}...` : j.title,
    count: j.count,
    fullTitle: j.title
  }));

  const STAGE_COLORS = {
    applied: '#4530A6',
    screening: '#7B68E8',
    shortlisted: '#9F7AEA',
    assessment: '#3182CE',
    interview1: '#00B4D8',
    interview2: '#38B2AC',
    hr_round: '#F5A324',
    offer: '#ED8936',
    hired: '#1FA971',
    rejected: '#D9534F'
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Recruiter Dashboard</h1>
          <p className="text-sm text-slate-500">
            Pipeline overview, funnel velocity, and recent applicant activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/recruiter/jobs/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo text-white text-xs font-semibold shadow-soft hover:bg-indigo-hover transition"
          >
            <PlusCircle className="w-4 h-4" />
            Create Job Opening
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 bg-white rounded-card border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Applications
              </div>
              <div className="font-heading text-3xl font-bold text-ink mt-1">
                {totalApplications}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">All applicants across company jobs</div>
        </div>

        <div className="p-6 bg-white rounded-card border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                New This Week
              </div>
              <div className="font-heading text-3xl font-bold text-indigo mt-1">
                {newThisWeek}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-lavender-light flex items-center justify-center text-indigo">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">Applied within the last 7 days</div>
        </div>

        <div className="p-6 bg-white rounded-card border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Published Openings
              </div>
              <div className="font-heading text-3xl font-bold text-success mt-1">
                {jobCounts.published || 0}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-success-light flex items-center justify-center text-success">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">Actively accepting applications</div>
        </div>

        <div className="p-6 bg-white rounded-card border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Drafts & Closed
              </div>
              <div className="font-heading text-3xl font-bold text-amber mt-1">
                {(jobCounts.draft || 0) + (jobCounts.closed || 0)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-light flex items-center justify-center text-amber-800">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">
            {jobCounts.draft || 0} Draft • {jobCounts.closed || 0} Closed
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recruitment Funnel Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-card border border-slate-100 shadow-soft space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-ink">Pipeline Funnel by Stage</h3>
            <p className="text-xs text-slate-400">
              Candidate distribution across the 10 hiring stages
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelChartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  width={80}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#F7F6FC' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-soft text-xs">
                          <span className="font-semibold text-ink">{d.name}:</span>{' '}
                          <span className="font-bold text-indigo">{d.count} candidates</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STAGE_COLORS[entry.rawStage] || '#4530A6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Applications per Job Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-card border border-slate-100 shadow-soft space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-ink">
              Top Jobs by Applicant Volume
            </h3>
            <p className="text-xs text-slate-400">Applications received for top 5 active roles</p>
          </div>

          <div className="h-64 w-full pt-2">
            {jobsChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No job application data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={jobsChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" allowDecimals={false} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: '#F7F6FC' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-soft text-xs">
                            <p className="font-semibold text-ink">{d.fullTitle}</p>
                            <p className="font-bold text-indigo">{d.count} applications</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#4530A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white rounded-card border border-slate-100 shadow-soft overflow-hidden space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-heading text-lg font-bold text-ink">Recent Applicants</h3>
            <p className="text-xs text-slate-400">The 8 most recent candidates who applied</p>
          </div>
          <Link
            to="/recruiter/jobs"
            className="text-xs font-semibold text-indigo hover:text-indigo-hover transition inline-flex items-center gap-1"
          >
            Manage Jobs
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic">
            No applications received yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Job Role</th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3">Applied</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-ink">{app.candidate?.name || 'Candidate'}</div>
                      <div className="text-[11px] text-slate-400">{app.candidate?.email}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-700">{app.job?.title || 'Job Opening'}</div>
                      <div className="text-[11px] text-slate-400">{app.job?.department}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <StageBadge stage={app.stage} size="small" />
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {formatRelativeTime(app.createdAt)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/recruiter/applications/${app._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-hover"
                      >
                        Review
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterDashboard;
