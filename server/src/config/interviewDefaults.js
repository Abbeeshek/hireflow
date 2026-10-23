/**
 * Default Interview Plans & Criteria Configuration for HireFlow Phase 3.
 * Each round's criteria weights MUST sum to exactly 100.
 */

export const BANNED_INTERVIEW_TOPICS = [
  'age',
  'marital_status',
  'marriage',
  'religion',
  'religious',
  'caste',
  'gender',
  'sex',
  'pregnancy',
  'family_plans',
  'children',
  'kids',
  'nationality',
  'citizenship',
  'ethnicity',
  'race',
  'health',
  'disability',
  'medical',
  'photo',
  'appearance',
  'political'
];

export const DEFAULT_INTERVIEW_PLAN = [
  {
    round: 'interview1',
    name: 'Technical Round',
    mode: 'video',
    durationMinutes: 60,
    questionCount: 5,
    criteria: [
      { key: 'tech_skills', label: 'Technical Skills', weight: 35 },
      { key: 'problem_solving', label: 'Problem Solving', weight: 20 },
      { key: 'communication', label: 'Communication', weight: 15 },
      { key: 'relevant_experience', label: 'Relevant Experience', weight: 15 },
      { key: 'role_knowledge', label: 'Role Knowledge', weight: 15 }
    ]
  },
  {
    round: 'interview2',
    name: 'Problem Solving Round',
    mode: 'video',
    durationMinutes: 45,
    questionCount: 4,
    criteria: [
      { key: 'problem_formulation', label: 'Problem Formulation', weight: 30 },
      { key: 'analytical_thinking', label: 'Analytical Thinking', weight: 30 },
      { key: 'solution_design', label: 'Solution Design', weight: 25 },
      { key: 'communication', label: 'Communication', weight: 15 }
    ]
  },
  {
    round: 'hr_round',
    name: 'HR Culture & Fit',
    mode: 'video',
    durationMinutes: 45,
    questionCount: 4,
    criteria: [
      { key: 'communication', label: 'Communication', weight: 30 },
      { key: 'motivation', label: 'Motivation', weight: 25 },
      { key: 'team_fit', label: 'Team Fit', weight: 25 },
      { key: 'role_understanding', label: 'Role Understanding', weight: 20 }
    ]
  }
];

export default {
  BANNED_INTERVIEW_TOPICS,
  DEFAULT_INTERVIEW_PLAN
};
