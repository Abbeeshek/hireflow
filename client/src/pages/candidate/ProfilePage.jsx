import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../../api/candidateApi.js';
import SkillTagInput from '../../components/SkillTagInput.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import toast from 'react-hot-toast';
import {
  User,
  GraduationCap,
  FolderGit2,
  Globe,
  Plus,
  Trash2,
  Save,
  Check
} from 'lucide-react';

export const ProfilePage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['candidateProfile'],
    queryFn: getProfile
  });

  const [headline, setHeadline] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [totalExperienceYears, setTotalExperienceYears] = useState(0);
  const [skills, setSkills] = useState([]);
  const [education, setEducation] = useState([]);
  const [projects, setProjects] = useState([]);
  const [links, setLinks] = useState({ linkedin: '', github: '', portfolio: '' });

  useEffect(() => {
    if (data?.data?.profile) {
      const p = data.data.profile;
      setHeadline(p.headline || '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setTotalExperienceYears(p.totalExperienceYears || 0);
      setSkills(p.skills || []);
      setEducation(p.education || []);
      setProjects(p.projects || []);
      setLinks(p.links || { linkedin: '', github: '', portfolio: '' });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (updatedData) => updateProfile(updatedData),
    onSuccess: () => {
      toast.success('Candidate profile updated successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update profile');
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      headline,
      phone,
      location,
      totalExperienceYears: Number(totalExperienceYears),
      skills,
      education,
      projects,
      links
    });
  };

  // Education helpers
  const addEducation = () => {
    setEducation([...education, { degree: '', institution: '', year: new Date().getFullYear() }]);
  };
  const updateEducationItem = (index, field, value) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };
  const removeEducation = (index) => {
    setEducation(education.filter((_, idx) => idx !== index));
  };

  // Project helpers
  const addProject = () => {
    setProjects([...projects, { title: '', description: '', techStack: [] }]);
  };
  const updateProjectItem = (index, field, value) => {
    const updated = [...projects];
    updated[index][field] = value;
    setProjects(updated);
  };
  const removeProject = (index) => {
    setProjects(projects.filter((_, idx) => idx !== index));
  };

  if (isLoading) return <LoadingSpinner text="Loading candidate profile..." />;

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Candidate Profile</h1>
          <p className="text-sm text-slate-500">
            Showcase your engineering capabilities, career journey, and portfolio.
          </p>
        </div>
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo text-white text-xs font-semibold shadow-soft hover:bg-indigo-hover transition self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Basic Info Card */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo">
          <User className="w-5 h-5" />
          <h2 className="font-heading text-lg font-bold text-ink">Basic Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Professional Headline
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Full Stack Engineer (React, Node.js)"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+1 (555) 012-3456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Total Experience (Years)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={totalExperienceYears}
              onChange={(e) => setTotalExperienceYears(e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>
        </div>

        {/* Skills Tag Input */}
        <div className="pt-2">
          <SkillTagInput
            skills={skills}
            onChange={setSkills}
            label="Technical Skills"
            placeholder="Type skill and press Enter (e.g. TypeScript, React, Docker)"
          />
        </div>
      </div>

      {/* Education Card */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-indigo">
            <GraduationCap className="w-5 h-5" />
            <h2 className="font-heading text-lg font-bold text-ink">Education</h2>
          </div>
          <button
            type="button"
            onClick={addEducation}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-hover transition"
          >
            <Plus className="w-4 h-4" />
            Add Education
          </button>
        </div>

        {education.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No education entries added yet.</p>
        ) : (
          <div className="space-y-4">
            {education.map((edu, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 relative group"
              >
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-danger p-1 rounded-md transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase">
                      Degree
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B.S. in Computer Science"
                      value={edu.degree}
                      onChange={(e) => updateEducationItem(idx, 'degree', e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo"
                    />
                  </div>

                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase">
                      Institution
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={edu.institution}
                      onChange={(e) => updateEducationItem(idx, 'institution', e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo"
                    />
                  </div>

                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase">
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      placeholder="2022"
                      value={edu.year}
                      onChange={(e) => updateEducationItem(idx, 'year', Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Card */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-indigo">
            <FolderGit2 className="w-5 h-5" />
            <h2 className="font-heading text-lg font-bold text-ink">Projects</h2>
          </div>
          <button
            type="button"
            onClick={addProject}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-hover transition"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No projects listed yet.</p>
        ) : (
          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 relative group"
              >
                <button
                  type="button"
                  onClick={() => removeProject(idx)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-danger p-1 rounded-md transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="space-y-3 pr-8">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase">
                      Project Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Cache Cluster"
                      value={proj.title}
                      onChange={(e) => updateProjectItem(idx, 'title', e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief overview of functionality and results achieved..."
                      value={proj.description}
                      onChange={(e) => updateProjectItem(idx, 'description', e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo"
                    />
                  </div>

                  <div>
                    <SkillTagInput
                      skills={proj.techStack || []}
                      onChange={(val) => updateProjectItem(idx, 'techStack', val)}
                      label="Tech Stack"
                      placeholder="e.g. Go, Redis, Docker"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online Profiles / Links */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo">
          <Globe className="w-5 h-5" />
          <h2 className="font-heading text-lg font-bold text-ink">Links & Social Profiles</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              LinkedIn
            </label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={links.linkedin}
              onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              GitHub
            </label>
            <input
              type="url"
              placeholder="https://github.com/username"
              value={links.github}
              onChange={(e) => setLinks({ ...links, github: e.target.value })}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Portfolio
            </label>
            <input
              type="url"
              placeholder="https://myportfolio.dev"
              value={links.portfolio}
              onChange={(e) => setLinks({ ...links, portfolio: e.target.value })}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Submit footer */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo text-white text-sm font-semibold shadow-soft hover:bg-indigo-hover transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </div>
    </form>
  );
};

export default ProfilePage;
