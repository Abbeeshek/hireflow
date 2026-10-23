import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getResumes, uploadResume } from '../../api/candidateApi.js';
import { formatDate, formatFileSize } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import toast from 'react-hot-toast';
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck
} from 'lucide-react';

export const ResumesPage = () => {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['candidateResumes'],
    queryFn: getResumes
  });

  const resumes = data?.data?.resumes || [];

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5 MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setIsUploading(true);
      const res = await uploadResume(formData);
      if (res.success) {
        toast.success('Resume verified and uploaded successfully!');
        queryClient.invalidateQueries(['candidateResumes']);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-ink">Resume Manager</h1>
        <p className="text-sm text-slate-500">
          Upload and manage your verified PDF and Word resumes for job applications.
        </p>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-white p-10 rounded-card border-2 border-dashed transition text-center space-y-4 shadow-soft ${
          isDragging
            ? 'border-indigo bg-indigo-50/30'
            : 'border-slate-200 hover:border-indigo/50'
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-lavender-light flex items-center justify-center text-indigo mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold text-ink">
            {isUploading ? 'Validating and Uploading Resume...' : 'Drop your resume here, or browse'}
          </h3>
          <p className="text-xs text-slate-400">
            Accepts genuine PDF, DOC, or DOCX files up to 5 MB
          </p>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo text-white text-xs font-semibold shadow-soft hover:bg-indigo-hover cursor-pointer transition">
            <FileText className="w-4 h-4" />
            Select File from Device
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={isUploading}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Magic-byte security check
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Private streaming download
          </span>
        </div>
      </div>

      {/* Resumes List */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-bold text-ink">Your Saved Resumes</h2>

        {isLoading ? (
          <LoadingSpinner text="Loading uploaded resumes..." />
        ) : isError ? (
          <EmptyState
            title="Failed to load resumes"
            description="Could not load your saved resumes."
            action={
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
              >
                Retry
              </button>
            }
          />
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes uploaded yet"
            description="Upload your first resume using the box above to start applying for jobs."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {resumes.map((resume) => (
              <div
                key={resume._id}
                className="p-5 bg-white rounded-xl border border-slate-100 shadow-soft flex items-center justify-between gap-4 hover:shadow-hover transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">{resume.originalName}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{formatFileSize(resume.size)}</span>
                      <span>•</span>
                      <span>Uploaded {formatDate(resume.uploadedAt)}</span>
                      <span>•</span>
                      <span className="uppercase text-[10px] font-bold text-indigo bg-indigo-50 px-1.5 py-0.5 rounded">
                        {resume.mimeType.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                      </span>
                      {resume.parseStatus && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            resume.parseStatus === 'done'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : resume.parseStatus === 'processing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              : resume.parseStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {resume.parseStatus === 'done'
                            ? 'AI Parsed'
                            : resume.parseStatus === 'processing'
                            ? 'Parsing...'
                            : resume.parseStatus === 'failed'
                            ? 'Parse Failed'
                            : 'Parse Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/resumes/${resume._id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo hover:text-white hover:bg-indigo bg-indigo-50 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumesPage;
