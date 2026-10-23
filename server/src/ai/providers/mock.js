/**
 * Deterministic Mock AI Provider for HireFlow Phase 2.
 * Works 100% offline with zero network requests and zero API keys.
 */

import { SKILL_ALIASES, getCanonicalSkill } from '../skillAliases.js';

const DIMENSION = 256;

// FNV-1a 32-bit hash function
const hashString = (str) => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Generate a deterministic 256-dimensional normalized vector for a text string.
 * Features canonical alias expansion to ensure semantic closeness between synonyms.
 */
export const generateDeterministicEmbedding = (text) => {
  const vector = new Array(DIMENSION).fill(0);
  if (!text || typeof text !== 'string') return vector;

  const rawLower = text.toLowerCase().trim();

  // 1. Alias expansion
  const tokens = [];
  const words = rawLower.split(/[\s,./\\;:+*&|(){}[\]<>!?'"`~_-]+/).filter((w) => w.length > 1);
  tokens.push(...words);

  // Check multi-word phrase matches in SKILL_ALIASES
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (rawLower.includes(canonical)) {
      tokens.push(canonical, `${canonical}_core`, 'tech_skill');
    }
    for (const alias of aliases) {
      if (rawLower.includes(alias)) {
        tokens.push(canonical, `${canonical}_core`, 'tech_skill');
      }
    }
  }

  // 2. Hash tokens into vector dimensions
  for (const token of tokens) {
    const h1 = hashString(token);
    const idx = h1 % DIMENSION;
    const sign = (h1 >>> 16) % 2 === 0 ? 1 : -1;
    vector[idx] += sign * 1.5;

    // N-gram hashing for subwords
    if (token.length > 4) {
      const h2 = hashString(token.substring(0, 4));
      const idx2 = h2 % DIMENSION;
      const sign2 = (h2 >>> 16) % 2 === 0 ? 1 : -1;
      vector[idx2] += sign2 * 0.5;
    }
  }

  // 3. L2 Normalize
  let sumSq = 0;
  for (let i = 0; i < DIMENSION; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq);

  if (norm > 0) {
    for (let i = 0; i < DIMENSION; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
};

/**
 * Compute cosine similarity between two vectors
 */
export const cosineSimilarity = (v1, v2) => {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;
  return Number(Math.max(-1, Math.min(1, dot / denominator)).toFixed(4));
};

export class MockAiProvider {
  constructor() {
    this.name = 'mock';
    this.model = 'mock-heuristics-256d';
  }

  async embed(texts) {
    if (!Array.isArray(texts)) texts = [texts];
    return texts.map((t) => generateDeterministicEmbedding(t));
  }

  async generateJson({ task, systemPrompt, userPrompt, zodSchema }) {
    let result = null;

    if (task === 'parse_resume') {
      result = this.mockParseResume(userPrompt);
    } else if (task === 'job_criteria') {
      result = this.mockJobCriteria(userPrompt);
    } else if (task === 'evidence_selection') {
      result = this.mockEvidenceSelection(userPrompt);
    } else if (task === 'explain_screening') {
      result = this.mockExplainScreening(userPrompt);
    } else {
      result = {};
    }

    if (zodSchema) {
      return zodSchema.parse(result);
    }
    return result;
  }

  mockParseResume(promptText) {
    const textLower = (promptText || '').toLowerCase();

    // 1. Detect skills via dictionary
    const detectedSkills = [];
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      if (textLower.includes(canonical) || aliases.some((a) => textLower.includes(a))) {
        detectedSkills.push(canonical);
      }
    }

    // 2. Detect experience years from patterns like "5 years of experience", "4+ years", "(2020 - Present)"
    let years = 3;
    const expMatch = textLower.match(/(\d+)\+?\s*(?:years|yrs)\b/);
    if (expMatch) {
      years = parseInt(expMatch[1], 10);
    }

    // 3. Education detection
    const degree = textLower.includes('master')
      ? 'Master of Science in Computer Science'
      : textLower.includes('phd')
      ? 'Ph.D. in Computer Science'
      : textLower.includes('bachelor') || textLower.includes('b.s.')
      ? 'Bachelor of Science in Computer Science'
      : 'B.S. in Software Engineering';

    const cleanLines = (promptText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20 && !l.includes('[REDACTED'));

    const summary = cleanLines.slice(0, 2).join(' ') ||
      `Experienced engineer with ${years} years developing distributed applications and frontend interfaces.`;

    return {
      summary,
      totalExperienceYears: years,
      skills: detectedSkills.length > 0 ? detectedSkills : ['javascript', 'react', 'node.js'],
      experience: [
        {
          title: 'Senior Software Engineer',
          company: 'Technology Solutions Corp',
          startDate: '2022-01',
          endDate: 'Present',
          durationMonths: Math.max(12, years * 12),
          description: 'Engineered scalable backend microservices and client-facing web applications.',
          technologies: detectedSkills.slice(0, 4)
        }
      ],
      projects: [
        {
          title: 'Distributed Cloud Platform',
          description: 'High-availability data pipeline and real-time dashboard.',
          techStack: detectedSkills.slice(0, 3)
        }
      ],
      education: [
        {
          degree,
          field: 'Computer Science',
          institution: 'State University',
          year: 2026 - years
        }
      ],
      certifications: ['AWS Certified Solutions Architect']
    };
  }

  mockJobCriteria(promptText) {
    let title = 'Software Engineer';
    try {
      const parsed = JSON.parse(promptText);
      if (parsed.title) title = parsed.title;
    } catch (e) {
      const match = (promptText || '').match(/title[:\s"]+([^"\n,]+)/i);
      if (match) title = match[1].trim();
    }

    const isFrontend = /front|react|ui|web/i.test(title);
    const isBackend = /back|node|api|server|cloud|systems/i.test(title);

    let requiredSkills = ['Node.js', 'MongoDB', 'REST APIs'];
    let preferredSkills = ['Docker', 'AWS', 'Jest'];
    let mustHaveSkills = ['Node.js'];

    if (isFrontend) {
      requiredSkills = ['React', 'JavaScript', 'HTML5', 'CSS3'];
      preferredSkills = ['TypeScript', 'Tailwind CSS', 'Next.js'];
      mustHaveSkills = ['React'];
    } else if (isBackend) {
      requiredSkills = ['Node.js', 'Express', 'MongoDB', 'REST APIs'];
      preferredSkills = ['Docker', 'Redis', 'AWS'];
      mustHaveSkills = ['Node.js', 'MongoDB'];
    }

    return {
      description: `We are looking for a skilled ${title} to design, implement, and maintain scalable systems. You will collaborate with cross-functional teams to deliver performant features and maintain high code quality standards.`,
      requiredSkills,
      preferredSkills,
      suggestedMustHaveSkills: mustHaveSkills,
      interviewStages: ['screening', 'assessment', 'interview1', 'interview2', 'offer'],
      scoringWeights: {
        skills: 35,
        experience: 25,
        projects: 20,
        education: 10,
        roleAlignment: 10
      }
    };
  }

  mockEvidenceSelection(promptText) {
    // LLM picks sentence indexes from numbered candidates
    // Return array of indexes: { selectedSentenceIndexes: [0, 1] }
    return {
      selectedSentenceIndexes: [0]
    };
  }

  mockExplainScreening(promptText) {
    let overall = 75;
    let bucket = 'strong';
    let skillsMatched = [];
    let skillsMissing = [];

    try {
      const data = typeof promptText === 'string' ? JSON.parse(promptText) : promptText;
      if (data.overall !== undefined) overall = data.overall;
      if (data.bucket) bucket = data.bucket;
      if (data.skillsMatched) skillsMatched = data.skillsMatched;
      if (data.skillsMissing) skillsMissing = data.skillsMissing;
    } catch (e) {
      // fallback
    }

    const summary = `Candidate demonstrates a ${bucket} overall match with a score of ${overall}/100. Core technical competencies align well with the job requirements. Demonstrated relevant industry project work supported by resume evidence.`;

    const strengths = [
      'Strong direct overlap on core required technical proficiencies.',
      'Documented hands-on project accomplishments matching role focus.',
      'Solid experience background fulfilling minimum job tenure requirements.'
    ];

    const concerns = [];
    if (skillsMissing && skillsMissing.length > 0) {
      concerns.push(`No supporting evidence found for required skill(s): ${skillsMissing.slice(0, 3).join(', ')}.`);
    }
    if (overall < 70) {
      concerns.push('Experience or project portfolio is partially aligned with position complexity.');
    }
    if (concerns.length === 0) {
      concerns.push('Minor gaps in preferred nice-to-have tooling.');
    }

    return {
      summary,
      strengths,
      concerns
    };
  }
}

export default MockAiProvider;
