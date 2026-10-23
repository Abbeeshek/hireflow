import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPublicJobById, applyToJob } from '../../api/jobsApi.js';
import { getResumes, uploadResume } from '../../api/candidateApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import toast from 'react-hot-toast';
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Award,
  Layers,
  CheckCircle,
  ArrowLeft,
  Send,
  UploadCloud,
  FileText
} from 'lucide-react';

export const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isCandidate } = useAuth();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Fetch job details
  const { data: jobData, isLoading, isError } = useQuery({
    queryKey: ['jobDetail', id],
    queryFn: () => getPublicJobById(id)
  });

  // Fetch candidate resumes if candidate is logged in
  const { data: resumesData, refetch: refetchResumes } = useQuery({
    queryKey: ['candidateResumes'],
    queryFn: () => getResumes(),
    enabled: isAuthenticated && isCandidate
  });

  const job = jobData?.data?.job;
  const resumes = resumesData?.data?.resumes || [];

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: (payload) => applyToJob(id, payload),
    onSuccess: () => {
      toast.success('Your application was successfully submitted!');
      setIsApplyModalOpen(false);
      navigate('/candidate/dashboard');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit application');
    }
  });

  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      toast.error('Please select a resume to attach to your application');
      return;
    }
    if (!aiConsent) {
      toast.error('Please accept the AI screening consent to submit your application');
      return;
    }
    applyMutation.mutate({
      resumeId: selectedResumeId,
      coverNote,
      aiConsent: true
    });
  };

  const handleQuickUploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 5 MB');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploadingResume(true);
      const res = await uploadResume(formData);
      if (res.success && res.data?.resume) {
        toast.success('Resume uploaded successfully!');
        await refetchResumes();
        setSelectedResumeId(res.data.resume._id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading job information..." />;
  if (isError || !job) {
    return (
      <EmptyState
        title="Job not found"
        description="This job opening may have been closed or is no longer accessible."
        action={
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Jobs
          </Link>
        }
      />
    );
  }

  const weights = job.scoringWeights || {
    skills: 30,
    experience: 25,
    projects: 20,
    education: 15,
    roleAlignment: 10
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all jobs
        </Link>
      </div>

      {/* Main Job Header Card */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo">
              {job.company?.name || 'Acme Tech'} • {job.department}
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
              {job.title}
            </h1>
            <p className="text-xs text-slate-400">
              Published {formatDate(job.publishedAt || job.createdAt)}
            </p>
          </div>

          <div>
            {isAuthenticated ? (
              isCandidate ? (
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo text-white font-semibold shadow-soft hover:bg-indigo-hover transition transform hover:-translate-y-0.5"
                >
                  <Send className="w-4 h-4" />
                  Apply Now
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  Signed in as {user.role}
                </div>
              )
            ) : (
              <Link
                to={`/login?redirect=/jobs/${job._id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo text-white font-semibold shadow-soft hover:bg-indigo-hover transition"
              >
                Sign In to Apply
              </Link>
            )}
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Location</div>
              <div className="text-xs font-medium text-ink">{job.location}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Work Mode</div>
              <div className="text-xs font-medium text-ink capitalize">{job.workMode}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Experience</div>
              <div className="text-xs font-medium text-ink">
                {job.experienceMin} - {job.experienceMax} Yrs
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Openings</div>
              <div className="text-xs font-medium text-ink">{job.openings} Positions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Requirements */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-8">
        {/* Description */}
        <div className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-ink">Role Overview</h2>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {job.description}
          </div>
        </div>

        {/* Required Skills */}
        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-ink">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs font-semibold rounded-pill bg-lavender-light text-indigo border border-lavender/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Skills */}
        {job.preferredSkills && job.preferredSkills.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-ink">Preferred Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.preferredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs font-medium rounded-pill bg-slate-100 text-slate-600 border border-slate-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scoring Weights Architecture */}
        <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 space-y-4">
          <div className="flex items-center gap-2 text-indigo">
            <Layers className="w-5 h-5" />
            <h3 className="font-heading text-base font-bold">Candidate Evaluation Criteria</h3>
          </div>
          <p className="text-xs text-slate-500">
            This job role evaluates candidates across 5 key dimensions with customized scoring weights summing to 100%:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-white rounded-xl border border-indigo-50 text-center shadow-xs">
              <div className="text-lg font-bold text-indigo">{weights.skills}%</div>
              <div className="text-[11px] font-medium text-slate-500">Skills Match</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-50 text-center shadow-xs">
              <div className="text-lg font-bold text-indigo">{weights.experience}%</div>
              <div className="text-[11px] font-medium text-slate-500">Experience</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-50 text-center shadow-xs">
              <div className="text-lg font-bold text-indigo">{weights.projects}%</div>
              <div className="text-[11px] font-medium text-slate-500">Projects</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-50 text-center shadow-xs">
              <div className="text-lg font-bold text-indigo">{weights.education}%</div>
              <div className="text-[11px] font-medium text-slate-500">Education</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-50 text-center shadow-xs">
              <div className="text-lg font-bold text-indigo">{weights.roleAlignment}%</div>
              <div className="text-[11px] font-medium text-slate-500">Role Alignment</div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={`Apply for ${job.title}`}
      >
        <form onSubmit={handleApplySubmit} className="space-y-6">
          {/* Resume Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">
              Select Resume <span className="text-danger">*</span>
            </label>

            {resumes.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {resumes.map((r) => (
                  <label
                    key={r._id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedResumeId === r._id
                        ? 'border-indigo bg-indigo-50/40 ring-1 ring-indigo'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="resumeChoice"
                        value={r._id}
                        checked={selectedResumeId === r._id}
                        onChange={() => setSelectedResumeId(r._id)}
                        className="text-indigo focus:ring-indigo"
                      />
                      <div>
                        <div className="text-xs font-semibold text-ink">{r.originalName}</div>
                        <div className="text-[11px] text-slate-400">
                          Uploaded {formatDate(r.uploadedAt)}
                        </div>
                      </div>
                    </div>
                    <FileText className="w-4 h-4 text-slate-400" />
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                <p className="text-xs text-slate-500">No resumes uploaded yet.</p>
              </div>
            )}

            {/* Quick Upload Option */}
            <div className="pt-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition">
                <UploadCloud className="w-4 h-4" />
                {uploadingResume ? 'Uploading...' : 'Upload New Resume (PDF, DOC, DOCX up to 5MB)'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleQuickUploadResume}
                  disabled={uploadingResume}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Cover Note */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-ink">
              Cover Note <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={4}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Why are you a great match for this position?"
              className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:border-indigo focus:ring-2 focus:ring-indigo/10 outline-none transition"
            />
          </div>

          {/* AI Screening Consent Notice */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="mt-0.5 rounded text-indigo focus:ring-indigo h-4 w-4 cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I understand my application is assessed with AI assistance and a human makes the final decision.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applyMutation.isPending || !selectedResumeId || !aiConsent}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo hover:bg-indigo-hover rounded-xl shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-3.5 h-3.5" />
              {applyMutation.isPending ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default JobDetailPage;
