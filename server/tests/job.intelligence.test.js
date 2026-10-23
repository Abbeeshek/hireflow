import { jest } from '@jest/globals';
import { generateCriteriaInputSchema, criteriaSuggestionOutputSchema } from '../src/validators/job.validator.js';
import { generateJobCriteria } from '../src/services/job.service.js';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Job Intelligence (M3)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Criteria Validation Schemas', () => {
    test('validates input brief and title correctly', () => {
      const valid = {
        title: 'Senior Backend Engineer',
        brief: 'Looking for a seasoned Node.js developer to lead architecture for cloud microservices.',
        experienceMin: 3,
        experienceMax: 6
      };
      const parsed = generateCriteriaInputSchema.parse(valid);
      expect(parsed.title).toBe('Senior Backend Engineer');
      expect(parsed.experienceMin).toBe(3);
    });

    test('rejects missing or empty title/brief', () => {
      expect(() => generateCriteriaInputSchema.parse({ title: '', brief: '' })).toThrow();
    });

    test('validates criteria suggestion output schema with scoring weights summing to 100', () => {
      const output = {
        description: 'Lead engineering initiatives...',
        requiredSkills: ['Node.js', 'PostgreSQL', 'Docker'],
        preferredSkills: ['Kubernetes', 'Redis'],
        suggestedMustHaveSkills: ['Node.js'],
        interviewStages: ['screening', 'technical', 'offer'],
        scoringWeights: {
          skills: 35,
          experience: 25,
          projects: 20,
          education: 10,
          roleAlignment: 10
        }
      };

      const parsed = criteriaSuggestionOutputSchema.parse(output);
      expect(parsed.scoringWeights.skills).toBe(35);
      const sum =
        parsed.scoringWeights.skills +
        parsed.scoringWeights.experience +
        parsed.scoringWeights.projects +
        parsed.scoringWeights.education +
        parsed.scoringWeights.roleAlignment;
      expect(sum).toBe(100);
    });
  });

  describe('generateJobCriteria service', () => {
    test('produces suggestions without mutating database', async () => {
      const fakeCompanyId = new mongoose.Types.ObjectId();
      const fakeUserId = new mongoose.Types.ObjectId();

      const suggestions = await generateJobCriteria(fakeCompanyId, fakeUserId, {
        title: 'Full Stack Engineer',
        brief: 'Build React frontend and Express backend applications with database management.'
      });

      expect(suggestions).toBeDefined();
      expect(suggestions.requiredSkills.length).toBeGreaterThan(0);
      expect(suggestions.suggestedMustHaveSkills.length).toBeGreaterThan(0);
      expect(suggestions.scoringWeights).toBeDefined();
      const totalWeight = Object.values(suggestions.scoringWeights).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBe(100);
    });
  });
});
