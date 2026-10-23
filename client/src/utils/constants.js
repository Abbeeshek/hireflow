export const APPLICATION_STAGES = [
  'applied',
  'screening',
  'shortlisted',
  'assessment',
  'interview1',
  'interview2',
  'hr_round',
  'offer',
  'hired',
  'rejected'
];

export const STAGE_CONFIG = {
  applied: { label: 'Applied', color: 'bg-lavender-light text-indigo border-lavender' },
  screening: { label: 'Screening', color: 'bg-indigo-50 text-indigo border-indigo-200' },
  shortlisted: { label: 'Shortlisted', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  assessment: { label: 'Assessment', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  interview1: { label: 'Interview 1', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  interview2: { label: 'Interview 2', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  hr_round: { label: 'HR Round', color: 'bg-amber-light text-amber-800 border-amber-300' },
  offer: { label: 'Offer', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  hired: { label: 'Hired', color: 'bg-success-light text-success border-emerald-300' },
  rejected: { label: 'Rejected', color: 'bg-danger-light text-danger border-rose-300' }
};

export const WORK_MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' }
];

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' }
];
