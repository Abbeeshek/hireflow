import { redactPii } from '../src/ai/redact.js';
import { generateDeterministicEmbedding, cosineSimilarity, MockAiProvider } from '../src/ai/providers/mock.js';
import { generateJson, embed } from '../src/ai/index.js';
import { z } from 'zod';

describe('AI Foundation & Provider Layer (M1)', () => {
  describe('1. PII Redaction', () => {
    it('should redact emails, phone numbers, and URLs from raw text', () => {
      const input = `
        Candidate: Jane Doe
        Contact: jane.doe@example.com or call +1 (555) 234-5678.
        Portfolio: https://janedoe.dev/portfolio and github.com/janedoe
        Skills: React, Node.js, PostgreSQL.
      `;

      const redacted = redactPii(input);

      expect(redacted).not.toContain('jane.doe@example.com');
      expect(redacted).not.toContain('+1 (555) 234-5678');
      expect(redacted).not.toContain('https://janedoe.dev');
      expect(redacted).not.toContain('github.com/janedoe');

      expect(redacted).toContain('[REDACTED_EMAIL]');
      expect(redacted).toContain('[REDACTED_PHONE]');
      expect(redacted).toContain('[REDACTED_URL]');
      expect(redacted).toContain('Skills: React, Node.js, PostgreSQL.');
    });
  });

  describe('2. Deterministic Mock Embeddings & Semantic Closeness', () => {
    it('should generate identical embeddings for the same input (determinism)', () => {
      const v1 = generateDeterministicEmbedding('Full Stack Engineer with React and Node.js');
      const v2 = generateDeterministicEmbedding('Full Stack Engineer with React and Node.js');

      expect(v1.length).toBe(256);
      expect(v1).toEqual(v2);
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 3);
    });

    it('should place "Node.js" close to "server-side JavaScript" (>= 0.60 similarity)', () => {
      const vNode = generateDeterministicEmbedding('Node.js');
      const vJs = generateDeterministicEmbedding('server-side JavaScript');

      const sim = cosineSimilarity(vNode, vJs);
      console.log(`Measured Mock Similarity ["Node.js" vs "server-side JavaScript"]: ${sim}`);
      expect(sim).toBeGreaterThanOrEqual(0.60);
    });

    it('should place "Node.js" far from "Photoshop" (< 0.40 similarity)', () => {
      const vNode = generateDeterministicEmbedding('Node.js');
      const vPhoto = generateDeterministicEmbedding('Photoshop');

      const sim = cosineSimilarity(vNode, vPhoto);
      console.log(`Measured Mock Similarity ["Node.js" vs "Photoshop"]: ${sim}`);
      expect(sim).toBeLessThan(0.40);
    });
  });

  describe('3. Mock Provider Structured JSON Output', () => {
    const mock = new MockAiProvider();

    it('should generate structured resume parse matching Zod schema', async () => {
      const schema = z.object({
        summary: z.string(),
        totalExperienceYears: z.number(),
        skills: z.array(z.string()),
        experience: z.array(z.object({ title: z.string(), company: z.string() })),
        education: z.array(z.object({ degree: z.string() }))
      });

      const parsed = await mock.generateJson({
        task: 'parse_resume',
        userPrompt: 'Experienced developer with 5 years in Node.js, React, and MongoDB. B.S. in Computer Science.',
        zodSchema: schema
      });

      expect(parsed.totalExperienceYears).toBe(5);
      expect(parsed.skills).toContain('node.js');
      expect(parsed.skills).toContain('react');
      expect(parsed.education[0].degree).toContain('Bachelor');
    });

    it('should generate structured job criteria suggestions', async () => {
      const schema = z.object({
        description: z.string(),
        requiredSkills: z.array(z.string()),
        preferredSkills: z.array(z.string()),
        scoringWeights: z.object({
          skills: z.number(),
          experience: z.number(),
          projects: z.number(),
          education: z.number(),
          roleAlignment: z.number()
        })
      });

      const criteria = await mock.generateJson({
        task: 'job_criteria',
        userPrompt: JSON.stringify({ title: 'Lead Frontend Developer' }),
        zodSchema: schema
      });

      expect(criteria.requiredSkills).toContain('React');
      const sum =
        criteria.scoringWeights.skills +
        criteria.scoringWeights.experience +
        criteria.scoringWeights.projects +
        criteria.scoringWeights.education +
        criteria.scoringWeights.roleAlignment;
      expect(sum).toBe(100);
    });
  });

  describe('4. AI Orchestrator Fallback Handling', () => {
    it('should execute tasks via mock provider when in offline mode', async () => {
      const res = await embed(['React', 'TypeScript']);
      expect(res.vectors.length).toBe(2);
      expect(res.vectors[0].length).toBe(256);
      expect(res.meta.provider).toBe('mock');
    });
  });
});
