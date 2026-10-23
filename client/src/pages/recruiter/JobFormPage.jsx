import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPublicJobById } from '../../api/jobsApi.js';
import { createJob, updateJob, generateJobCriteria } from '../../api/recruiterApi.js';
import { WORK_MODES, EMPLOYMENT_TYPES } from '../../utils/constants.js';
import SkillTagInput from '../../components/SkillTagInput.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import toast from 'react-hot-toast';
import {
  Briefcase,
  Layers,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Sparkles,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  Check
} from 'lucide-react';

export const JobFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('full-time');
  const [workMode, setWorkMode] = useState('hybrid');
  const [openings, setOpenings] = useState(1);
  const [experienceMin, setExperienceMin] = useState(2);
  const [experienceMax, setExperienceMax] = useState(5);
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [preferredSkills, setPreferredSkills] = useState([]);
  const [status, setStatus] = useState('published');

  // Phase 2 Additive Fields
  const [mustHaveSkills, setMustHaveSkills] = useState([]);
  const [enforceMinExperience, setEnforceMinExperience] = useState(true);
  const [educationLevel, setEducationLevel] = useState('none');
  const [preferredEducationFields, setPreferredEducationFields] = useState([]);
  const [blindScreening, setBlindScreening] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  // AI Criteria Generation Drawer / Panel
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Scoring weights (default sum = 100)
  const [weights, setWeights] = useState({
    skills: 30,
    experience: 25,
    projects: 20,
    education: 15,
    roleAlignment: 10
  });

  const weightSum =
    (Number(weights.skills) || 0) +
    (Number(weights.experience) || 0) +
    (Number(weights.projects) || 0) +
    (Number(weights.education) || 0) +
    (Number(weights.roleAlignment) || 0);

  const isWeightValid = weightSum === 100;

  // Load existing job if editing
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: ['jobEdit', id],
    queryFn: () => getPublicJobById(id),
    enabled: isEdit
  });

  useEffect(() => {
    if (isEdit && jobData?.data?.job) {
      const j = jobData.data.job;
      setTitle(j.title || '');
      setDepartment(j.department || '');
      setLocation(j.location || '');
      setEmploymentType(j.employmentType || 'full-time');
      setWorkMode(j.workMode || 'hybrid');
      setOpenings(j.openings || 1);
      setExperienceMin(j.experienceMin || 0);
      setExperienceMax(j.experienceMax || 1);
      setDescription(j.description || '');
      setRequiredSkills(j.requiredSkills || []);
      setPreferredSkills(j.preferredSkills || []);
      setMustHaveSkills(j.mustHaveSkills || []);
      setEnforceMinExperience(j.enforceMinExperience !== false);
      setEducationLevel(j.educationRequirement?.minLevel || 'none');
      setPreferredEducationFields(j.educationRequirement?.preferredFields || []);
      setBlindScreening(Boolean(j.blindScreening));
      setAiSuggested(Boolean(j.aiSuggested));
      setStatus(j.status || 'draft');
      if (j.scoringWeights) {
        setWeights(j.scoringWeights);
      }
    }
  }, [isEdit, jobData]);

  // Handle AI Criteria Generation
  const handleGenerateAiCriteria = async () => {
    if (!title.trim()) {
      toast.error('Please enter a Job Title before generating criteria with AI');
      return;
    }
    if (!aiBrief.trim() || aiBrief.trim().length < 5) {
      toast.error('Please provide a brief summary of the role (at least 5 characters)');
      return;
    }

    try {
      setIsGeneratingAi(true);
      const res = await generateJobCriteria({
        title: title.trim(),
        brief: aiBrief.trim(),
        experienceMin: Number(experienceMin) || 0,
        experienceMax: Number(experienceMax) || 5
      });

      if (res.success && res.data?.criteria) {
        const c = res.data.criteria;
        setDescription(c.description || description);
        setRequiredSkills(c.requiredSkills || requiredSkills);
        setPreferredSkills(c.preferredSkills || preferredSkills);
        setMustHaveSkills(c.suggestedMustHaveSkills || []);
        if (c.scoringWeights) {
          setWeights(c.scoringWeights);
        }
        setAiSuggested(true);
        setIsAiPanelOpen(false);
        toast.success('AI suggestions applied! Please review details before saving.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI criteria');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Toggle must-have skill
  const toggleMustHaveSkill = (skill) => {
    setMustHaveSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => createJob(payload),
    onSuccess: () => {
      toast.success('Job created successfully!');
      queryClient.invalidateQueries(['recruiterJobs']);
      queryClient.invalidateQueries(['recruiterDashboard']);
      navigate('/recruiter/jobs');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create job');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateJob(id, payload),
    onSuccess: () => {
      toast.success('Job updated successfully!');
      queryClient.invalidateQueries(['recruiterJobs']);
      queryClient.invalidateQueries(['recruiterDashboard']);
      navigate('/recruiter/jobs');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update job');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isWeightValid) {
      toast.error(`Scoring weights must sum to exactly 100% (currently ${weightSum}%)`);
      return;
    }

    if (Number(experienceMax) < Number(experienceMin)) {
      toast.error('Maximum experience must be greater than or equal to minimum experience');
      return;
    }

    const payload = {
      title,
      department,
      location,
      employmentType,
      workMode,
      openings: Number(openings),
      experienceMin: Number(experienceMin),
      experienceMax: Number(experienceMax),
      description,
      requiredSkills,
      preferredSkills,
      mustHaveSkills,
      enforceMinExperience,
      educationRequirement: {
        minLevel: educationLevel,
        preferredFields: preferredEducationFields
      },
      blindScreening,
      aiSuggested,
      status,
      scoringWeights: {
        skills: Number(weights.skills),
        experience: Number(weights.experience),
        projects: Number(weights.projects),
        education: Number(weights.education),
        roleAlignment: Number(weights.roleAlignment)
      }
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleWeightChange = (key, value) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, Number(value) || 0))
    }));
  };

  if (isLoadingJob) {
    return <LoadingSpinner text="Loading job configuration..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/recruiter/jobs"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-ink hover:border-slate-300 transition shadow-soft"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
              {isEdit ? 'Edit Job Opening' : 'Create Job Opening'}
            </h1>
            <p className="text-xs text-slate-400">
              Configure role responsibilities, required criteria, and screening rules.
            </p>
          </div>
        </div>

        {/* AI Generator Button */}
        <button
          type="button"
          onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo to-indigo-hover text-white text-xs font-semibold shadow-soft hover:opacity-95 transition"
        >
          <Sparkles className="w-4 h-4" />
          {isAiPanelOpen ? 'Close AI Assistant' : 'Generate with AI'}
        </button>
      </div>

      {/* AI Suggestions Review Banner */}
      {aiSuggested && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 shadow-soft">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">AI-suggested criteria applied: </span>
            Role description, essential skills, and evaluation weights have been drafted by the AI assistant. Review, customize, and verify before publishing.
          </div>
        </div>
      )}

      {/* AI Generator Panel */}
      {isAiPanelOpen && (
        <div className="p-6 bg-white rounded-card border-2 border-indigo/20 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-heading text-sm font-bold text-ink">AI Job Brief Architect</h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Phase 2 Intelligence
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Enter a role title and brief description. The AI provider will draft an engaging role overview, extract core and preferred skills, suggest must-have hard rules, and calibrate 100% scoring weights.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Role Brief or Requirements Notes
            </label>
            <textarea
              rows={3}
              value={aiBrief}
              onChange={(e) => setAiBrief(e.target.value)}
              placeholder="e.g. Need a senior engineer to lead our microservices migration. Strong Node.js, Express, and MongoDB background with Docker containerization experience."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={handleGenerateAiCriteria}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo hover:bg-indigo-hover rounded-xl shadow-soft disabled:opacity-50 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGeneratingAi ? 'Generating Criteria...' : 'Populate Job Form'}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Job Details Card */}
        <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo">
            <Briefcase className="w-5 h-5" />
            <h2 className="font-heading text-lg font-bold text-ink">Role Specification</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Job Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Backend Systems Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Department <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Platform Infrastructure"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Location <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. San Francisco, CA or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
              >
                {WORK_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Open Positions (Openings)
              </label>
              <input
                type="number"
                min="1"
                value={openings}
                onChange={(e) => setOpenings(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                  Min Exp (Yrs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={experienceMin}
                  onChange={(e) => setExperienceMin(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                  Max Exp (Yrs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={experienceMax}
                  onChange={(e) => setExperienceMax(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Publication Status
              </label>
              <div className="flex items-center gap-4 pt-1">
                {['published', 'draft', 'closed'].map((st) => (
                  <label key={st} className="flex items-center gap-2 cursor-pointer text-xs font-semibold capitalize text-slate-700">
                    <input
                      type="radio"
                      name="jobStatus"
                      value={st}
                      checked={status === st}
                      onChange={() => setStatus(st)}
                      className="text-indigo focus:ring-indigo"
                    />
                    {st}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Job Description & Responsibilities <span className="text-danger">*</span>
            </label>
            <textarea
              rows={6}
              required
              placeholder="Outline role objectives, day-to-day duties, and team context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          {/* Skills */}
          <div className="space-y-4 pt-2">
            <SkillTagInput
              skills={requiredSkills}
              onChange={setRequiredSkills}
              label="Required Skills"
              placeholder="Type required skill (e.g. React, PostgreSQL) and hit Enter"
            />

            {/* Must-Have Hard Rule Toggles */}
            {requiredSkills.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <ShieldCheck className="w-4 h-4 text-indigo" />
                  Must-Have Non-Negotiable Skills (Hard Rule)
                </div>
                <p className="text-[11px] text-slate-500">
                  Select which required skills are strictly mandatory. Missing any must-have automatically flags a candidate into the Low match bucket.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {requiredSkills.map((s) => {
                    const isMustHave = mustHaveSkills.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => toggleMustHaveSkill(s)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                          isMustHave
                            ? 'bg-indigo text-white shadow-soft'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {isMustHave && <Check className="w-3 h-3" />}
                        {s} {isMustHave ? '(Must-Have)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <SkillTagInput
              skills={preferredSkills}
              onChange={setPreferredSkills}
              label="Preferred / Nice-to-Have Skills (Weighted at 50%)"
              placeholder="Type preferred skill (e.g. GraphQL, AWS) and hit Enter"
            />
          </div>
        </div>

        {/* Screening Governance & Bias Prevention Card */}
        <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo">
            <EyeOff className="w-5 h-5" />
            <h2 className="font-heading text-lg font-bold text-ink">Screening Governance & Fair Hiring</h2>
          </div>

          <div className="space-y-5">
            {/* Blind Screening Toggle */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <EyeOff className="w-4 h-4 text-indigo" />
                  Blind Screening Mode
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Mitigate unconscious bias. Anonymizes candidate names into codenames (e.g. "Candidate A-1042"), hides contact information, and restricts raw resume downloads until candidates are shortlisted.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={blindScreening}
                  onChange={(e) => setBlindScreening(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo"></div>
              </label>
            </div>

            {/* Experience Hard Rule */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-ink">
                  Enforce Minimum Experience Rule
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  When enabled, candidates with verified experience tenure below {experienceMin} years will fail the hard rule and be placed in the Low bucket with a clear audit reason.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={enforceMinExperience}
                  onChange={(e) => setEnforceMinExperience(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo"></div>
              </label>
            </div>

            {/* Education Requirements */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <GraduationCap className="w-4 h-4 text-indigo" />
                Education Requirement
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                    Minimum Degree Level
                  </label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:border-indigo outline-none transition"
                  >
                    <option value="none">None (Education N/A - Renormalize Weights)</option>
                    <option value="diploma">Diploma / Associate</option>
                    <option value="bachelor">Bachelor's Degree</option>
                    <option value="master">Master's Degree</option>
                    <option value="phd">Ph.D. / Doctorate</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <SkillTagInput
                    skills={preferredEducationFields}
                    onChange={setPreferredEducationFields}
                    label="Preferred Degree Fields (Optional)"
                    placeholder="e.g. Computer Science, Electrical Engineering"
                  />
                </div>
              </div>

              {educationLevel === 'none' && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: When set to "None", education will be dropped during screening and the remaining 4 evaluation categories will automatically be renormalized to 100%.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scoring Weights Architecture Editor */}
        <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-indigo">
              <Sliders className="w-5 h-5" />
              <h2 className="font-heading text-lg font-bold text-ink">
                Deterministic Scoring Architecture
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Weight Total:</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isWeightValid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {weightSum}% / 100%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { key: 'skills', label: 'Technical Skills' },
              { key: 'experience', label: 'Tenure Relevance' },
              { key: 'projects', label: 'Projects Depth' },
              { key: 'education', label: 'Education Degree' },
              { key: 'roleAlignment', label: 'Role Alignment' }
            ].map(({ key, label }) => (
              <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block text-[11px] font-semibold text-ink">{label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[key]}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo outline-none text-center font-bold text-ink"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/recruiter/jobs"
            className="px-5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending || !isWeightValid}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo hover:bg-indigo-hover rounded-xl shadow-soft disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving Job...'
              : isEdit
              ? 'Update Job Opening'
              : 'Publish Job Opening'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobFormPage;
