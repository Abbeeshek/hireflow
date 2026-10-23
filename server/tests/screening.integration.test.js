import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User, Company, Job, Application, Resume } from '../src/models/index.js';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('AI Screening Endpoints & Access Control Integration (M4)', () => {
  let adminToken, recruiterToken, otherRecruiterToken, candidateToken;
  let company1, company2;
  let recruiterUser, otherRecruiterUser, candidateUser;
  let jobNormal, jobBlind;
  let resume;
  let appNormal, appBlind;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-hireflow-super-secure';

    // 2. Create users
    recruiterUser = await User.create({
      name: 'Alpha Recruiter',
      email: `recruiter-alpha-${Date.now()}@hireflow.test`,
      passwordHash: 'hash',
      role: 'recruiter'
    });
    recruiterToken = jwt.sign({ id: recruiterUser._id, role: 'recruiter', email: recruiterUser.email }, JWT_SECRET);

    otherRecruiterUser = await User.create({
      name: 'Beta Recruiter',
      email: `recruiter-beta-${Date.now()}@hireflow.test`,
      passwordHash: 'hash',
      role: 'recruiter'
    });
    otherRecruiterToken = jwt.sign({ id: otherRecruiterUser._id, role: 'recruiter', email: otherRecruiterUser.email }, JWT_SECRET);

    // 1. Create companies with required owner
    company1 = await Company.create({
      name: 'Alpha Corp',
      description: 'Alpha Tech',
      website: 'https://alpha.test',
      owner: recruiterUser._id
    });
    recruiterUser.company = company1._id;
    await recruiterUser.save();

    company2 = await Company.create({
      name: 'Beta Corp',
      description: 'Beta Tech',
      website: 'https://beta.test',
      owner: otherRecruiterUser._id
    });
    otherRecruiterUser.company = company2._id;
    await otherRecruiterUser.save();


    candidateUser = await User.create({
      name: 'Jane Doe',
      email: `candidate-${Date.now()}@hireflow.test`,
      passwordHash: 'hash',
      role: 'candidate'
    });
    candidateToken = jwt.sign({ id: candidateUser._id, role: 'candidate', email: candidateUser.email }, JWT_SECRET);

    // 3. Create jobs
    jobNormal = await Job.create({
      company: company1._id,
      createdBy: recruiterUser._id,
      title: 'Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'full-time',
      workMode: 'remote',
      openings: 1,
      experienceMin: 2,
      experienceMax: 5,
      description: 'Build backend and frontend web features using Node.js and React.',
      requiredSkills: ['Node.js', 'React'],
      preferredSkills: ['Docker'],
      mustHaveSkills: ['Node.js'],
      blindScreening: false,
      status: 'published'
    });

    jobBlind = await Job.create({
      company: company1._id,
      createdBy: recruiterUser._id,
      title: 'Senior Systems Engineer',
      department: 'Infrastructure',
      location: 'Remote',
      employmentType: 'full-time',
      workMode: 'remote',
      openings: 1,
      experienceMin: 3,
      experienceMax: 6,
      description: 'Architect scalable cloud infrastructure and backend systems.',
      requiredSkills: ['Node.js', 'Docker'],
      preferredSkills: ['AWS'],
      mustHaveSkills: ['Node.js'],
      blindScreening: true,
      status: 'published'
    });

    // 4. Create resumes
    resume = await Resume.create({
      candidate: candidateUser._id,
      originalName: 'Jane_Doe_Resume.pdf',
      storedName: `jane_dummy_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      size: 1024,
      parseStatus: 'done',
      parsedProfile: {
        summary: 'Full stack developer with 4 years experience building web applications with Node.js and React.',
        totalExperienceYears: 4,
        skills: ['node.js', 'react', 'mongodb', 'docker'],
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            startDate: '2020-01',
            endDate: 'Present',
            durationMonths: 48,
            description: 'Engineered REST APIs with Node.js and UI components in React.',
            technologies: ['node.js', 'react']
          }
        ],
        projects: [
          {
            title: 'Cloud Management App',
            description: 'Docker and Node.js management dashboard.',
            techStack: ['node.js', 'docker']
          }
        ],
        education: [
          {
            degree: 'Bachelor of Science in Computer Science',
            field: 'Computer Science',
            institution: 'University',
            year: 2020
          }
        ],
        certifications: []
      },
      sentences: [
        'Full stack developer with 4 years experience building web applications.',
        'Engineered REST APIs with Node.js and UI components in React.',
        'Docker and Node.js management dashboard.'
      ]
    });

    const resumeBlind = await Resume.create({
      candidate: candidateUser._id,
      originalName: 'Jane_Doe_Blind_Resume.pdf',
      storedName: `jane_blind_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      size: 1024,
      parseStatus: 'done',
      parsedProfile: resume.parsedProfile,
      sentences: resume.sentences
    });

    // 5. Create applications
    appNormal = await Application.create({
      job: jobNormal._id,
      candidate: candidateUser._id,
      resume: resume._id,
      aiConsent: true,
      aiConsentAt: new Date(),
      stage: 'applied'
    });

    appBlind = await Application.create({
      job: jobBlind._id,
      candidate: candidateUser._id,
      resume: resumeBlind._id,
      aiConsent: true,
      aiConsentAt: new Date(),
      stage: 'applied'
    });

  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('POST /api/jobs/:id/apply requires aiConsent: true', async () => {
    const res = await request(app)
      .post(`/api/jobs/${jobNormal._id}/apply`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        resumeId: String(resume._id),
        coverNote: 'Excited to apply',
        aiConsent: false // Missing or false consent
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Recruiter can trigger single rescreen POST /api/applications/:id/screen', async () => {
    const res = await request(app)
      .post(`/api/applications/${appNormal._id}/screen`)
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.screening).toBeDefined();
    expect(res.body.data.application.screening.status).toBe('completed');
    expect(res.body.data.application.screening.overall).toBeGreaterThanOrEqual(50);
    expect(['strong', 'potential', 'low']).toContain(res.body.data.application.screening.bucket);
    // Automatic stage advancement: applied -> screening
    expect(res.body.data.application.stage).toBe('screening');
  });

  test('Candidate NEVER receives screening payload (Principle #6)', async () => {
    const res = await request(app)
      .get(`/api/applications/${appNormal._id}`)
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.application).toBeDefined();
    expect(res.body.data.application.screening).toBeUndefined();
  });

  test('Recruiter from another company is forbidden from screening or comparing', async () => {
    const resScreen = await request(app)
      .post(`/api/applications/${appNormal._id}/screen`)
      .set('Authorization', `Bearer ${otherRecruiterToken}`);

    expect(resScreen.status).toBe(403);

    const resCompare = await request(app)
      .get(`/api/recruiter/jobs/${jobNormal._id}/compare?ids=${appNormal._id},${appBlind._id}`)
      .set('Authorization', `Bearer ${otherRecruiterToken}`);

    expect(resCompare.status).toBe(404); // Job not found for other company
  });

  test('Blind screening anonymizes identity at applied/screening and blocks resume download', async () => {
    // Screen blind application first
    await request(app)
      .post(`/api/applications/${appBlind._id}/screen`)
      .set('Authorization', `Bearer ${recruiterToken}`);

    const resApp = await request(app)
      .get(`/api/applications/${appBlind._id}`)
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(resApp.status).toBe(200);
    expect(resApp.body.data.application.candidate.name).toMatch(/^Candidate A-/);
    expect(resApp.body.data.application.candidate.email).toBeUndefined();
    expect(resApp.body.data.application.candidate.isAnonymized).toBe(true);

    // Resume download must be blocked with 403
    const resDl = await request(app)
      .get(`/api/resumes/${appBlind.resume}/download`)
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(resDl.status).toBe(403);
    expect(resDl.body.error.message).toContain('revealed after shortlisting');
  });

  test('Blind screening reveals identity once candidate is moved to shortlisted', async () => {
    // Move candidate to shortlisted
    await request(app)
      .patch(`/api/applications/${appBlind._id}/stage`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ stage: 'shortlisted', note: 'Strong fit for infrastructure' });

    const resApp = await request(app)
      .get(`/api/applications/${appBlind._id}`)
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(resApp.status).toBe(200);
    expect(resApp.body.data.application.candidate.name).toBe('Jane Doe');
    expect(resApp.body.data.application.candidate.email).toContain('candidate-');
  });

  test('Batch screening trigger POST /api/recruiter/jobs/:id/screen returns 202 { runId }', async () => {
    const res = await request(app)
      .post(`/api/recruiter/jobs/${jobNormal._id}/screen`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ force: true });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.runId).toBeDefined();

    // Check status polling
    const resStatus = await request(app)
      .get(`/api/recruiter/jobs/${jobNormal._id}/screen/status`)
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(resStatus.status).toBe(200);
    expect(resStatus.body.data.total).toBeDefined();
  });

  afterAll(async () => {
    await disconnectDB();
  });
});
