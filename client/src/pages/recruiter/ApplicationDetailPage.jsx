import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApplicationDetail } from '../../api/candidateApi.js';
import {
  updateApplicationStage,
  addRecruiterNote,
  rescreenApplication
} from '../../api/recruiterApi.js';
import { APPLICATION_STAGES, STAGE_CONFIG } from '../../utils/constants.js';
import { formatDate, formatRelativeTime, formatFileSize } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StageBadge from '../../components/StageBadge.jsx';
import toast from 'react-hot-toast';
import {
  User,
  FileText,
  Download,
  GraduationCap,
  FolderGit2,
  Globe,
  ArrowLeft,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Quote,
  ShieldAlert,
  Sliders,
  Check,
  X,
  Minus
} from 'lucide-react';

export const ApplicationDetailPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [selectedStage, setSelectedStage] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [expandedSkills, setExpandedSkills] = useState({});
  const [showCriteriaUsed, setShowCriteriaUsed] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['applicationDetail', id],
    queryFn: () => getApplicationDetail(id)
  });

  const app = data?.data?.application;
  const screening = app?.screening;

  // Stage change mutation
  const stageMutation = useMutation({
    mutationFn: ({ stage, note }) => updateApplicationStage(id, { stage, note }),
    onSuccess: (_, variables) => {
      toast.success(`Application stage updated to ${variables.stage}!`);
      setStageNote('');
      queryClient.invalidateQueries(['applicationDetail', id]);
      queryClient.invalidateQueries(['recruiterDashboard']);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update stage');
    }
  });

  // Re-screen mutation
  const rescreenMutation = useMutation({
    mutationFn: () => rescreenApplication(id),
    onSuccess: () => {
      toast.success('Candidate re-screened successfully with current criteria!');
      queryClient.invalidateQueries(['applicationDetail', id]);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to re-screen candidate');
    }
  });

  // Add note mutation
  const noteMutation = useMutation({
    mutationFn: (text) => addRecruiterNote(id, text),
    onSuccess: () => {
      toast.success('Internal recruiter note added!');
      setNewNoteText('');
      queryClient.invalidateQueries(['applicationDetail', id]);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add note');
    }
  });

  const toggleSkillExpand = (skillName) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [skillName]: !prev[skillName]
    }));
  };

  const handleStageSubmit = (e) => {
    e.preventDefault();
    if (!selectedStage) {
      toast.error('Please select a target stage');
      return;
    }
    stageMutation.mutate({
      stage: selectedStage,
      note: stageNote
    });
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    noteMutation.mutate(newNoteText.trim());
  };

  if (isLoading) return <LoadingSpinner text="Loading applicant profile and history..." />;
  if (isError || !app) {
    return (
      <EmptyState
        title="Application not found"
        description="Could not locate this applicant record."
      />
    );
  }

  const profile = app.candidateProfile || {};
  const currentStage = app.stage;
  const isAnonymized = Boolean(app.candidate?.isAnonymized);

  const isGemini = screening?.provider === 'gemini';
  const providerBadgeLabel = isGemini ? 'Gemini 2.5 Flash' : 'Demo AI mode';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={app.job?._id ? `/recruiter/jobs/${app.job._id}/applicants` : '/recruiter/jobs'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Applicants Pipeline
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
              {app.candidate?.name || 'Candidate Assessment'}
            </h1>
            <StageBadge stage={currentStage} />
            {isAnonymized && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                Blind Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Applying for <span className="font-semibold text-ink">{app.job?.title}</span> • Applied {formatDate(app.createdAt)}
          </p>
        </div>

        {/* Rescreen Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => rescreenMutation.mutate()}
            disabled={rescreenMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-ink shadow-soft disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rescreenMutation.isPending ? 'animate-spin' : ''}`} />
            {rescreenMutation.isPending ? 'Re-screening...' : 'Re-screen Candidate'}
          </button>
        </div>
      </div>

      {/* Staleness Banner */}
      {screening?.stale && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-900 shadow-soft">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Job criteria modified:</strong> Job requirements or evaluation weights have changed since this candidate was screened.
            </span>
          </div>
          <button
            onClick={() => rescreenMutation.mutate()}
            disabled={rescreenMutation.isPending}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0 transition"
          >
            Re-screen Now
          </button>
        </div>
      )}

      {/* AI Intelligence Assessment Hero */}
      {screening && screening.status === 'completed' && (
        <div className="bg-white rounded-card border border-slate-100 shadow-soft overflow-hidden space-y-6 p-6 sm:p-8">
          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              {/* Score Ring */}
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-heading font-black shadow-soft border-2 ${
                  screening.bucket === 'strong'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : screening.bucket === 'potential'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <span className="text-2xl leading-none">{screening.overall}</span>
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider opacity-80">
                  / 100
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                      screening.bucket === 'strong'
                        ? 'bg-emerald-100 text-emerald-800'
                        : screening.bucket === 'potential'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {screening.bucket} Fit Tier
                  </span>

                  {/* Provider Badge */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      isGemini
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {providerBadgeLabel}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1.5 max-w-xl">
                  {screening.summary}
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              <div>Screened {formatRelativeTime(screening.screenedAt)}</div>
              <div>Engine v{screening.scoringVersion}</div>
            </div>
          </div>

          {/* Sub-Score Bars */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo" />
              Calibrated Sub-Score Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { key: 'skills', label: 'Technical Skills' },
                { key: 'experience', label: 'Experience Tenure' },
                { key: 'projects', label: 'Project Depth' },
                { key: 'education', label: 'Education Degree' },
                { key: 'roleAlignment', label: 'Role Alignment' }
              ].map(({ key, label }) => {
                const weight = screening.weightsUsed?.[key] ?? 0;
                const score = screening.subScores?.[key] ?? 0;
                const isDropped = weight === 0;

                return (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-ink">{label}</span>
                      <span className="text-slate-400 font-medium">
                        {isDropped ? 'N/A (0%)' : `${weight}% wt`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            score >= 75
                              ? 'bg-emerald-500'
                              : score >= 50
                              ? 'bg-blue-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, isDropped ? 0 : score)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-ink shrink-0">
                        {isDropped ? '—' : `${score}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Concerns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Strengths */}
            <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <Check className="w-4 h-4" />
                Key Profile Strengths
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {(screening.strengths || []).map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Concerns ("Why candidate may not fit") */}
            <div className="p-5 rounded-xl border border-rose-100 bg-rose-50/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                Concerns & Potential Gaps (Why Candidate May Not Fit)
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {(screening.concerns || []).map((cn, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>{cn}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Skill Matches & Verbatim Evidence Quotes */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Quote className="w-4 h-4 text-indigo" />
                Skill Matches & Verbatim Resume Evidence
              </h3>
              <span className="text-[11px] text-slate-400">
                Click any skill with evidence to expand verbatim quotes
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {(screening.skillMatches || []).map((sm, idx) => {
                const isExpanded = Boolean(expandedSkills[sm.skill]);
                const hasEvidence = Array.isArray(sm.evidence) && sm.evidence.length > 0;

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 transition space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-ink">{sm.skill}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          ({sm.kind})
                        </span>

                        {/* Status Chip */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            sm.status === 'matched'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sm.status === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {sm.status}
                        </span>

                        {sm.matchedWith && sm.matchedWith.toLowerCase() !== sm.skill.toLowerCase() && (
                          <span className="text-[11px] text-slate-500">
                            via term <em className="font-medium text-slate-700">"{sm.matchedWith}"</em>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                          Similarity: {Math.round((sm.similarity || 0) * 100)}%
                        </span>

                        {hasEvidence ? (
                          <button
                            type="button"
                            onClick={() => toggleSkillExpand(sm.skill)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-hover"
                          >
                            <span>{sm.evidence.length} Quote{sm.evidence.length > 1 ? 's' : ''}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : sm.status !== 'missing' ? (
                          <span className="text-[11px] text-slate-400 italic">
                            claimed, no supporting evidence
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Expandable Verbatim Quotes */}
                    {isExpanded && hasEvidence && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5 pl-2">
                        {sm.evidence.map((quote, qIdx) => (
                          <div
                            key={qIdx}
                            className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 italic flex items-start gap-2 shadow-xs"
                          >
                            <Quote className="w-3.5 h-3.5 text-indigo shrink-0 mt-0.5 not-italic" />
                            <span>"{quote}"</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Experience & Top Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Experience Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo" />
                Verified Experience Analysis
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Tenure</div>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {screening.experience?.totalYears ?? 0} Yrs
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-indigo font-semibold uppercase">Relevant Tenure</div>
                  <div className="text-sm font-bold text-indigo mt-0.5">
                    {screening.experience?.relevantYears ?? 0} Yrs
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Required Min</div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">
                    {screening.experience?.requiredMin ?? 0} Yrs
                  </div>
                </div>
              </div>
            </div>

            {/* Top Projects Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo" />
                Top Relevant Projects
              </h4>
              {screening.topProjects && screening.topProjects.length > 0 ? (
                <div className="space-y-2">
                  {screening.topProjects.map((p, pIdx) => (
                    <div key={pIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{p.title}</span>
                        <span className="text-[10px] font-bold text-indigo bg-indigo-50 px-1.5 py-0.5 rounded">
                          {Math.round((p.relevance || 0) * 100)}% relevant
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No project portfolio entries detected.</p>
              )}
            </div>
          </div>

          {/* Collapsible Criteria Used */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCriteriaUsed(!showCriteriaUsed)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-ink"
            >
              <span>Audit Info & Criteria Used for Scoring</span>
              {showCriteriaUsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showCriteriaUsed && (
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Model Used</div>
                    <div className="font-semibold text-ink">{screening.model}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Provider</div>
                    <div className="font-semibold text-ink">{screening.provider}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Screened At</div>
                    <div className="font-semibold text-ink">{formatDate(screening.screenedAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Scoring Algorithm</div>
                    <div className="font-semibold text-ink">Deterministic v{screening.scoringVersion}</div>
                  </div>
                </div>

                {/* Hard Rule Results */}
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Hard Rule Results
                  </div>
                  <div className="space-y-1">
                    {(screening.ruleResults || []).map((rr, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-2 text-[11px]">
                        {rr.passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span className={rr.passed ? 'text-slate-700' : 'text-rose-700 font-semibold'}>
                          {rr.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Recruiter Assessment Footer */}
          <div className="text-center pt-2 text-[11px] text-slate-400 border-t border-slate-100 italic">
            AI-assisted assessment: the hiring decision stays with the recruiter.
          </div>
        </div>
      )}

      {/* Main Detail Grid (Resume, Candidate Information, Notes, Stage History) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Resume & Profile Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Resume Card */}
          <div className="bg-white p-6 sm:p-8 rounded-card border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-ink text-sm sm:text-base">
                    {app.resume?.originalName || 'Attached Resume'}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Uploaded {formatDate(app.resume?.uploadedAt || app.createdAt)}
                  </div>
                </div>
              </div>

              {!isAnonymized ? (
                <a
                  href={`/api/resumes/${app.resume?._id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo hover:bg-indigo-hover rounded-xl shadow-soft transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </a>
              ) : (
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                  Resume download locked during Blind Screening
                </span>
              )}
            </div>

            {/* Extracted & Redacted Profile Summary */}
            {app.resume?.parsedProfile?.summary && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Extracted Professional Summary
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {app.resume.parsedProfile.summary}
                </p>
              </div>
            )}
          </div>

          {/* Candidate Profile Details (Hidden in Blind Screening) */}
          {!isAnonymized ? (
            <div className="bg-white p-6 sm:p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
              <h3 className="font-heading font-bold text-ink text-base">Candidate Profile Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Email Address</span>
                  <span className="font-medium text-ink">{app.candidate?.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-medium text-ink">{app.candidate?.phone || profile.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Location</span>
                  <span className="font-medium text-ink">{app.candidate?.location || profile.location || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Experience</span>
                  <span className="font-medium text-ink">
                    {profile.totalExperienceYears !== undefined ? `${profile.totalExperienceYears} Years` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-card border border-slate-200 text-center space-y-1 text-slate-500 text-xs">
              <p className="font-semibold text-ink">Candidate Details Anonymized</p>
              <p>Personal identifying information and direct links are protected under blind screening guidelines.</p>
            </div>
          )}
        </div>

        {/* Right 1 Col: Stage Mover & Recruiter Notes */}
        <div className="space-y-6">
          {/* Stage Mover Card */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-soft space-y-4">
            <h3 className="font-heading font-bold text-ink text-sm uppercase tracking-wider">
              Update Application Stage
            </h3>

            <form onSubmit={handleStageSubmit} className="space-y-3">
              <select
                value={selectedStage || currentStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-ink outline-none focus:border-indigo"
              >
                {APPLICATION_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_CONFIG[s]?.label || s}
                  </option>
                ))}
              </select>

              <textarea
                rows={2}
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                placeholder="Optional stage change note..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo"
              />

              <button
                type="submit"
                disabled={stageMutation.isPending}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo hover:bg-indigo-hover rounded-xl shadow-soft disabled:opacity-50 transition"
              >
                {stageMutation.isPending ? 'Updating Stage...' : 'Confirm Stage Change'}
              </button>
            </form>
          </div>

          {/* Internal Recruiter Notes */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-soft space-y-4">
            <h3 className="font-heading font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo" />
              Recruiter Notes ({app.recruiterNotes?.length || 0})
            </h3>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add private evaluation notes..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo"
              />
              <button
                type="submit"
                disabled={noteMutation.isPending || !newNoteText.trim()}
                className="w-full py-2 text-xs font-semibold text-indigo bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
              >
                {noteMutation.isPending ? 'Saving Note...' : 'Add Note'}
              </button>
            </form>

            <div className="space-y-2 pt-2 max-h-60 overflow-y-auto">
              {(app.recruiterNotes || []).map((n, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <p className="text-slate-700 leading-relaxed">{n.text}</p>
                  <div className="text-[10px] text-slate-400">
                    {n.author?.name || 'Recruiter'} • {formatRelativeTime(n.at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailPage;
