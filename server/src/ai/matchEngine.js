import {
  BUCKET_STRONG,
  BUCKET_POTENTIAL,
  SCORING_VERSION
} from '../config/scoring.js';
import { evaluateRules } from './ruleEngine.js';
import {
  matchSkills,
  matchExperience,
  matchProjects,
  matchEducation,
  matchRoleAlignment
} from './semanticMatcher.js';
import { extractEvidenceForSkills } from './evidenceExtractor.js';
import { explainScreening } from './explainer.js';
import { getSkillEmbeddings, getTextEmbedding } from '../services/embedding.service.js';
import ai from './index.js';

/**
 * Deterministic hybrid match engine.
 * Computes sub-scores, evaluates hard rules, renormalizes weights when education is N/A,
 * checks verbatim evidence against sentences, and generates structured explanations.
 *
 * @param {object} params
 * @param {object} params.job - Job opening document
 * @param {object} params.resume - Candidate resume document (with parsedProfile & sentences)
 * @param {object} params.candidateProfile - Optional CandidateProfile override
 * @returns {Promise<object>} Complete screening object
 */
export async function matchCandidateToJob({ job, resume, candidateProfile = null }) {
  const profile = candidateProfile || resume.parsedProfile || {};

  // 1. Collect all skill terms to embed
  const allTermsSet = new Set();
  (job.requiredSkills || []).forEach((s) => allTermsSet.add(s.trim()));
  (job.preferredSkills || []).forEach((s) => allTermsSet.add(s.trim()));
  (profile.skills || []).forEach((s) => allTermsSet.add(s.trim()));
  (profile.experience || []).forEach((exp) => {
    (exp.technologies || []).forEach((t) => allTermsSet.add(t.trim()));
  });
  (profile.projects || []).forEach((proj) => {
    (proj.techStack || []).forEach((t) => allTermsSet.add(t.trim()));
  });

  const allTerms = Array.from(allTermsSet).filter(Boolean);

  // 2. Fetch/cache embeddings in batch
  const embeddingsMap = await getSkillEmbeddings(allTerms);

  // 3. Compute job text embedding
  const jobText = `${job.title || ''} ${job.description || ''}`.trim();
  const jobVector = await getTextEmbedding(jobText);

  // 4. Compute role embeddings for experience
  const experienceList = Array.isArray(profile.experience) ? profile.experience : [];
  const experienceVectors = [];
  for (const exp of experienceList) {
    const roleText = `${exp.title || ''} ${exp.description || ''} ${(exp.technologies || []).join(' ')}`.trim();
    const vec = roleText ? await getTextEmbedding(roleText) : [];
    experienceVectors.push(vec);
  }

  // 5. Compute project embeddings
  const projectsList = Array.isArray(profile.projects) ? profile.projects : [];
  const projectVectors = [];
  for (const proj of projectsList) {
    const projText = `${proj.title || ''} ${proj.description || ''} ${(proj.techStack || []).join(' ')}`.trim();
    const vec = projText ? await getTextEmbedding(projText) : [];
    projectVectors.push(vec);
  }

  // 6. Compute candidate text vector for role alignment
  const candidateOverviewText = `${profile.summary || ''} ${(profile.skills || []).join(' ')} ${experienceList.map((e) => e.title).join(' ')}`.trim();
  const candidateTextVector = candidateOverviewText ? await getTextEmbedding(candidateOverviewText) : jobVector;

  // 7. Perform semantic matching sub-evaluations
  const skillsResult = matchSkills({ job, candidateProfile: profile, embeddingsMap });
  const expResult = matchExperience({ job, candidateProfile: profile, jobVector, experienceVectors });
  const projResult = matchProjects({ job, candidateProfile: profile, jobVector, projectVectors });
  const eduResult = matchEducation({ job, candidateProfile: profile, scoringWeights: job.scoringWeights });
  const roleResult = matchRoleAlignment({ candidateTextVector, jobVector });

  const subScores = {
    skills: skillsResult.score,
    experience: expResult.score,
    projects: projResult.score,
    education: eduResult.score,
    roleAlignment: roleResult.score
  };

  const weightsUsed = eduResult.weightsUsed;

  // 8. Deterministic weighted overall calculation
  const weightedSum =
    (weightsUsed.skills || 0) * subScores.skills +
    (weightsUsed.experience || 0) * subScores.experience +
    (weightsUsed.projects || 0) * subScores.projects +
    (weightsUsed.education || 0) * subScores.education +
    (weightsUsed.roleAlignment || 0) * subScores.roleAlignment;

  const overall = Math.max(0, Math.min(100, Math.round(weightedSum / 100)));

  // 9. Hard Rule Engine evaluation
  const ruleEvaluation = evaluateRules({
    candidateProfile: profile,
    job,
    skillMatches: skillsResult.skillMatches
  });

  // 10. Bucket determination
  let bucket = 'low';
  if (!ruleEvaluation.allPassed) {
    // Failed hard rule forces "low" bucket
    bucket = 'low';
  } else if (overall >= BUCKET_STRONG) {
    bucket = 'strong';
  } else if (overall >= BUCKET_POTENTIAL) {
    bucket = 'potential';
  } else {
    bucket = 'low';
  }

  // 11. Extract verbatim evidence quotes from sentences
  const skillMatches = await extractEvidenceForSkills({
    skillMatches: skillsResult.skillMatches,
    sentences: resume.sentences || []
  });

  // 12. Plain-English explanation generation (NO PII)
  const explanation = await explainScreening({
    overall,
    bucket,
    subScores,
    weightsUsed,
    ruleResults: ruleEvaluation.ruleResults,
    skillMatches,
    experience: {
      totalYears: expResult.totalYears,
      relevantYears: expResult.relevantYears,
      requiredMin: expResult.requiredMin
    },
    topProjects: projResult.topProjects
  });

  const providerInfo = ai.getActiveProviderInfo();

  return {
    status: 'completed',
    provider: providerInfo.provider,
    model: providerInfo.model,
    scoringVersion: SCORING_VERSION,
    screenedAt: new Date(),
    jobUpdatedAtAtScreening: job.updatedAt,
    overall,
    bucket,
    subScores,
    weightsUsed,
    ruleResults: ruleEvaluation.ruleResults,
    skillMatches,
    experience: {
      totalYears: expResult.totalYears,
      relevantYears: expResult.relevantYears,
      requiredMin: expResult.requiredMin
    },
    topProjects: projResult.topProjects,
    summary: explanation.summary,
    strengths: explanation.strengths,
    concerns: explanation.concerns
  };
}

export default {
  matchCandidateToJob
};
