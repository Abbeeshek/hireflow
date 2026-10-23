import { jest } from '@jest/globals';
import PDFDocument from 'pdfkit';
import { extractText, splitSentences } from '../src/ai/textExtractor.js';
import {
  calculateDurationMonths,
  computeTotalExperienceYears,
  parsedProfileSchema
} from '../src/services/resumeParser.service.js';

describe('Resume Pipeline (M2)', () => {
  describe('Text Extractor', () => {
    test('extracts text and splits sentences from a valid PDF buffer', async () => {
      // Build a realistic PDF with PDFKit
      const doc = new PDFDocument();
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      const endPromise = new Promise((resolve) => doc.on('end', resolve));

      doc.text('Senior Full Stack Engineer with 5 years experience.');
      doc.text('Built scalable RESTful services using Node.js and Express.');
      doc.text('Developed responsive web frontends with React and Redux.');
      doc.text('Proficient in MongoDB, Docker, and AWS.');
      doc.end();

      await endPromise;
      const pdfBuffer = Buffer.concat(chunks);

      const result = await extractText(pdfBuffer, { mimeType: 'application/pdf', originalName: 'resume.pdf' });
      expect(result.text).toContain('Senior Full Stack Engineer');
      expect(result.sentences.length).toBeGreaterThanOrEqual(3);
      expect(result.sentences[0]).toMatch(/Senior Full Stack Engineer/);
    });

    test('rejects legacy .doc file with clear message', async () => {
      const buffer = Buffer.from('dummy doc file content');
      await expect(
        extractText(buffer, { mimeType: 'application/msword', originalName: 'resume.doc' })
      ).rejects.toThrow('unsupported or scanned file, upload a text PDF or DOCX');
    });

    test('rejects scanned / empty PDF with clear message', async () => {
      // Create empty/scanned PDF with almost no text
      const doc = new PDFDocument();
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      const endPromise = new Promise((resolve) => doc.on('end', resolve));
      doc.text('Hi');
      doc.end();
      await endPromise;
      const smallPdf = Buffer.concat(chunks);

      await expect(
        extractText(smallPdf, { mimeType: 'application/pdf', originalName: 'scanned.pdf' })
      ).rejects.toThrow('unsupported or scanned file, upload a text PDF or DOCX');
    });

    test('splitSentences extracts clean numbered sentences without page artifacts', () => {
      const text = `
        Jane Doe
        -- 1 of 2 --
        Senior Developer at Tech Co.
        • Spearheaded migration from monolithic to microservices architecture.
        • Improved API performance by 35% through Redis caching.
      `;
      const sentences = splitSentences(text);
      expect(sentences).toContain('Jane Doe');
      expect(sentences).toContain('Senior Developer at Tech Co.');
      expect(sentences).toContain('Spearheaded migration from monolithic to microservices architecture.');
      expect(sentences).toContain('Improved API performance by 35% through Redis caching.');
      // Ensure page footer was removed
      expect(sentences.some((s) => s.includes('1 of 2'))).toBe(false);
    });
  });

  describe('Deterministic Date and Experience Calculation', () => {
    test('calculateDurationMonths computes accurate months between dates', () => {
      // 2020-01 to 2021-01 = 13 months inclusive
      expect(calculateDurationMonths('2020-01', '2021-01')).toBe(13);
      // 2021-01 to 2021-06 = 6 months
      expect(calculateDurationMonths('2021-01', '2021-06')).toBe(6);
      // Present end date
      const from2020 = calculateDurationMonths('2020-01', 'Present');
      expect(from2020).toBeGreaterThanOrEqual(48);
    });

    test('computeTotalExperienceYears sums durations deterministically', () => {
      const experience = [
        { durationMonths: 24 },
        { durationMonths: 18 },
        { durationMonths: 6 }
      ];
      // (24 + 18 + 6) / 12 = 48 / 12 = 4.0
      expect(computeTotalExperienceYears(experience)).toBe(4.0);
    });

    test('parsedProfileSchema validates structured profile', () => {
      const sample = {
        summary: 'Experienced engineer',
        totalExperienceYears: 4,
        skills: ['React', 'Node.js', 'MongoDB'],
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            startDate: '2020-01',
            endDate: '2024-01',
            durationMonths: 48,
            description: 'Built APIs',
            technologies: ['Node.js', 'Express']
          }
        ],
        projects: [
          {
            title: 'Portal',
            description: 'Customer portal',
            techStack: ['React']
          }
        ],
        education: [
          {
            degree: 'B.S.',
            field: 'Computer Science',
            institution: 'MIT',
            year: 2020
          }
        ],
        certifications: []
      };

      const parsed = parsedProfileSchema.parse(sample);
      expect(parsed.totalExperienceYears).toBe(4);
      expect(parsed.skills).toHaveLength(3);
    });
  });
});
