import { z } from 'zod';
import ai from './index.js';

export const explanationSchema = z.object({
  summary: z.string().default(''),
  strengths: z.array(z.string()).max(5).default([]),
  concerns: z.array(z.string()).max(5).default([])
});

/**
 * Deterministic template fallback generator when LLM is unavailable or fails.
 */
export function generateTemplateExplanation({
  overall,
  bucket,
  subScores,
  ruleResults = [],
  skillMatches = [],
  experience = {}
}) {
  const matchedSkills = skillMatches
    .filter((s) => s.status === 'matched')
    .map((s) => s.skill);

  const missingSkills = skillMatches
    .filter((s) => s.status === 'missing')
    .map((s) => s.skill);

  const partialSkills = skillMatches
    .filter((s) => s.status === 'partial')
    .map((s) => s.skill);

  const failedRules = ruleResults.filter((r) => !r.passed);

  // 1. Summary: 3 sentences
  const sentence1 = `Candidate placed in the ${bucket.toUpperCase()} tier with an overall match score of ${overall}/100.`;
  const sentence2 =
    matchedSkills.length > 0
      ? `Demonstrated verified proficiency in key required competencies including ${matchedSkills.slice(0, 3).join(', ')}.`
      : `Profile shows foundational alignment across technical categories with limited direct keyword overlap.`;
  const sentence3 =
    failedRules.length > 0
      ? `Requires recruiter review due to failed mandatory criteria: ${failedRules[0].detail}.`
      : `Experience record reflects ${experience.relevantYears || 0} relevant years compared to ${experience.requiredMin || 0} years required.`;

  const summary = `${sentence1} ${sentence2} ${sentence3}`;

  // 2. Strengths (max 5)
  const strengths = [];
  if (matchedSkills.length > 0) {
    strengths.push(`Strong verified alignment on core skills: ${matchedSkills.slice(0, 4).join(', ')}.`);
  }
  if (subScores?.experience >= 75) {
    strengths.push(`Solid experience tenure (${experience.totalYears || 0} total years, ${experience.relevantYears || 0} relevant).`);
  }
  if (subScores?.projects >= 70) {
    strengths.push('Demonstrated relevant hands-on project accomplishments matching role focus.');
  }
  if (subScores?.roleAlignment >= 75) {
    strengths.push('High semantic role alignment between profile background and job responsibilities.');
  }
  if (strengths.length === 0) {
    strengths.push('Baseline foundational background in software development.');
  }

  // 3. Concerns (max 5) - "Why this candidate may not fit"
  const concerns = [];
  for (const failed of failedRules) {
    concerns.push(`Hard rule violation: ${failed.detail}.`);
  }
  if (missingSkills.length > 0) {
    concerns.push(`Missing required skill(s): ${missingSkills.slice(0, 3).join(', ')}.`);
  }
  if (partialSkills.length > 0) {
    concerns.push(`Partial skill match without direct syntax: ${partialSkills.slice(0, 3).join(', ')}.`);
  }
  const claimedNoEvidence = skillMatches
    .filter((s) => s.status !== 'missing' && (!s.evidence || s.evidence.length === 0))
    .map((s) => s.skill);
  if (claimedNoEvidence.length > 0) {
    concerns.push(`Skills claimed without supporting evidence: ${claimedNoEvidence.slice(0, 3).join(', ')}.`);
  }
  if (experience.requiredMin > 0 && (experience.relevantYears || 0) < experience.requiredMin) {
    concerns.push(
      `Relevant experience (${experience.relevantYears || 0} yrs) falls short of target minimum (${experience.requiredMin} yrs).`
    );
  }
  if (concerns.length === 0) {
    concerns.push('Minor gaps in preferred or nice-to-have auxiliary tooling.');
  }

  return {
    summary,
    strengths: strengths.slice(0, 5),
    concerns: concerns.slice(0, 5)
  };
}

/**
 * Generates plain-English explanation for screening results.
 * Strictly sends only structured metrics (NO PII) to LLM.
 * Falls back to deterministic template on any failure.
 */
export async function explainScreening(screeningData) {
  const {
    overall,
    bucket,
    subScores,
    weightsUsed,
    ruleResults,
    skillMatches,
    experience,
    topProjects
  } = screeningData;

  // Prepare sanitized structured payload with ZERO candidate PII
  const sanitizedFacts = {
    overall,
    bucket,
    subScores,
    weightsUsed,
    ruleResults: (ruleResults || []).map((r) => ({ rule: r.rule, passed: r.passed, detail: r.detail })),
    skillsMatched: (skillMatches || []).filter((s) => s.status === 'matched').map((s) => s.skill),
    skillsPartial: (skillMatches || []).filter((s) => s.status === 'partial').map((s) => s.skill),
    skillsMissing: (skillMatches || []).filter((s) => s.status === 'missing').map((s) => s.skill),
    skillsClaimedWithoutEvidence: (skillMatches || [])
      .filter((s) => s.status !== 'missing' && (!s.evidence || s.evidence.length === 0))
      .map((s) => s.skill),
    experience: {
      totalYears: experience?.totalYears || 0,
      relevantYears: experience?.relevantYears || 0,
      requiredMin: experience?.requiredMin || 0
    },
    topProjectTitles: (topProjects || []).map((p) => p.title)
  };

  try {
    const systemPrompt = `You are an objective hiring intelligence analyst.
Write a concise, factual candidate screening assessment strictly from the provided structured data.
RULES:
- Use ONLY the provided numbers and facts. Never invent scores or skills.
- Neutral, professional tone. Never mention protected personal attributes.
- summary: exactly 3 balanced sentences.
- strengths: max 5 bullet points highlighting concrete competencies and matches.
- concerns: max 5 bullet points ("why this candidate may not fit") detailing missing/partial skills, weak evidence, or tenure gaps.`;

    const userPrompt = JSON.stringify(sanitizedFacts, null, 2);

    const explanation = await ai.generateJson({
      task: 'explain_screening',
      systemPrompt,
      userPrompt,
      zodSchema: explanationSchema
    });

    return {
      summary: explanation.summary || generateTemplateExplanation(screeningData).summary,
      strengths: Array.isArray(explanation.strengths) && explanation.strengths.length > 0
        ? explanation.strengths.slice(0, 5)
        : generateTemplateExplanation(screeningData).strengths,
      concerns: Array.isArray(explanation.concerns) && explanation.concerns.length > 0
        ? explanation.concerns.slice(0, 5)
        : generateTemplateExplanation(screeningData).concerns
    };
  } catch (err) {
    console.warn('[Explainer] LLM explanation failed, using deterministic template:', err.message);
    return generateTemplateExplanation(screeningData);
  }
}

export default {
  explainScreening,
  generateTemplateExplanation,
  explanationSchema
};
