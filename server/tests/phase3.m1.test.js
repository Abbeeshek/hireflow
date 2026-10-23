import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { generateSlots } from '../src/services/slotEngine.js';
import { generateIcs } from '../src/services/icsGenerator.js';
import { runReminderJobs } from '../src/services/cronService.js';
import {
  User,
  Company,
  Job,
  Application,
  Resume,
  Interview,
  Notification,
  EmailLog
} from '../src/models/index.js';

describe('Phase 3 - M1: Scheduling, Notifications, Email & Team Management', () => {
  let ownerUser, ownerToken;
  let teammateUser, teammateToken;
  let otherCompanyOwner, otherCompanyToken;
  let candidateUser, candidateToken;
  let company1, company2;
  let testJob;
  let testResume;
  let testApplication;
  const JWT_SECRET = process.env.JWT_SECRET || 'hireflow_dev_secret_key_change_in_production_2026';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Clean test collections
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Job.deleteMany({}),
      Application.deleteMany({}),
      Resume.deleteMany({}),
      Interview.deleteMany({}),
      Notification.deleteMany({}),
      EmailLog.deleteMany({})
    ]);

    // Create Company 1 Owner
    ownerUser = await User.create({
      name: 'Acme Owner',
      email: 'owner@acme.test',
      passwordHash: 'hash',
      role: 'recruiter',
      timezone: 'Asia/Kolkata',
      availability: {
        weekly: [
          { day: 'monday', start: '10:00', end: '18:00' },
          { day: 'tuesday', start: '10:00', end: '18:00' },
          { day: 'wednesday', start: '10:00', end: '18:00' }
        ],
        bufferMinutes: 15
      }
    });

    company1 = await Company.create({
      name: 'Acme Technologies',
      owner: ownerUser._id,
      website: 'https://acme.test'
    });
    ownerUser.company = company1._id;
    await ownerUser.save();
    ownerToken = jwt.sign({ id: ownerUser._id, role: 'recruiter', company: company1._id }, JWT_SECRET);

    // Create Teammate for Company 1
    teammateUser = await User.create({
      name: 'Acme Teammate',
      email: 'teammate@acme.test',
      passwordHash: 'hash',
      role: 'recruiter',
      company: company1._id,
      timezone: 'Asia/Kolkata',
      availability: {
        weekly: [
          { day: 'monday', start: '11:00', end: '17:00' },
          { day: 'tuesday', start: '11:00', end: '17:00' },
          { day: 'wednesday', start: '11:00', end: '17:00' }
        ],
        bufferMinutes: 15
      }
    });
    teammateToken = jwt.sign({ id: teammateUser._id, role: 'recruiter', company: company1._id }, JWT_SECRET);

    // Create Other Company Owner
    otherCompanyOwner = await User.create({
      name: 'Globex Owner',
      email: 'owner@globex.test',
      passwordHash: 'hash',
      role: 'recruiter',
      timezone: 'America/New_York'
    });
    company2 = await Company.create({
      name: 'Globex Corp',
      owner: otherCompanyOwner._id,
      website: 'https://globex.test'
    });
    otherCompanyOwner.company = company2._id;
    await otherCompanyOwner.save();
    otherCompanyToken = jwt.sign({ id: otherCompanyOwner._id, role: 'recruiter', company: company2._id }, JWT_SECRET);

    // Create Candidate
    candidateUser = await User.create({
      name: 'Jane Candidate',
      email: 'candidate@test.com',
      passwordHash: 'hash',
      role: 'candidate',
      timezone: 'Asia/Kolkata'
    });
    candidateToken = jwt.sign({ id: candidateUser._id, role: 'candidate' }, JWT_SECRET);

    // Create Job for Company 1
    testJob = await Job.create({
      title: 'Senior Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'full-time',
      workMode: 'remote',
      openings: 1,
      experienceMin: 3,
      experienceMax: 7,
      description: 'Building modern web applications.',
      company: company1._id,
      createdBy: ownerUser._id,
      status: 'published'
    });

    testResume = await Resume.create({
      candidate: candidateUser._id,
      originalName: 'Jane_Resume.pdf',
      storedName: 'jane_test_resume.pdf',
      mimeType: 'application/pdf',
      size: 1024
    });

    testApplication = await Application.create({
      job: testJob._id,
      candidate: candidateUser._id,
      resume: testResume._id,
      stage: 'shortlisted',
      stageHistory: [{ stage: 'applied', changedBy: candidateUser._id, at: new Date() }, { stage: 'shortlisted', changedBy: ownerUser._id, at: new Date() }]
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // ==========================================
  // 1. PURE SLOT ENGINE UNIT TESTS
  // ==========================================
  describe('1. PURE slotEngine.js Unit Tests', () => {
    test('computes two-interviewer intersection within mutual working hours', () => {
      // Monday: Inv1 is 10:00 - 18:00 (UTC), Inv2 is 11:00 - 17:00 (UTC)
      const now = DateTime.fromISO('2026-10-19T00:00:00Z'); // Monday 00:00 UTC
      const rangeStart = DateTime.fromISO('2026-10-20T00:00:00Z'); // Tuesday 00:00 UTC (past 24h lead time)
      const rangeEnd = DateTime.fromISO('2026-10-20T23:59:59Z');

      const interviewers = [
        {
          timezone: 'UTC',
          weekly: [{ day: 'tuesday', start: '10:00', end: '18:00' }],
          bufferMinutes: 0,
          busy: []
        },
        {
          timezone: 'UTC',
          weekly: [{ day: 'tuesday', start: '11:00', end: '17:00' }],
          bufferMinutes: 0,
          busy: []
        }
      ];

      const res = generateSlots({
        interviewers,
        durationMinutes: 60,
        rangeStart,
        rangeEnd,
        minLeadHours: 24,
        maxSlots: 6,
        now
      });

      expect(res.slots.length).toBeGreaterThan(0);
      for (const slot of res.slots) {
        const startDt = DateTime.fromJSDate(slot.start, { zone: 'utc' });
        const endDt = DateTime.fromJSDate(slot.end, { zone: 'utc' });
        expect(startDt.hour).toBeGreaterThanOrEqual(11);
        expect(endDt.hour).toBeLessThanOrEqual(17);
      }
    });

    test('enforces buffer time around busy scheduled meetings', () => {
      const now = DateTime.fromISO('2026-10-19T00:00:00Z');
      const rangeStart = DateTime.fromISO('2026-10-20T00:00:00Z');
      const rangeEnd = DateTime.fromISO('2026-10-20T23:59:59Z');

      const interviewers = [
        {
          timezone: 'UTC',
          weekly: [{ day: 'tuesday', start: '10:00', end: '18:00' }],
          bufferMinutes: 15,
          busy: [
            // Busy from 11:00 to 12:00. With 15m buffer, busy is 10:45 to 12:15
            {
              start: DateTime.fromISO('2026-10-20T11:00:00Z'),
              end: DateTime.fromISO('2026-10-20T12:00:00Z')
            }
          ]
        }
      ];

      const res = generateSlots({
        interviewers,
        durationMinutes: 45,
        rangeStart,
        rangeEnd,
        now,
        minLeadHours: 24
      });

      // A slot starting at 10:30 ends at 11:15, which overlaps 10:45-12:15 -> Must be rejected!
      // A slot starting at 11:30 overlaps -> Must be rejected!
      // A slot starting at 12:15 ends at 13:00 -> Allowed
      for (const slot of res.slots) {
        const startDt = DateTime.fromJSDate(slot.start, { zone: 'utc' });
        const endDt = DateTime.fromJSDate(slot.end, { zone: 'utc' });
        const overlapsBusyWithBuffer = startDt < DateTime.fromISO('2026-10-20T12:15:00Z') && endDt > DateTime.fromISO('2026-10-20T10:45:00Z');
        expect(overlapsBusyWithBuffer).toBe(false);
      }
    });

    test('enforces 24-hour minimum lead time and candidate windows', () => {
      const now = DateTime.fromISO('2026-10-19T10:00:00Z');
      // Lead time 24h means earliest possible slot is after 2026-10-20T10:00:00Z
      const rangeStart = DateTime.fromISO('2026-10-19T10:00:00Z');
      const rangeEnd = DateTime.fromISO('2026-10-21T18:00:00Z');

      const candidateWindows = [
        {
          start: DateTime.fromISO('2026-10-20T14:00:00Z'),
          end: DateTime.fromISO('2026-10-20T16:00:00Z')
        }
      ];

      const res = generateSlots({
        interviewers: [{
          timezone: 'UTC',
          weekly: [
            { day: 'monday', start: '09:00', end: '18:00' },
            { day: 'tuesday', start: '09:00', end: '18:00' }
          ],
          busy: []
        }],
        durationMinutes: 45,
        rangeStart,
        rangeEnd,
        candidateWindows,
        now,
        minLeadHours: 24
      });

      expect(res.slots.length).toBeGreaterThan(0);
      for (const s of res.slots) {
        const sStart = DateTime.fromJSDate(s.start, { zone: 'utc' });
        const sEnd = DateTime.fromJSDate(s.end, { zone: 'utc' });
        expect(sStart >= DateTime.fromISO('2026-10-20T14:00:00Z')).toBe(true);
        expect(sEnd <= DateTime.fromISO('2026-10-20T16:00:00Z')).toBe(true);
      }
    });

    test('returns descriptive reason when no slots are possible', () => {
      const now = DateTime.fromISO('2026-10-19T10:00:00Z');
      // Range is fully inside 24h lead time
      const rangeStart = DateTime.fromISO('2026-10-19T11:00:00Z');
      const rangeEnd = DateTime.fromISO('2026-10-19T15:00:00Z');

      const res = generateSlots({
        interviewers: [{
          timezone: 'UTC',
          weekly: [{ day: 'monday', start: '09:00', end: '18:00' }],
          busy: []
        }],
        durationMinutes: 45,
        rangeStart,
        rangeEnd,
        now,
        minLeadHours: 24
      });

      expect(res.slots.length).toBe(0);
      expect(res.reason).toContain('lead time');
    });
  });

  // ==========================================
  // 2. ICS CALENDAR GENERATOR UNIT TESTS
  // ==========================================
  describe('2. RFC 5545 icsGenerator.js Unit Tests', () => {
    test('produces compliant RFC 5545 text with UTC times, CRLF endings, and stable UID', () => {
      const ics = generateIcs({
        interviewId: '6acf001234567890abcdef12',
        title: 'Technical Round - Senior Software Engineer',
        description: 'First technical interview with Acme Technologies team.',
        start: new Date('2026-10-25T10:00:00Z'),
        end: new Date('2026-10-25T11:00:00Z'),
        meetingLink: 'https://meet.jit.si/HireFlow-testmeet123',
        attendees: [
          { name: 'Jane Candidate', email: 'jane@test.com' },
          { name: 'Acme Interviewer', email: 'interviewer@acme.test' }
        ]
      });

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('METHOD:REQUEST');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:hireflow-interview-6acf001234567890abcdef12@hireflow.test');
      expect(ics).toContain('DTSTART:20261025T100000Z');
      expect(ics).toContain('DTEND:20261025T110000Z');
      expect(ics).toContain('STATUS:CONFIRMED');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('\r\n');
    });
  });

  // ==========================================
  // 3. TEAM & AVAILABILITY ENDPOINTS
  // ==========================================
  describe('3. Team & Recruiter Availability Endpoints', () => {
    test('company owner can create new teammate in same company', async () => {
      const res = await request(app)
        .post('/api/recruiter/team')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Sarah Interviewer',
          email: 'sarah.interviewer@acme.test',
          password: 'Password@123',
          role: 'recruiter'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teammate.name).toBe('Sarah Interviewer');
      expect(res.body.data.teammate.email).toBe('sarah.interviewer@acme.test');
    });

    test('non-owner teammate is blocked from creating other teammates', async () => {
      const res = await request(app)
        .post('/api/recruiter/team')
        .set('Authorization', `Bearer ${teammateToken}`)
        .send({
          name: 'Unauthorized Teammate',
          email: 'unauth@acme.test',
          password: 'Password@123',
          role: 'recruiter'
        });

      expect(res.status).toBe(403);
    });

    test('recruiter can get and update their availability and timezone', async () => {
      const getRes = await request(app)
        .get('/api/recruiter/availability')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.timezone).toBe('Asia/Kolkata');

      const updateRes = await request(app)
        .put('/api/recruiter/availability')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          timezone: 'Asia/Kolkata',
          weekly: [
            { day: 'monday', start: '09:30', end: '17:30' },
            { day: 'thursday', start: '10:00', end: '18:00' }
          ],
          bufferMinutes: 20
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.availability.bufferMinutes).toBe(20);
      expect(updateRes.body.data.availability.weekly.length).toBe(2);
    });
  });

  // ==========================================
  // 4. SCHEDULING FLOW INTEGRATION TESTS
  // ==========================================
  describe('4. Complete Interview Scheduling Flow', () => {
    let createdInterview;
    let offeredSlotToPick;

    test('recruiter offers interview slots; stage moves to interview round; candidate is notified & emailed', async () => {
      // Create slots 3 days in advance
      const futureStart = DateTime.utc().plus({ days: 3 }).set({ hour: 11, minute: 0, second: 0, millisecond: 0 });
      const futureEnd = futureStart.plus({ minutes: 60 });

      const res = await request(app)
        .post(`/api/recruiter/applications/${testApplication._id}/interviews/offer-slots`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          round: 'interview1',
          mode: 'video',
          durationMinutes: 60,
          interviewers: [ownerUser._id.toString()],
          selectedSlots: [
            { start: futureStart.toISO(), end: futureEnd.toISO() },
            { start: futureStart.plus({ hours: 2 }).toISO(), end: futureEnd.plus({ hours: 2 }).toISO() }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interview.status).toBe('slots_offered');
      expect(res.body.data.interview.offeredSlots.length).toBe(2);

      createdInterview = res.body.data.interview;
      offeredSlotToPick = createdInterview.offeredSlots[0];

      // Check application stage updated
      const updatedApp = await Application.findById(testApplication._id);
      expect(updatedApp.stage).toBe('interview1');
      const latestHistory = updatedApp.stageHistory[updatedApp.stageHistory.length - 1];
      expect(latestHistory.note).toBe('Interview scheduled');

      // Check candidate notification exists
      const notif = await Notification.findOne({ user: candidateUser._id, type: 'interview_slots_offered' });
      expect(notif).toBeDefined();

      // Check dev mailbox captured email
      const emailLog = await EmailLog.findOne({ to: candidateUser.email, kind: 'slots_offered' });
      expect(emailLog).toBeDefined();
      expect(emailLog.subject).toContain('Interview Invitation');
    });

    test('recruiter from another company is forbidden from scheduling', async () => {
      const res = await request(app)
        .post(`/api/recruiter/applications/${testApplication._id}/interviews/offer-slots`)
        .set('Authorization', `Bearer ${otherCompanyToken}`)
        .send({
          round: 'interview1',
          mode: 'video',
          durationMinutes: 60,
          interviewers: [otherCompanyOwner._id.toString()]
        });

      expect(res.status).toBe(403);
    });

    test('candidate cannot select a slot that was not offered (returns 400)', async () => {
      const rogueTime = DateTime.utc().plus({ days: 10 }).toISO();
      const res = await request(app)
        .post(`/api/candidate/interviews/${createdInterview._id}/select-slot`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ slotStart: rogueTime });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not among the offered slots');
    });

    test('candidate selects a valid slot atomically; meeting link and .ics created; both sides emailed', async () => {
      const res = await request(app)
        .post(`/api/candidate/interviews/${createdInterview._id}/select-slot`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ slotStart: offeredSlotToPick.start });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interview.status).toBe('scheduled');
      expect(res.body.data.interview.meetingLink).toContain('https://meet.jit.si/HireFlow-');

      // Dev mailbox check for .ics attachment
      const candEmail = await EmailLog.findOne({ to: candidateUser.email, kind: 'confirmed_candidate' });
      expect(candEmail).toBeDefined();
      expect(candEmail.ics).toContain('BEGIN:VCALENDAR');

      const invEmail = await EmailLog.findOne({ to: ownerUser.email, kind: 'confirmed_interviewer' });
      expect(invEmail).toBeDefined();
      expect(invEmail.ics).toContain('BEGIN:VCALENDAR');
    });

    test('candidate selecting an already booked slot (or overlapping interview) returns 409 Conflict', async () => {
      // Create a second application and offered interview with identical time slot
      const secondCandidate = await User.create({
        name: 'Bob Candidate',
        email: 'bob@test.com',
        passwordHash: 'hash',
        role: 'candidate'
      });
      const bobToken = jwt.sign({ id: secondCandidate._id, role: 'candidate' }, JWT_SECRET);

      const secondApp = await Application.create({
        job: testJob._id,
        candidate: secondCandidate._id,
        resume: testResume._id,
        stage: 'shortlisted'
      });

      const secondInterview = await Interview.create({
        application: secondApp._id,
        job: testJob._id,
        round: 'interview1',
        mode: 'video',
        durationMinutes: 60,
        interviewers: [ownerUser._id],
        status: 'slots_offered',
        offeredSlots: [{ start: offeredSlotToPick.start, end: offeredSlotToPick.end }],
        offerCreatedAt: new Date(),
        offerExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdBy: ownerUser._id
      });

      // Bob tries to select the exact slot that ownerUser is already booked for
      const res = await request(app)
        .post(`/api/candidate/interviews/${secondInterview._id}/select-slot`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ slotStart: offeredSlotToPick.start });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('conflict with an interviewer schedule');
    });

    test('candidate downloads .ics file via GET /api/interviews/:id/ics', async () => {
      const res = await request(app)
        .get(`/api/interviews/${createdInterview._id}/ics`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('UID:hireflow-interview-');
    });

    test('candidate requests reschedule; status becomes reschedule_requested; limited to max 2', async () => {
      // 1st reschedule
      const res1 = await request(app)
        .post(`/api/candidate/interviews/${createdInterview._id}/request-reschedule`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          reason: 'Urgent dentist appointment at that hour'
        });

      expect(res1.status).toBe(200);
      expect(res1.body.data.interview.rescheduleCount).toBe(1);
      expect(res1.body.data.interview.status).toBe('reschedule_requested');

      // Recruiter re-confirms time
      await Interview.findByIdAndUpdate(createdInterview._id, { status: 'scheduled' });

      // 2nd reschedule
      const res2 = await request(app)
        .post(`/api/candidate/interviews/${createdInterview._id}/request-reschedule`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          reason: 'Power outage in my area'
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.interview.rescheduleCount).toBe(2);

      // Re-confirm time
      await Interview.findByIdAndUpdate(createdInterview._id, { status: 'scheduled' });

      // 3rd reschedule should be rejected with 400
      const res3 = await request(app)
        .post(`/api/candidate/interviews/${createdInterview._id}/request-reschedule`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          reason: 'Yet another scheduling clash'
        });

      expect(res3.status).toBe(400);
      expect(res3.body.error.message).toContain('Maximum reschedule limit (2) reached');
    });

    test('candidate decline-slots stores alternate windows and notifies recruiter', async () => {
      const newApp = await Application.create({
        job: testJob._id,
        candidate: candidateUser._id,
        resume: testResume._id,
        stage: 'shortlisted'
      });

      const newInterview = await Interview.create({
        application: newApp._id,
        job: testJob._id,
        round: 'interview2',
        interviewers: [ownerUser._id],
        status: 'slots_offered',
        offeredSlots: [{ start: new Date(), end: new Date() }],
        createdBy: ownerUser._id
      });

      const winStart = DateTime.utc().plus({ days: 4 }).set({ hour: 14, minute: 0 }).toISO();
      const winEnd = DateTime.utc().plus({ days: 4 }).set({ hour: 17, minute: 0 }).toISO();

      const res = await request(app)
        .post(`/api/candidate/interviews/${newInterview._id}/decline-slots`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          windows: [{ start: winStart, end: winEnd }],
          note: 'I am only free Thursday afternoons'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.interview.status).toBe('slots_declined');
      expect(res.body.data.interview.candidateAvailability.note).toBe('I am only free Thursday afternoons');

      // Check recruiter received notification
      const notif = await Notification.findOne({ user: ownerUser._id, type: 'slots_declined' });
      expect(notif).toBeDefined();
    });

    test('candidate serializer NEVER leaks questions, notes, summaries, or scorecards (Principle #6)', async () => {
      // Attach internal data to interview
      await Interview.findByIdAndUpdate(createdInterview._id, {
        notes: { text: 'Internal confidential recruiter notes', source: 'manual' },
        aiSummary: { summary: 'Strong candidate profile but check system design' }
      });

      const res = await request(app)
        .get('/api/candidate/interviews')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.interviews.length).toBeGreaterThan(0);

      const candidateView = res.body.data.interviews.find((i) => i._id === createdInterview._id);
      expect(candidateView).toBeDefined();
      expect(candidateView.notes).toBeUndefined();
      expect(candidateView.aiSummary).toBeUndefined();
      expect(candidateView.questions).toBeUndefined();
      expect(candidateView.feedbacks).toBeUndefined();
      expect(candidateView.scorecard).toBeUndefined();
      expect(candidateView.evaluation).toBeUndefined();
    });
  });

  // ==========================================
  // 5. CRON & IDEMPOTENCE TESTS
  // ==========================================
  describe('5. Cron Reminders & Dev Mailbox', () => {
    test('runReminderJobs runs idempotently and flags h24 reminder', async () => {
      // Set an interview within 23h from now
      const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000);
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const reminderInterview = await Interview.create({
        application: testApplication._id,
        job: testJob._id,
        round: 'interview1',
        mode: 'video',
        durationMinutes: 60,
        interviewers: [ownerUser._id],
        status: 'scheduled',
        scheduledStart: in23h,
        scheduledEnd: in24h,
        createdBy: ownerUser._id
      });

      // First run: should trigger h24 reminder
      const summary1 = await runReminderJobs();
      expect(summary1.h24Count).toBeGreaterThanOrEqual(1);

      const check1 = await Interview.findById(reminderInterview._id);
      expect(check1.reminders.h24SentAt).not.toBeNull();

      // Second run: IDEMPOTENT - must NOT re-send h24 reminder
      const summary2 = await runReminderJobs();
      expect(summary2.h24Count).toBe(0);
    });

    test('dev mailbox API returns emails scoped to user role', async () => {
      const resCand = await request(app)
        .get('/api/dev/mailbox')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(resCand.status).toBe(200);
      expect(resCand.body.data.items).toBeDefined();
      for (const email of resCand.body.data.items) {
        expect(email.to).toBe(candidateUser.email.toLowerCase());
      }
    });
  });
});
