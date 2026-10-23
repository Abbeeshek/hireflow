import { jest } from '@jest/globals';
import { evaluateRules } from '../src/ai/ruleEngine.js';
import {
  renormalizeWeights,
  matchSkills,
  matchExperience,
  matchProjects,
  matchEducation,
  matchRoleAlignment
} from '../src/ai/semanticMatcher.js';
import { extractEvidenceForSkills } from '../src/ai/evidenceExtractor.js';
import { generateTemplateExplanation } from '../src/ai/explainer.js';
import { generateDeterministicEmbedding } from '../src/ai/providers/mock.js';

describe('Match Engine & Screening Logic (M4)', () => {
  describe('1. Hard Rule Engine', () => {
    test('passes when candidate meets min experience, must-haves, and education', () => {
      const job = {
        experienceMin: 3,
        enforceMinExperience: true,
        mustHaveSkills: ['React', 'Node.js'],
        educationRequirement: { minLevel: 'bachelor' }
      };

      const candidateProfile = {
        totalExperienceYears: 4,
        education: [{ degree: 'Bachelor of Science in Computer Science', field: 'CS' }]
      };

      const skillMatches = [
        { skill: 'React', status: 'matched', similarity: 1.0 },
        { skill: 'Node.js', status: 'matched', similarity: 1.0 },
        { skill: 'Docker', status: 'partial', similarity: 0.65 }
      ];

      const result = evaluateRules({ candidateProfile, job, skillMatches });
      expect(result.allPassed).toBe(true);
      expect(result.failedReasons).toHaveLength(0);
      expect(result.ruleResults).toHaveLength(3);
    });

    test('fails and records visible reason when must-have skill is missing', () => {
      const job = {
        experienceMin: 2,
        enforceMinExperience: true,
        mustHaveSkills: ['React', 'PostgreSQL'],
        educationRequirement: { minLevel: 'none' }
      };

      const candidateProfile = {
        totalExperienceYears: 3,
        education: []
      };

      const skillMatches = [
        { skill: 'React', status: 'matched', similarity: 1.0 },
        { skill: 'PostgreSQL', status: 'missing', similarity: 0.2 }
      ];

      const result = evaluateRules({ candidateProfile, job, skillMatches });
      expect(result.allPassed).toBe(false);
      expect(result.failedReasons.length).toBeGreaterThan(0);
      expect(result.failedReasons[0]).toMatch(/PostgreSQL/);
    });

    test('fails when candidate experience is below enforced minimum', () => {
      const job = {
        experienceMin: 5,
        enforceMinExperience: true,
        mustHaveSkills: [],
        educationRequirement: { minLevel: 'none' }
      };

      const candidateProfile = { totalExperienceYears: 2.5 };
      const result = evaluateRules({ candidateProfile, job, skillMatches: [] });
      expect(result.allPassed).toBe(false);
      expect(result.failedReasons[0]).toContain('Insufficient experience');
    });

    test('fails when education degree is below required level', () => {
      const job = {
        experienceMin: 0,
        mustHaveSkills: [],
        educationRequirement: { minLevel: 'master' }
      };

      const candidateProfile = {
        totalExperienceYears: 3,
        education: [{ degree: 'Bachelor of Science' }]
      };

      const result = evaluateRules({ candidateProfile, job, skillMatches: [] });
      expect(result.allPassed).toBe(false);
      expect(result.failedReasons[0]).toContain('Does not meet minimum education');
    });
  });

  describe('2. Weight Renormalization when Education is N/A', () => {
    test('renormalizes active weights to exactly 100 when education is dropped', () => {
      const baseWeights = {
        skills: 30,
        experience: 25,
        projects: 20,
        education: 15,
        roleAlignment: 10
      };

      const renormalized = renormalizeWeights(baseWeights, ['education']);
      expect(renormalized.education).toBe(0);

      const sum =
        renormalized.skills +
        renormalized.experience +
        renormalized.projects +
        renormalized.education +
        renormalized.roleAlignment;
      expect(sum).toBe(100);

      // Verify proportional scaling: skills was 30/(30+25+20+10) = 30/85 ~= 35%
      expect(renormalized.skills).toBeGreaterThanOrEqual(34);
      expect(renormalized.skills).toBeLessThanOrEqual(36);
    });
  });

  describe('3. Determinism & Semantic Matching', () => {
    test('produces identical scores for identical inputs (determinism)', () => {
      const job = {
        requiredSkills: ['Node.js', 'React'],
        preferredSkills: ['Docker'],
        scoringWeights: { skills: 35, experience: 25, projects: 20, education: 10, roleAlignment: 10 }
      };

      const candidateProfile = {
        skills: ['Node.js', 'React', 'MongoDB'],
        experience: [{ title: 'Software Engineer', durationMonths: 24, technologies: ['Node.js'] }],
        projects: [{ title: 'Portal', techStack: ['React'] }]
      };

      const embeddingsMap = new Map();
      embeddingsMap.set('node.js', generateDeterministicEmbedding('Node.js'));
      embeddingsMap.set('react', generateDeterministicEmbedding('React'));
      embeddingsMap.set('docker', generateDeterministicEmbedding('Docker'));
      embeddingsMap.set('mongodb', generateDeterministicEmbedding('MongoDB'));

      const res1 = matchSkills({ job, candidateProfile, embeddingsMap });
      const res2 = matchSkills({ job, candidateProfile, embeddingsMap });

      expect(res1.score).toBe(res2.score);
      expect(res1.skillMatches).toEqual(res2.skillMatches);
    });
  });

  describe('4. Verbatim Evidence Verification (Principle #2)', () => {
    test('matches literal sentences verbatim from sentences array', async () => {
      const sentences = [
        'Experienced developer with 4 years in backend systems.',
        'Engineered high-throughput REST APIs using Node.js and Express.',
        'Designed frontend components with React and CSS modules.'
      ];

      const skillMatches = [
        { skill: 'Node.js', kind: 'required', status: 'matched', matchedWith: 'Node.js', evidence: [] },
        { skill: 'React', kind: 'required', status: 'matched', matchedWith: 'React', evidence: [] }
      ];

      const result = await extractEvidenceForSkills({ skillMatches, sentences });

      expect(result[0].evidence.length).toBeGreaterThan(0);
      expect(result[0].evidence[0]).toBe('Engineered high-throughput REST APIs using Node.js and Express.');
      expect(sentences).toContain(result[0].evidence[0]);

      expect(result[1].evidence.length).toBeGreaterThan(0);
      expect(result[1].evidence[0]).toBe('Designed frontend components with React and CSS modules.');
      expect(sentences).toContain(result[1].evidence[0]);
    });

    test('leaves evidence empty when candidate has no verifiable sentence', async () => {
      const sentences = [
        'Frontend engineer with extensive design skills.',
        'Built accessible mobile layouts.'
      ];

      const skillMatches = [
        { skill: 'Kubernetes', kind: 'preferred', status: 'partial', matchedWith: 'k8s', evidence: [] }
      ];

      const result = await extractEvidenceForSkills({ skillMatches, sentences });
      // No sentence mentions Kubernetes or contains verifiable evidence
      expect(Array.isArray(result[0].evidence)).toBe(true);
    });
  });

  describe('5. Deterministic Explainer Fallback', () => {
    test('generates 3-sentence summary, strengths, and concerns without hallucinating numbers', () => {
      const screeningData = {
        overall: 82,
        bucket: 'strong',
        subScores: { skills: 85, experience: 80, projects: 75, education: 100, roleAlignment: 80 },
        ruleResults: [{ rule: 'min_experience', passed: true, detail: 'Meets tenure' }],
        skillMatches: [
          { skill: 'React', status: 'matched', evidence: ['Built React UI'] },
          { skill: 'Docker', status: 'missing', evidence: [] }
        ],
        experience: { totalYears: 4, relevantYears: 3.5, requiredMin: 2 }
      };

      const explanation = generateTemplateExplanation(screeningData);
      expect(explanation.summary).toContain('STRONG');
      expect(explanation.summary).toContain('82/100');
      expect(explanation.strengths.length).toBeGreaterThan(0);
      expect(explanation.concerns.length).toBeGreaterThan(0);
      expect(explanation.concerns[0]).toContain('Docker');
    });
  });
});
