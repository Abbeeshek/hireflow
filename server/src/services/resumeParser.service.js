import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { Resume } from '../models/index.js';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { extractText } from '../ai/textExtractor.js';
import { redactPII } from '../ai/redact.js';
import ai from '../ai/index.js';
import { getSkillEmbeddings } from './embedding.service.js';
import { logAudit } from './audit.service.js';

export const parsedProfileSchema = z.object({
  summary: z.string().default(''),
  totalExperienceYears: z.number().default(0),
  skills: z.array(z.string()).default([]),
  experience: z.array(
    z.object({
      title: z.string().default(''),
      company: z.string().default(''),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      durationMonths: z.number().default(0),
      description: z.string().default(''),
      technologies: z.array(z.string()).default([])
    })
  ).default([]),
  projects: z.array(
    z.object({
      title: z.string().default(''),
      description: z.string().default(''),
      techStack: z.array(z.string()).default([])
    })
  ).default([]),
  education: z.array(
    z.object({
      degree: z.string().default(''),
      field: z.string().default(''),
      institution: z.string().default(''),
      year: z.union([z.number(), z.string()]).nullable().optional()
    })
  ).default([]),
  certifications: z.array(z.string()).default([])
});

/**
 * Deterministically computes duration in months between two date representations.
 */
export function calculateDurationMonths(startDateStr, endDateStr) {
  if (!startDateStr) return 0;

  const parseDate = (str, isEnd = false) => {
    if (!str) return isEnd ? new Date() : null;
    const lower = String(str).toLowerCase().trim();
    if (['present', 'current', 'now', 'ongoing'].includes(lower)) {
      return new Date();
    }
    // YYYY-MM
    const ymMatch = lower.match(/^(\d{4})[-/.](\d{1,2})$/);
    if (ymMatch) {
      return new Date(parseInt(ymMatch[1], 10), parseInt(ymMatch[2], 10) - 1, 1);
    }
    // Month YYYY or YYYY
    const myMatch = lower.match(/^(?:([a-z]+|\d{1,2})[-/.\s]+)?(\d{4})$/);
    if (myMatch) {
      const year = parseInt(myMatch[2], 10);
      let month = 0;
      if (myMatch[1]) {
        const mNum = parseInt(myMatch[1], 10);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
          month = mNum - 1;
        } else {
          const monthNames = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
          ];
          const idx = monthNames.findIndex((mn) => myMatch[1].startsWith(mn));
          if (idx !== -1) month = idx;
        }
      }
      return new Date(year, month, 1);
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const start = parseDate(startDateStr, false);
  const end = parseDate(endDateStr, true);

  if (!start || !end || end < start) return 0;

  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return Math.max(1, months);
}

/**
 * Deterministically calculates total experience in years from verified role durations.
 */
export function computeTotalExperienceYears(experienceList) {
  if (!Array.isArray(experienceList) || experienceList.length === 0) return 0;
  let totalMonths = 0;
  for (const exp of experienceList) {
    if (exp.durationMonths && typeof exp.durationMonths === 'number' && exp.durationMonths > 0) {
      totalMonths += exp.durationMonths;
    }
  }
  return Number((totalMonths / 12).toFixed(1));
}

/**
 * Parses a resume: extracts text, redacts PII, calls AI provider with Zod schema,
 * normalizes calculations in code, and saves profile to database.
 * @param {string} resumeId
 * @returns {Promise<Resume>}
 */
export async function parseResume(resumeId) {
  const resume = await Resume.findById(resumeId);
  if (!resume) {
    throw new Error(`Resume not found: ${resumeId}`);
  }

  // Set status to processing
  resume.parseStatus = 'processing';
  resume.parseError = null;
  await resume.save();

  try {
    const filePath = path.join(UPLOAD_DIR, resume.storedName);
    const { text, sentences } = await extractText(filePath, {
      mimeType: resume.mimeType,
      originalName: resume.originalName
    });

    resume.extractedText = text;
    resume.sentences = sentences;

    // Redact PII (emails, phones, URLs) before sending to LLM
    const redactedText = redactPII(text);

    const systemPrompt = `You are a specialized HR resume parsing engine.
Extract structured professional profile information from the supplied redacted resume text into JSON conforming to the requested schema.
CRITICAL RULES:
- Never infer or invent personal protected attributes (gender, age, race, religion, address).
- Extract skills mentioned or demonstrated in the text.
- Return structured experience, projects, education, and certifications.`;

    const parsedJson = await ai.generateJson({
      task: 'parse_resume',
      systemPrompt,
      userPrompt: redactedText,
      zodSchema: parsedProfileSchema
    });

    // Recompute experience durations in deterministic code
    if (Array.isArray(parsedJson.experience)) {
      for (const exp of parsedJson.experience) {
        const computedDuration = calculateDurationMonths(exp.startDate, exp.endDate);
        if (computedDuration > 0) {
          exp.durationMonths = computedDuration;
        } else if (!exp.durationMonths || exp.durationMonths < 0) {
          exp.durationMonths = 12; // default 1 year fallback if date unparseable
        }
      }
    }

    // Recompute totalExperienceYears in code (do not trust LLM arithmetic)
    const codeCalculatedYears = computeTotalExperienceYears(parsedJson.experience);
    if (codeCalculatedYears > 0) {
      parsedJson.totalExperienceYears = codeCalculatedYears;
    } else if (!parsedJson.totalExperienceYears || parsedJson.totalExperienceYears < 0) {
      parsedJson.totalExperienceYears = 0;
    }

    // Deduplicate and trim skills
    if (Array.isArray(parsedJson.skills)) {
      parsedJson.skills = [
        ...new Set(
          parsedJson.skills
            .filter((s) => typeof s === 'string' && s.trim().length > 0)
            .map((s) => s.trim())
        )
      ];
    }

    resume.parsedProfile = parsedJson;
    resume.parseStatus = 'done';
    resume.parsedAt = new Date();
    resume.parserProvider = ai.providerName;
    await resume.save();

    // Cache embeddings for all extracted skills asynchronously
    if (parsedJson.skills.length > 0) {
      getSkillEmbeddings(parsedJson.skills).catch(() => {});
    }

    await logAudit({
      actor: resume.candidate,
      action: 'AI_PARSE',
      entityType: 'Resume',
      entityId: resume._id,
      meta: {
        provider: ai.providerName,
        totalExperienceYears: parsedJson.totalExperienceYears,
        skillsCount: parsedJson.skills.length
      }
    });

    return resume;
  } catch (err) {
    resume.parseStatus = 'failed';
    resume.parseError = err.message || 'Failed to parse resume text';
    await resume.save();
    return resume;
  }
}

/**
 * In-process background parsing queue.
 * Limits concurrency and processes jobs asynchronously without blocking HTTP requests.
 */
class InProcessParseQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(resumeId) {
    if (!this.queue.includes(resumeId)) {
      this.queue.push(resumeId);
    }
    this.processNext();
  }

  async processNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const resumeId = this.queue.shift();
    this.running++;

    try {
      await parseResume(resumeId);
    } catch (err) {
      console.error(`[InProcessParseQueue] Error parsing resume ${resumeId}:`, err.message);
    } finally {
      this.running--;
      this.processNext();
    }
  }
}

export const parseQueue = new InProcessParseQueue(2);

/**
 * Enqueues a resume for background parsing.
 */
export function enqueueResumeParse(resumeId) {
  parseQueue.enqueue(resumeId);
}

/**
 * Ensures a resume is parsed before screening.
 * If status is 'pending' or 'processing', awaits parsing completion.
 */
export async function ensureResumeParsed(resumeId) {
  const resume = await Resume.findById(resumeId);
  if (!resume) return null;

  if (resume.parseStatus === 'done' || resume.parseStatus === 'failed') {
    return resume;
  }

  return parseResume(resumeId);
}

export default {
  parseResume,
  enqueueResumeParse,
  ensureResumeParsed,
  calculateDurationMonths,
  computeTotalExperienceYears
};
