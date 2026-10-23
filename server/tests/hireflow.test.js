import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import { User, Company, Job, Resume, Application } from '../src/models/index.js';
import { UPLOAD_DIR } from '../src/middleware/upload.js';

let mongoServer;

beforeAll(async () => {
  // Start isolated MongoMemoryServer for tests
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clear collections before each test suite
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('HireFlow ATS Test Suite', () => {
  // 1. Auth Flow
  describe('1. Authentication Flow', () => {
    it('should register a candidate and set auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Candidate',
          email: 'cand@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('cand@hireflow.test');
      expect(res.body.data.user.role).toBe('candidate');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should register a recruiter with required companyName', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Recruiter',
          email: 'rec@hireflow.test',
          password: 'Password@123',
          role: 'recruiter',
          companyName: 'Apex Innovations'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('recruiter');
      expect(res.body.data.user.company).toBeDefined();
      expect(res.body.data.user.company.name).toBe('Apex Innovations');
    });

    it('should reject login with wrong password (401)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User One',
          email: 'user1@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@hireflow.test',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return current user at /api/auth/me with auth cookie', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User Two',
          email: 'user2@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });

      const cookie = registerRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('user2@hireflow.test');
    });
  });

  // 2. RBAC Enforcement
  describe('2. RBAC & Cross-Tenant Access Control', () => {
    it('should block candidate from accessing recruiter routes (403)', async () => {
      const candRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Candidate User',
          email: 'cand_rbac@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });

      const candCookie = candRes.headers['set-cookie'];

      const forbiddenRes = await request(app)
        .get('/api/recruiter/jobs')
        .set('Cookie', candCookie);

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.success).toBe(false);
      expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent recruiter from accessing or modifying another company jobs', async () => {
      // Recruiter A (Company A)
      const recARes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Recruiter A',
          email: 'recA@hireflow.test',
          password: 'Password@123',
          role: 'recruiter',
          companyName: 'Company A'
        });
      const cookieA = recARes.headers['set-cookie'];

      // Recruiter B (Company B)
      const recBRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Recruiter B',
          email: 'recB@hireflow.test',
          password: 'Password@123',
          role: 'recruiter',
          companyName: 'Company B'
        });
      const cookieB = recBRes.headers['set-cookie'];

      // Recruiter A creates a job
      const createJobRes = await request(app)
        .post('/api/recruiter/jobs')
        .set('Cookie', cookieA)
        .send({
          title: 'Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          employmentType: 'full-time',
          workMode: 'remote',
          openings: 1,
          experienceMin: 2,
          experienceMax: 5,
          description: 'Job description for company A.',
          scoringWeights: { skills: 30, experience: 25, projects: 20, education: 15, roleAlignment: 10 }
        });

      expect(createJobRes.status).toBe(201);
      const jobId = createJobRes.body.data.job._id;

      // Recruiter B tries to update Recruiter A's job status -> should return 404 (not found in company)
      const attackRes = await request(app)
        .patch(`/api/recruiter/jobs/${jobId}/status`)
        .set('Cookie', cookieB)
        .send({ status: 'closed' });

      expect(attackRes.status).toBe(404);
      expect(attackRes.body.success).toBe(false);
    });
  });

  // 3. Duplicate Application Protection
  describe('3. Application Rules & Duplicate Protection', () => {
    it('should return 409 Conflict when candidate applies twice to the same job', async () => {
      // 1. Recruiter creates and publishes job
      const recRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Recruiter C',
          email: 'recC@hireflow.test',
          password: 'Password@123',
          role: 'recruiter',
          companyName: 'Acme Apps'
        });
      const recCookie = recRes.headers['set-cookie'];

      const jobRes = await request(app)
        .post('/api/recruiter/jobs')
        .set('Cookie', recCookie)
        .send({
          title: 'Full Stack Engineer',
          department: 'Core',
          location: 'Remote',
          employmentType: 'full-time',
          workMode: 'remote',
          openings: 1,
          experienceMin: 1,
          experienceMax: 4,
          description: 'Full stack development role.',
          status: 'published',
          scoringWeights: { skills: 30, experience: 25, projects: 20, education: 15, roleAlignment: 10 }
        });
      const jobId = jobRes.body.data.job._id;

      // 2. Candidate registers
      const candRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Applicant Charlie',
          email: 'charlie@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });
      const candCookie = candRes.headers['set-cookie'];
      const candId = candRes.body.data.user._id;

      // Create a dummy resume directly in DB
      const dummyResume = await Resume.create({
        candidate: candId,
        originalName: 'charlie_resume.pdf',
        storedName: 'charlie_resume_123.pdf',
        mimeType: 'application/pdf',
        size: 1024
      });

      // 3. First apply -> 201 Created
      const firstApplyRes = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Cookie', candCookie)
        .send({
          resumeId: String(dummyResume._id),
          coverNote: 'First application',
          aiConsent: true
        });

      expect(firstApplyRes.status).toBe(201);
      expect(firstApplyRes.body.data.application.stage).toBe('applied');

      // 4. Second apply to same job -> 409 Conflict
      const secondApplyRes = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Cookie', candCookie)
        .send({
          resumeId: String(dummyResume._id),
          coverNote: 'Duplicate application attempt',
          aiConsent: true
        });

      expect(secondApplyRes.status).toBe(409);
      expect(secondApplyRes.body.success).toBe(false);
      expect(secondApplyRes.body.error.code).toBe('CONFLICT');
    });
  });

  // 4. Invalid File Upload Rejected
  describe('4. File Upload & Magic Byte Security', () => {
    it('should reject file upload with fake magic bytes even if extension is .pdf', async () => {
      const candRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Security Tester',
          email: 'sec_test@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });
      const candCookie = candRes.headers['set-cookie'];

      // Send text file disguised as PDF
      const fakePdfBuffer = Buffer.from('Plain text fake resume without PDF header');

      const uploadRes = await request(app)
        .post('/api/candidate/resumes')
        .set('Cookie', candCookie)
        .attach('resume', fakePdfBuffer, {
          filename: 'fake_resume.pdf',
          contentType: 'application/pdf'
        });

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.success).toBe(false);
      expect(uploadRes.body.error.message).toContain('magic bytes');
    });

    it('should reject non-allowed extensions (e.g. .exe)', async () => {
      const candRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Security Tester 2',
          email: 'sec_test2@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });
      const candCookie = candRes.headers['set-cookie'];

      const exeBuffer = Buffer.from('MZ executable binary dummy');

      const uploadRes = await request(app)
        .post('/api/candidate/resumes')
        .set('Cookie', candCookie)
        .attach('resume', exeBuffer, {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload'
        });

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.success).toBe(false);
    });

    it('should accept valid PDF file with genuine %PDF header', async () => {
      const candRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Security Tester 3',
          email: 'sec_test3@hireflow.test',
          password: 'Password@123',
          role: 'candidate'
        });
      const candCookie = candRes.headers['set-cookie'];

      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      const uploadRes = await request(app)
        .post('/api/candidate/resumes')
        .set('Cookie', candCookie)
        .attach('resume', validPdfBuffer, {
          filename: 'valid_resume.pdf',
          contentType: 'application/pdf'
        });

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.resume.originalName).toBe('valid_resume.pdf');
    });
  });
});
