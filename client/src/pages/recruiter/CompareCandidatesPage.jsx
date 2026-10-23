import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { compareApplications } from '../../api/recruiterApi.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StageBadge from '../../components/StageBadge.jsx';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip
} from 'recharts';
import {
  ArrowLeft,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
  Check,
  Minus,
  X,
  FileCheck,
  Info
} from 'lucide-react';

const CANDIDATE_COLORS = [
  { stroke: '#4F46E5', fill: '#4F46E5', fillOpacity: 0.25, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { stroke: '#059669', fill: '#059669', fillOpacity: 0.25, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { stroke: '#D97706', fill: '#D97706', fillOpacity: 0.25, badge: 'bg-amber-50 text-amber-700 border-amber-200' }
];

export const CompareCandidatesPage = () => {
  const { id: jobId } = useParams();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const applicationIds = idsParam ? idsParam.split(',').filter(Boolean) : [];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['compareApplications', jobId, idsParam],
    queryFn: () => compareApplications(jobId, applicationIds),
    enabled: applicationIds.length >= 2 && applicationIds.length <= 3
  });

  if (applicationIds.length < 2 || applicationIds.length > 3) {
    return (
      <div className="space-y-6">
        <Link
          to={`/recruiter/jobs/${jobId}/applicants`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to applicants
        </Link>
        <EmptyState
          icon={GitCompare}
          title="Invalid Comparison Selection"
          description="Please select between 2 and 3 candidates from the applicants pipeline table to compare."
          action={
            <Link
              to={`/recruiter/jobs/${jobId}/applicants`}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo text-white hover:bg-indigo-hover"
            >
              Return to Applicants
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to={`/recruiter/jobs/${jobId}/applicants`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to applicants
        </Link>
        <LoadingSpinner text="Computing multidimensional candidate comparison..." />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="space-y-6">
        <Link
          to={`/recruiter/jobs/${jobId}/applicants`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to applicants
        </Link>
        <EmptyState
          title="Comparison Failed"
          description={error?.message || 'Could not load comparative data for the selected candidates.'}
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo text-white hover:bg-indigo-hover"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const { job, applications, skillMatrix } = data.data;

  // Prepare radar chart dimensions
  const radarCategories = [
    { key: 'skills', label: 'Skills' },
    { key: 'experience', label: 'Experience' },
    { key: 'projects', label: 'Projects' },
    { key: 'education', label: 'Education' },
    { key: 'roleAlignment', label: 'Role Alignment' }
  ];

  const radarData = radarCategories.map(({ key, label }) => {
    const item = { subject: label };
    applications.forEach((app, idx) => {
      const sub = app.screening?.subScores?.[key];
      item[`candidate_${idx}`] = typeof sub === 'number' ? sub : 0;
    });
    return item;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="space-y-2">
        <Link
          to={`/recruiter/jobs/${jobId}/applicants`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to applicants pipeline
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo rounded-lg">
                <GitCompare className="w-5 h-5" />
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                Candidate Comparison
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {job?.title} • Comparing {applications.length} candidates across deterministic scoring dimensions
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Recruiter makes all hiring decisions. No automated winner.</span>
          </div>
        </div>
      </div>

      {/* Candidate Overview Hero Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-${applications.length} gap-4`}>
        {applications.map((app, idx) => {
          const color = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
          const screening = app.screening || {};
          const isStrong = screening.bucket === 'strong';
          const isPotential = screening.bucket === 'potential';

          return (
            <div
              key={app._id}
              className="bg-white rounded-card p-5 border border-slate-100 shadow-soft relative overflow-hidden space-y-4"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: color.stroke }}
              />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color.stroke }}
                    />
                    <h2 className="font-heading text-lg font-bold text-ink">
                      {app.candidate?.name || `Candidate ${idx + 1}`}
                    </h2>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StageBadge stage={app.stage} size="small" />
                    <Link
                      to={`/recruiter/applications/${app._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo hover:underline inline-flex items-center gap-0.5"
                    >
                      View Profile <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Score badge */}
                <div className="text-right">
                  <div className="text-2xl font-black font-heading text-ink">
                    {screening.overall ?? 0}%
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border capitalize ${
                      isStrong
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isPotential
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {screening.bucket || 'Unscreened'}
                  </span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Relevant Experience</span>
                  <span className="font-semibold text-ink">
                    {screening.experience?.relevantYears !== undefined
                      ? `${screening.experience.relevantYears} yrs`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Top Matched Skills</span>
                  <span className="font-semibold text-ink">
                    {(screening.skillMatches || []).filter((s) => s.status === 'matched').length} /{' '}
                    {(screening.skillMatches || []).length}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar Chart & Sub-score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart */}
        <div className="lg:col-span-5 bg-white rounded-card p-6 border border-slate-100 shadow-soft flex flex-col items-center">
          <h3 className="font-heading font-bold text-sm text-ink mb-1 self-start">
            Competency Radar
          </h3>
          <p className="text-[11px] text-slate-500 mb-4 self-start">
            Multidimensional score distribution (0-100 scale)
          </p>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '11px',
                    border: 'none'
                  }}
                />
                {applications.map((app, idx) => {
                  const color = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
                  return (
                    <Radar
                      key={app._id}
                      name={app.candidate?.name || `Candidate ${idx + 1}`}
                      dataKey={`candidate_${idx}`}
                      stroke={color.stroke}
                      fill={color.fill}
                      fillOpacity={color.fillOpacity}
                    />
                  );
                })}
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sub-Score Table */}
        <div className="lg:col-span-7 bg-white rounded-card p-6 border border-slate-100 shadow-soft">
          <h3 className="font-heading font-bold text-sm text-ink mb-1">
            Sub-Score Comparison Table
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">
            Component scores computed deterministically from candidate evidence
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Scoring Dimension</th>
                  <th className="py-2.5 px-2 text-center">Weight</th>
                  {applications.map((app, idx) => (
                    <th key={app._id} className="py-2.5 px-3 text-center">
                      <span className="font-bold text-ink truncate max-w-[120px] inline-block">
                        {app.candidate?.name || `Candidate ${idx + 1}`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {radarCategories.map(({ key, label }) => {
                  const weight = applications[0]?.screening?.weightsUsed?.[key] ?? job?.scoringWeights?.[key] ?? 0;
                  return (
                    <tr key={key} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-medium text-ink">{label}</td>
                      <td className="py-3 px-2 text-center text-slate-400 font-mono text-[11px]">
                        {weight}%
                      </td>
                      {applications.map((app, idx) => {
                        const val = app.screening?.subScores?.[key] ?? 0;
                        const color = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
                        return (
                          <td key={app._id} className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 font-bold">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: color.stroke }}
                              />
                              <span className="font-mono text-xs">{val}</span>
                              <span className="text-[10px] text-slate-400 font-normal">/100</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Overall Row */}
                <tr className="bg-slate-50/70 font-bold">
                  <td className="py-3 px-3 text-ink">Overall Match Score</td>
                  <td className="py-3 px-2 text-center text-slate-500 font-mono text-[11px]">100%</td>
                  {applications.map((app) => (
                    <td key={app._id} className="py-3 px-3 text-center">
                      <span className="text-sm font-black font-heading text-indigo">
                        {app.screening?.overall ?? 0}%
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Skill Matrix Comparison */}
      <div className="bg-white rounded-card p-6 border border-slate-100 shadow-soft space-y-4">
        <div>
          <h3 className="font-heading font-bold text-sm text-ink">Skill Matrix</h3>
          <p className="text-[11px] text-slate-500">
            Side-by-side verification of required and preferred skills against candidate resumes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Skill</th>
                <th className="py-2.5 px-2 text-center">Requirement</th>
                {applications.map((app, idx) => (
                  <th key={app._id} className="py-2.5 px-3 text-center">
                    <span className="font-bold text-ink">
                      {app.candidate?.name || `Candidate ${idx + 1}`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {skillMatrix.map((row) => (
                <tr key={row.skill} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-semibold text-ink">{row.skill}</td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        row.kind === 'required'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.kind}
                    </span>
                  </td>

                  {applications.map((app) => {
                    const match = row.candidates[String(app._id)] || {
                      status: 'missing',
                      similarity: 0,
                      hasEvidence: false
                    };
                    const isMatched = match.status === 'matched';
                    const isPartial = match.status === 'partial';

                    return (
                      <td key={app._id} className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isMatched
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isPartial
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isMatched ? (
                              <Check className="w-3 h-3" />
                            ) : isPartial ? (
                              <Minus className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span className="capitalize">{match.status}</span>
                            {match.similarity > 0 && (
                              <span className="text-[10px] opacity-75 font-normal">
                                ({Math.round(match.similarity * 100)}%)
                              </span>
                            )}
                          </span>

                          {match.hasEvidence ? (
                            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-medium">
                              <FileCheck className="w-3 h-3" /> Resume evidence verified
                            </span>
                          ) : isMatched || isPartial ? (
                            <span className="text-[10px] text-slate-400 italic">
                              Claimed, no supporting evidence
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strengths & Concerns Side-by-Side */}
      <div className="space-y-4">
        <div>
          <h3 className="font-heading font-bold text-sm text-ink">
            Strengths & Concerns (Side-by-Side)
          </h3>
          <p className="text-[11px] text-slate-500">
            Generated plain-English highlights from deterministic match data. Recruiter reviews all points before decision.
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-${applications.length} gap-4`}>
          {applications.map((app, idx) => {
            const screening = app.screening || {};
            const strengths = screening.strengths || [];
            const concerns = screening.concerns || [];
            const color = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];

            return (
              <div
                key={app._id}
                className="bg-white rounded-card p-5 border border-slate-100 shadow-soft space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color.stroke }}
                  />
                  <h4 className="font-heading font-bold text-sm text-ink">
                    {app.candidate?.name || `Candidate ${idx + 1}`}
                  </h4>
                </div>

                {/* AI Summary */}
                {screening.summary && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed italic border border-slate-100">
                    "{screening.summary}"
                  </div>
                )}

                {/* Strengths */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Key Strengths ({strengths.length})
                  </h5>
                  {strengths.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {strengths.map((s, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No specific strengths flagged.</p>
                  )}
                </div>

                {/* Concerns */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Areas to Probe / Fit Concerns ({concerns.length})
                  </h5>
                  {concerns.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {concerns.map((c, cIdx) => (
                        <li key={cIdx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No notable fit concerns identified.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recruiter Decision Disclaimer Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">
          AI-assisted comparative assessment: Human recruiter makes all final hiring decisions.
        </p>
        <p className="text-[11px]">
          Deterministic score weights, semantic embeddings, and resume evidence quotes are designed for decision support only. HireFlow does not automatically select, rank or eliminate candidates.
        </p>
      </div>
    </div>
  );
};

export default CompareCandidatesPage;
