import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJobApplications,
  updateApplicationStage,
  screenJob,
  getScreeningStatus
} from '../../api/recruiterApi.js';
import { getPublicJobById } from '../../api/jobsApi.js';
import { APPLICATION_STAGES, STAGE_CONFIG } from '../../utils/constants.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StageBadge from '../../components/StageBadge.jsx';
import Modal from '../../components/Modal.jsx';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Kanban,
  Table as TableIcon,
  ArrowLeft,
  ChevronDown,
  ArrowRight,
  Filter,
  ExternalLink,
  MoveRight,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  GitCompare
} from 'lucide-react';

export const ScreeningBadge = ({ screening }) => {
  if (!screening || screening.status !== 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        Unscreened
      </span>
    );
  }

  const { overall = 0, bucket = 'low', stale = false } = screening;
  const isStrong = bucket === 'strong';
  const isPotential = bucket === 'potential';

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
          isStrong
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : isPotential
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}
      >
        <span>{overall}%</span>
        <span className="capitalize text-[10px] font-medium opacity-90">({bucket})</span>
      </span>
      {stale && (
        <span
          title="Criteria modified since screening"
          className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
        >
          STALE
        </span>
      )}
    </div>
  );
};

export const JobApplicantsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [stageFilter, setStageFilter] = useState('');
  const [bucketFilter, setBucketFilter] = useState(''); // '' | 'strong' | 'potential' | 'low' | 'unscreened'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'date'
  const [selectedAppIds, setSelectedAppIds] = useState([]);

  // Batch Screening Progress Polling
  const [isScreeningRunning, setIsScreeningRunning] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState(null);

  // Decision override prompt modal
  const [overrideModal, setOverrideModal] = useState({
    isOpen: false,
    appId: null,
    targetStage: null,
    aiBucket: null,
    reason: ''
  });

  // Fetch job details
  const { data: jobData } = useQuery({
    queryKey: ['jobDetail', id],
    queryFn: () => getPublicJobById(id)
  });

  // Fetch applications with additive bucket and sort options
  const { data: appsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['jobApplicants', id, { stage: stageFilter, search, bucket: bucketFilter, sort: sortBy }],
    queryFn: () =>
      getJobApplications(id, {
        limit: 150,
        ...(stageFilter && { stage: stageFilter }),
        ...(search && { search }),
        ...(bucketFilter && { bucket: bucketFilter }),
        sort: sortBy
      })
  });

  // Check screening status periodically if running
  useEffect(() => {
    let interval = null;
    if (isScreeningRunning) {
      interval = setInterval(async () => {
        try {
          const res = await getScreeningStatus(id);
          if (res.success && res.data) {
            setScreeningProgress(res.data);
            if (res.data.status === 'completed' || res.data.status === 'failed') {
              setIsScreeningRunning(false);
              toast.success(`AI screening run completed! (${res.data.completed} screened)`);
              queryClient.invalidateQueries(['jobApplicants', id]);
            }
          }
        } catch (err) {
          setIsScreeningRunning(false);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScreeningRunning, id, queryClient]);

  // Stage update mutation
  const stageMutation = useMutation({
    mutationFn: ({ applicationId, stage, note = '' }) =>
      updateApplicationStage(applicationId, {
        stage,
        note: note || `Moved to ${stage.replace('_', ' ')}`
      }),
    onSuccess: (_, variables) => {
      toast.success(`Applicant moved to ${variables.stage.replace('_', ' ')}!`);
      setOverrideModal({ isOpen: false, appId: null, targetStage: null, aiBucket: null, reason: '' });
      queryClient.invalidateQueries(['jobApplicants', id]);
      queryClient.invalidateQueries(['recruiterDashboard']);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update applicant stage');
    }
  });

  // Handle stage change with AI override detection
  const handleStageSelect = (app, newStage) => {
    if (!newStage || newStage === app.stage) return;

    const aiBucket = app.screening?.bucket;
    const isOverride =
      (aiBucket === 'strong' && newStage === 'rejected') ||
      (aiBucket === 'low' && newStage === 'shortlisted');

    if (isOverride) {
      setOverrideModal({
        isOpen: true,
        appId: app._id,
        targetStage: newStage,
        aiBucket,
        reason: ''
      });
    } else {
      stageMutation.mutate({
        applicationId: app._id,
        stage: newStage
      });
    }
  };

  // Trigger batch screening run
  const handleStartScreening = async (force = false) => {
    try {
      setIsScreeningRunning(true);
      const res = await screenJob(id, { force });
      if (res.success) {
        toast.success('AI screening job initiated!');
      }
    } catch (err) {
      setIsScreeningRunning(false);
      toast.error(err.message || 'Failed to start AI screening run');
    }
  };

  // Toggle selection for comparison
  const toggleSelectApp = (appId) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((i) => i !== appId) : [...prev, appId]
    );
  };

  // Navigate to comparison page
  const handleCompareSelected = () => {
    if (selectedAppIds.length < 2 || selectedAppIds.length > 3) {
      toast.error('Please select 2 or 3 candidates to compare');
      return;
    }
    navigate(`/recruiter/jobs/${id}/compare?ids=${selectedAppIds.join(',')}`);
  };

  const job = jobData?.data?.job;
  const applications = appsData?.data?.items || [];
  const bucketCounts = appsData?.data?.bucketCounts || {
    strong: 0,
    potential: 0,
    low: 0,
    unscreened: 0,
    total: 0
  };

  // Group applications by stage for Kanban view
  const applicationsByStage = {};
  APPLICATION_STAGES.forEach((stage) => {
    applicationsByStage[stage] = [];
  });
  applications.forEach((app) => {
    if (applicationsByStage[app.stage]) {
      applicationsByStage[app.stage].push(app);
    } else {
      applicationsByStage[app.stage] = [app];
    }
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to my jobs
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
              {job?.title ? `${job.title} — Applicants` : 'Applicants Pipeline'}
            </h1>
            {job?.blindScreening && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                Blind Screening Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {job?.department} • {job?.location} • {applications.length} visible candidates
          </p>
        </div>

        {/* Action Buttons: Batch Screening & Compare */}
        <div className="flex items-center flex-wrap gap-2.5">
          {selectedAppIds.length >= 2 && (
            <button
              onClick={handleCompareSelected}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-soft transition"
            >
              <GitCompare className="w-4 h-4" />
              Compare ({selectedAppIds.length})
            </button>
          )}

          <button
            onClick={() => handleStartScreening(false)}
            disabled={isScreeningRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo text-white hover:bg-indigo-hover shadow-soft disabled:opacity-50 transition"
          >
            <Sparkles className="w-4 h-4" />
            {isScreeningRunning ? 'Screening Candidates...' : 'AI Screen Candidates'}
          </button>
        </div>
      </div>

      {/* Screening Progress Bar */}
      {isScreeningRunning && screeningProgress && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-indigo">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              AI Batch Screening in progress...
            </span>
            <span>
              {screeningProgress.completed} of {screeningProgress.total} candidates processed
            </span>
          </div>
          <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo h-2 rounded-full transition-all duration-500"
              style={{
                width: `${
                  screeningProgress.total > 0
                    ? Math.round((screeningProgress.completed / screeningProgress.total) * 100)
                    : 15
                }%`
              }}
            />
          </div>
        </div>
      )}

      {/* AI Bucket Summary Cards (Filtering) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: '', label: 'All Candidates', count: bucketCounts.total, color: 'border-slate-200' },
          { key: 'strong', label: 'Strong Fit', count: bucketCounts.strong, color: 'border-emerald-200 text-emerald-800 bg-emerald-50/50' },
          { key: 'potential', label: 'Potential Fit', count: bucketCounts.potential, color: 'border-blue-200 text-blue-800 bg-blue-50/50' },
          { key: 'low', label: 'Low Fit', count: bucketCounts.low, color: 'border-rose-200 text-rose-800 bg-rose-50/50' },
          { key: 'unscreened', label: 'Unscreened', count: bucketCounts.unscreened, color: 'border-slate-200 text-slate-700 bg-slate-50' }
        ].map((card) => {
          const isActive = bucketFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setBucketFilter(isActive ? '' : card.key)}
              className={`p-3.5 rounded-xl border text-left transition shadow-soft ${card.color} ${
                isActive ? 'ring-2 ring-indigo shadow-md font-bold' : 'hover:border-indigo/40'
              }`}
            >
              <div className="text-[11px] font-semibold opacity-75">{card.label}</div>
              <div className="text-xl font-bold font-heading mt-0.5">{card.count || 0}</div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Search, Stage Filter, Sort, View Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, email, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo"
            />
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo"
            >
              <option value="">All Stages</option>
              {APPLICATION_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo"
            >
              <option value="score">Sort: Highest Match Score</option>
              <option value="date">Sort: Newest Application</option>
            </select>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'kanban' ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <LoadingSpinner text="Loading applicants pipeline..." />
      ) : isError ? (
        <EmptyState
          title="Could not load applicants"
          description="Failed to load applicant records for this job."
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
          icon={Users}
          title="No applicants found"
          description={
            search || stageFilter || bucketFilter
              ? 'No applicants match the current filter or search criteria.'
              : 'No candidates have applied to this opening yet.'
          }
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-card border border-slate-100 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-3 text-center w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-3.5 px-4">Candidate</th>
                  <th className="py-3.5 px-4">AI Assessment</th>
                  <th className="py-3.5 px-4">Current Stage</th>
                  <th className="py-3.5 px-4">Experience</th>
                  <th className="py-3.5 px-4">Applied</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => {
                  const isSelected = selectedAppIds.includes(app._id);
                  return (
                    <tr
                      key={app._id}
                      className={`hover:bg-slate-50/70 transition ${
                        isSelected ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectApp(app._id)}
                          className="rounded text-indigo focus:ring-indigo h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          to={`/recruiter/applications/${app._id}`}
                          className="font-bold text-ink hover:text-indigo transition text-sm flex items-center gap-1.5"
                        >
                          {app.candidate?.name || 'Applicant'}
                          {app.candidate?.isAnonymized && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                              Anonymized
                            </span>
                          )}
                        </Link>
                        {!app.candidate?.isAnonymized && (
                          <div className="text-[11px] text-slate-400">{app.candidate?.email}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <ScreeningBadge screening={app.screening} />
                      </td>

                      <td className="py-3.5 px-4">
                        <StageBadge stage={app.stage} size="small" />
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {app.screening?.experience?.relevantYears !== undefined
                          ? `${app.screening.experience.relevantYears} yrs relevant`
                          : app.candidateProfile?.totalExperienceYears !== undefined
                          ? `${app.candidateProfile.totalExperienceYears} yrs total`
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(app.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={app.stage}
                            onChange={(e) => handleStageSelect(app, e.target.value)}
                            disabled={stageMutation.isPending}
                            className="text-[11px] font-semibold text-indigo bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg outline-none cursor-pointer border border-indigo-100 transition"
                          >
                            {APPLICATION_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_CONFIG[s]?.label || s}
                              </option>
                            ))}
                          </select>

                          <Link
                            to={`/recruiter/applications/${app._id}`}
                            className="p-1.5 text-slate-400 hover:text-indigo rounded-lg hover:bg-slate-100 transition"
                            title="Open Assessment Detail"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1700px]">
            {APPLICATION_STAGES.map((stage) => {
              const stageApps = applicationsByStage[stage] || [];
              const config = STAGE_CONFIG[stage] || { label: stage };

              return (
                <div
                  key={stage}
                  className="w-72 shrink-0 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 flex flex-col max-h-[75vh]"
                >
                  <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">
                      {config.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-indigo border border-slate-200">
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto mt-3 pr-1 flex-1">
                    {stageApps.map((app) => (
                      <div
                        key={app._id}
                        className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-soft transition space-y-2.5"
                      >
                        <div>
                          <Link
                            to={`/recruiter/applications/${app._id}`}
                            className="font-bold text-sm text-ink hover:text-indigo transition"
                          >
                            {app.candidate?.name || 'Applicant'}
                          </Link>
                          {!app.candidate?.isAnonymized && (
                            <div className="text-[11px] text-slate-400 truncate">
                              {app.candidate?.email}
                            </div>
                          )}
                        </div>

                        {/* Screening badge */}
                        <div>
                          <ScreeningBadge screening={app.screening} />
                        </div>

                        {/* Summary / Strengths preview */}
                        {app.screening?.summary && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {app.screening.summary}
                          </p>
                        )}

                        {/* Stage Selector */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(app.createdAt)}
                          </span>

                          <select
                            value={app.stage}
                            onChange={(e) => handleStageSelect(app, e.target.value)}
                            disabled={stageMutation.isPending}
                            className="text-[10px] font-semibold text-indigo bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md outline-none cursor-pointer border border-indigo-100 transition"
                          >
                            {APPLICATION_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_CONFIG[s]?.label || s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Override Reason Modal */}
      {overrideModal.isOpen && (
        <Modal
          isOpen={overrideModal.isOpen}
          onClose={() =>
            setOverrideModal({ isOpen: false, appId: null, targetStage: null, aiBucket: null, reason: '' })
          }
          title="Recruiter Decision Context"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>The AI screening engine assessed this candidate in the </span>
                <strong className="uppercase">{overrideModal.aiBucket}</strong>
                <span> bucket. You are advancing them to </span>
                <strong className="uppercase">{overrideModal.targetStage}</strong>.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Optional Decision Reason / Recruiter Note
              </label>
              <textarea
                rows={3}
                value={overrideModal.reason}
                onChange={(e) =>
                  setOverrideModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="e.g. Unique domain expertise outside core keyword stack; positive initial informal screening conversation."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setOverrideModal({ isOpen: false, appId: null, targetStage: null, aiBucket: null, reason: '' })
                }
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  stageMutation.mutate({
                    applicationId: overrideModal.appId,
                    stage: overrideModal.targetStage,
                    note: overrideModal.reason
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo hover:bg-indigo-hover rounded-xl shadow-soft transition"
              >
                Confirm Stage Change
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobApplicantsPage;
