import { SIM_MATCHED } from '../config/scoring.js';

export const EDUCATION_LEVELS = {
  none: 0,
  diploma: 1,
  bachelor: 2,
  master: 3,
  phd: 4
};

/**
 * Extracts candidate highest education level from education list.
 * @param {Array} educationList
 * @returns {{ level: string, rank: number, degree: string }}
 */
export function getCandidateEducationRank(educationList) {
  if (!Array.isArray(educationList) || educationList.length === 0) {
    return { level: 'none', rank: 0, degree: '' };
  }

  let highestRank = 0;
  let highestLevel = 'none';
  let bestDegree = '';

  for (const edu of educationList) {
    const text = `${edu.degree || ''} ${edu.field || ''}`.toLowerCase();
    let rank = 0;
    let level = 'none';

    if (/ph\.?d|doctorate|doctoral/i.test(text)) {
      rank = EDUCATION_LEVELS.phd;
      level = 'phd';
    } else if (/master|m\.?s|m\.?tech|mba|msc|m\.?e/i.test(text)) {
      rank = EDUCATION_LEVELS.master;
      level = 'master';
    } else if (/bachelor|b\.?s|b\.?tech|b\.?e|bba|bca|bsc/i.test(text)) {
      rank = EDUCATION_LEVELS.bachelor;
      level = 'bachelor';
    } else if (/diploma|associate/i.test(text)) {
      rank = EDUCATION_LEVELS.diploma;
      level = 'diploma';
    }

    if (rank > highestRank) {
      highestRank = rank;
      highestLevel = level;
      bestDegree = edu.degree || level;
    }
  }

  return { level: highestLevel, rank: highestRank, degree: bestDegree };
}

/**
 * Evaluates deterministic hard rules for a candidate against a job opening.
 * Rule engine returns ruleResults[{ rule, passed, detail }] and allPassed.
 * Any failed rule forces "low" bucket.
 *
 * @param {object} params
 * @param {object} params.candidateProfile - Structured profile with totalExperienceYears, education, etc.
 * @param {object} params.job - Job opening document
 * @param {Array} params.skillMatches - Array of skill match records from semanticMatcher
 * @returns {{ ruleResults: Array<{ rule: string, passed: boolean, detail: string }>, allPassed: boolean, failedReasons: string[] }}
 */
export function evaluateRules({ candidateProfile, job, skillMatches = [] }) {
  const ruleResults = [];
  const failedReasons = [];

  // 1. Min experience rule
  const enforceMinExp = job.enforceMinExperience !== false;
  const experienceMin = job.experienceMin || 0;
  const totalYears = candidateProfile?.totalExperienceYears || 0;

  if (enforceMinExp && experienceMin > 0) {
    const passed = totalYears >= experienceMin;
    const detail = passed
      ? `Meets minimum experience requirement (${totalYears} yrs >= ${experienceMin} yrs)`
      : `Insufficient experience: candidate has ${totalYears} yrs, job requires ${experienceMin} yrs`;
    ruleResults.push({ rule: 'min_experience', passed, detail });
    if (!passed) failedReasons.push(detail);
  } else {
    ruleResults.push({
      rule: 'min_experience',
      passed: true,
      detail: `Experience requirement satisfied or not enforced (${totalYears} yrs recorded)`
    });
  }

  // 2. Must-have skills rule
  const mustHaveSkills = Array.isArray(job.mustHaveSkills) ? job.mustHaveSkills : [];
  if (mustHaveSkills.length > 0) {
    const missingMustHaves = [];

    for (const reqSkill of mustHaveSkills) {
      const match = skillMatches.find(
        (sm) => sm.skill.toLowerCase().trim() === reqSkill.toLowerCase().trim()
      );

      // Must be matched or partial (or similarity >= SIM_MATCHED)
      const isPresent = match && (match.status === 'matched' || match.status === 'partial' || match.similarity >= SIM_MATCHED);
      if (!isPresent) {
        missingMustHaves.push(reqSkill);
      }
    }

    const passed = missingMustHaves.length === 0;
    const detail = passed
      ? `All must-have skills verified (${mustHaveSkills.join(', ')})`
      : `Missing required non-negotiable skill(s): ${missingMustHaves.join(', ')}`;

    ruleResults.push({ rule: 'must_have_skills', passed, detail });
    if (!passed) failedReasons.push(detail);
  } else {
    ruleResults.push({
      rule: 'must_have_skills',
      passed: true,
      detail: 'No specific must-have skills enforced'
    });
  }

  // 3. Education level rule
  const minEduLevel = (job.educationRequirement?.minLevel || 'none').toLowerCase();
  const requiredRank = EDUCATION_LEVELS[minEduLevel] || 0;

  if (requiredRank > 0) {
    const candidateEdu = getCandidateEducationRank(candidateProfile?.education || []);
    const passed = candidateEdu.rank >= requiredRank;
    const detail = passed
      ? `Meets minimum education requirement (${candidateEdu.degree || candidateEdu.level} >= ${minEduLevel})`
      : `Does not meet minimum education requirement (${candidateEdu.degree || 'none'} < ${minEduLevel})`;

    ruleResults.push({ rule: 'education_level', passed, detail });
    if (!passed) failedReasons.push(detail);
  } else {
    ruleResults.push({
      rule: 'education_level',
      passed: true,
      detail: 'No minimum education degree required'
    });
  }

  const allPassed = ruleResults.every((r) => r.passed);

  return {
    ruleResults,
    allPassed,
    failedReasons
  };
}

export default {
  evaluateRules,
  getCandidateEducationRank,
  EDUCATION_LEVELS
};
