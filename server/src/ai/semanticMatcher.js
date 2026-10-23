import {
  SIM_MATCHED,
  SIM_PARTIAL,
  ALIGN_LOW,
  ALIGN_HIGH
} from '../config/scoring.js';
import { cosineSimilarity } from './providers/mock.js';
import { isAliasMatch } from './skillAliases.js';
import { getCandidateEducationRank, EDUCATION_LEVELS } from './ruleEngine.js';

/**
 * Normalizes an array of scoring weights when one category is dropped.
 * Ensures the adjusted weights sum to exactly 100.
 * @param {object} baseWeights - { skills, experience, projects, education, roleAlignment }
 * @param {string[]} droppedKeys - Keys to drop (e.g. ['education'])
 * @returns {object} Normalized weights
 */
export function renormalizeWeights(baseWeights, droppedKeys = ['education']) {
  const CATEGORIES = ['skills', 'experience', 'projects', 'education', 'roleAlignment'];
  const raw = baseWeights?.toObject ? baseWeights.toObject() : baseWeights;

  const result = {};
  for (const k of CATEGORIES) {
    result[k] = droppedKeys.includes(k) ? 0 : (raw?.[k] ?? 20);
  }

  const activeKeys = CATEGORIES.filter((k) => !droppedKeys.includes(k));
  const activeSum = activeKeys.reduce((sum, k) => sum + (result[k] || 0), 0);

  if (activeSum === 0) {
    const even = Math.floor(100 / activeKeys.length);
    activeKeys.forEach((k) => (result[k] = even));
    return result;
  }

  let totalAllocated = 0;
  activeKeys.forEach((k) => {
    result[k] = Math.round(((result[k] || 0) / activeSum) * 100);
    totalAllocated += result[k];
  });

  // Adjust rounding discrepancy on largest active weight
  const diff = 100 - totalAllocated;
  if (diff !== 0 && activeKeys.length > 0) {
    const maxKey = activeKeys.reduce((maxK, k) => (result[k] > result[maxK] ? k : maxK), activeKeys[0]);
    result[maxKey] += diff;
  }

  return result;
}


/**
 * Matches required and preferred skills against candidate skills, experience, and projects.
 * @param {object} params
 * @param {object} params.job
 * @param {object} params.candidateProfile
 * @param {Map<string, number[]>} params.embeddingsMap
 * @returns {{ skillMatches: Array, score: number }}
 */
export function matchSkills({ job, candidateProfile, embeddingsMap = new Map() }) {
  const required = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const preferred = Array.isArray(job.preferredSkills) ? job.preferredSkills : [];

  // Extract all candidate terms
  const candidateTermsSet = new Set();
  (candidateProfile?.skills || []).forEach((s) => candidateTermsSet.add(s.trim()));
  (candidateProfile?.experience || []).forEach((exp) => {
    (exp.technologies || []).forEach((t) => candidateTermsSet.add(t.trim()));
  });
  (candidateProfile?.projects || []).forEach((proj) => {
    (proj.techStack || []).forEach((t) => candidateTermsSet.add(t.trim()));
  });

  const candidateTerms = Array.from(candidateTermsSet);

  const targets = [
    ...required.map((s) => ({ skill: s, kind: 'required', weight: 1.0 })),
    ...preferred.map((s) => ({ skill: s, kind: 'preferred', weight: 0.5 }))
  ];

  if (targets.length === 0) {
    return { skillMatches: [], score: 100 };
  }

  const skillMatches = [];
  let weightedCredit = 0;
  let weightedTotal = 0;

  for (const target of targets) {
    const targetSkill = target.skill;
    const targetVector = embeddingsMap.get(targetSkill.toLowerCase().trim());

    let bestSimilarity = 0;
    let bestMatchedTerm = '';

    for (const candTerm of candidateTerms) {
      if (isAliasMatch(targetSkill, candTerm)) {
        bestSimilarity = 1.0;
        bestMatchedTerm = candTerm;
        break;
      }

      if (targetVector) {
        const candVector = embeddingsMap.get(candTerm.toLowerCase().trim());
        if (candVector) {
          const sim = cosineSimilarity(targetVector, candVector);
          if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestMatchedTerm = candTerm;
          }
        }
      }
    }

    let status = 'missing';
    let credit = 0;

    if (bestSimilarity >= SIM_MATCHED) {
      status = 'matched';
      credit = 1.0;
    } else if (bestSimilarity >= SIM_PARTIAL) {
      status = 'partial';
      credit = 0.5;
    } else {
      status = 'missing';
      credit = 0.0;
    }

    weightedCredit += target.weight * credit;
    weightedTotal += target.weight;

    skillMatches.push({
      skill: targetSkill,
      kind: target.kind,
      status,
      similarity: Number(bestSimilarity.toFixed(4)),
      matchedWith: bestMatchedTerm || null,
      evidence: []
    });
  }

  const score = weightedTotal > 0 ? Math.round((weightedCredit / weightedTotal) * 100) : 100;

  return {
    skillMatches,
    score
  };
}

/**
 * Calculates experience score based on relevant tenure years versus minimum required.
 */
export function matchExperience({ job, candidateProfile, jobVector, experienceVectors = [] }) {
  const minRequired = job.experienceMin || 0;
  const experienceList = Array.isArray(candidateProfile?.experience) ? candidateProfile.experience : [];

  let relevantYears = 0;

  for (let i = 0; i < experienceList.length; i++) {
    const role = experienceList[i];
    const durationYears = (role.durationMonths || 12) / 12;

    const roleVector = experienceVectors[i];
    let isRelevant = false;

    if (roleVector && jobVector) {
      const sim = cosineSimilarity(jobVector, roleVector);
      if (sim >= 0.45) {
        isRelevant = true;
      }
    }

    // Technology overlap heuristic check
    if (!isRelevant && Array.isArray(role.technologies)) {
      const jobRequired = (job.requiredSkills || []).map((s) => s.toLowerCase());
      const hasSkill = role.technologies.some((t) => jobRequired.includes(t.toLowerCase()));
      if (hasSkill) isRelevant = true;
    }

    if (isRelevant) {
      relevantYears += durationYears;
    }
  }

  const totalYears = candidateProfile?.totalExperienceYears || relevantYears;
  let score = 100;

  if (minRequired > 0) {
    score = Math.min(100, Math.round((relevantYears / minRequired) * 100));
  }

  return {
    totalYears: Number(totalYears.toFixed(1)),
    relevantYears: Number(relevantYears.toFixed(1)),
    requiredMin: minRequired,
    score
  };
}

/**
 * Calculates project score and returns top relevant projects.
 */
export function matchProjects({ job, candidateProfile, jobVector, projectVectors = [] }) {
  const projectsList = Array.isArray(candidateProfile?.projects) ? candidateProfile.projects : [];

  if (projectsList.length === 0) {
    return { topProjects: [], score: 50 };
  }

  const scoredProjects = [];
  const requiredLower = (job.requiredSkills || []).map((s) => s.toLowerCase());

  for (let i = 0; i < projectsList.length; i++) {
    const proj = projectsList[i];
    const projVector = projectVectors[i];

    let sim = 0.5;
    if (projVector && jobVector) {
      sim = Math.max(0, cosineSimilarity(jobVector, projVector));
    }

    // Skill overlap ratio
    let overlapRatio = 0;
    if (Array.isArray(proj.techStack) && requiredLower.length > 0) {
      const matchCount = proj.techStack.filter((t) => requiredLower.includes(t.toLowerCase())).length;
      overlapRatio = Math.min(1.0, matchCount / Math.max(1, requiredLower.length));
    }

    const relevance = Number((sim * 0.7 + overlapRatio * 0.3).toFixed(3));

    scoredProjects.push({
      title: proj.title || 'Untitled Project',
      description: proj.description || '',
      techStack: proj.techStack || [],
      relevance
    });
  }

  scoredProjects.sort((a, b) => b.relevance - a.relevance);
  const topProjects = scoredProjects.slice(0, 3);

  const avgRelevance =
    topProjects.reduce((sum, p) => sum + p.relevance, 0) / Math.max(1, topProjects.length);
  const score = Math.min(100, Math.max(20, Math.round(avgRelevance * 100)));

  return {
    topProjects,
    score
  };
}

/**
 * Evaluates education score and handles weight renormalization if education is N/A.
 */
export function matchEducation({ job, candidateProfile, scoringWeights }) {
  const minLevel = (job.educationRequirement?.minLevel || 'none').toLowerCase();
  const baseWeights = scoringWeights || job.scoringWeights || {
    skills: 30,
    experience: 25,
    projects: 20,
    education: 15,
    roleAlignment: 10
  };

  // If minLevel is none, education is NOT applicable
  if (minLevel === 'none') {
    const weightsUsed = renormalizeWeights(baseWeights, ['education']);
    return {
      score: 0,
      isApplicable: false,
      weightsUsed
    };
  }

  const requiredRank = EDUCATION_LEVELS[minLevel] || 0;
  const candidateEdu = getCandidateEducationRank(candidateProfile?.education || []);

  let score = 30;
  if (candidateEdu.rank >= requiredRank) {
    score = 100;
  } else if (candidateEdu.rank === requiredRank - 1) {
    score = 65;
  }

  // Bonus for preferred fields
  const preferredFields = (job.educationRequirement?.preferredFields || []).map((f) => f.toLowerCase());
  if (preferredFields.length > 0 && Array.isArray(candidateProfile?.education)) {
    const matchesField = candidateProfile.education.some((e) =>
      preferredFields.some((f) => (e.field || '').toLowerCase().includes(f))
    );
    if (matchesField) {
      score = Math.min(100, score + 10);
    }
  }

  return {
    score,
    isApplicable: true,
    weightsUsed: renormalizeWeights(baseWeights, [])
  };
}

/**
 * Evaluates role alignment score between candidate profile and job description.
 */
export function matchRoleAlignment({ candidateTextVector, jobVector }) {
  if (!candidateTextVector || !jobVector) {
    return { score: 70, similarity: 0.5 };
  }

  const sim = cosineSimilarity(candidateTextVector, jobVector);

  // Linearly map from [ALIGN_LOW, ALIGN_HIGH] to [0, 100]
  const normalized = (sim - ALIGN_LOW) / (ALIGN_HIGH - ALIGN_LOW);
  const score = Math.round(Math.min(100, Math.max(0, normalized * 100)));

  return {
    score,
    similarity: Number(sim.toFixed(4))
  };
}

export default {
  renormalizeWeights,
  matchSkills,
  matchExperience,
  matchProjects,
  matchEducation,
  matchRoleAlignment
};
