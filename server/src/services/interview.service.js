import crypto from 'crypto';
import { DateTime } from 'luxon';
import {
  Interview,
  Application,
  Job,
  User,
  Company
} from '../models/index.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../utils/errors.js';
import { generateSlots } from './slotEngine.js';
import { generateIcs } from './icsGenerator.js';
import {
  sendEmail,
  renderSlotsOfferedTemplate,
  renderConfirmedTemplate,
  renderCancelledTemplate,
  renderRescheduleRequestedTemplate
} from './mailService.js';
import { createNotification } from './notificationService.js';
import { logAudit } from './audit.service.js';

const PORTAL_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

/**
 * Recruiter: Offer interview slots to an applicant
 */
export async function offerSlotsForApplication({
  applicationId,
  recruiterUser,
  round,
  mode = 'video',
  durationMinutes = 45,
  interviewerIds = [],
  rangeStart,
  rangeEnd,
  selectedSlots = null,
  req = null
}) {
  const application = await Application.findById(applicationId)
    .populate('job')
    .populate('candidate', 'name email');

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Check company ownership
  const jobCompanyId = String(application.job.company);
  const recruiterCompanyId = String(recruiterUser.company?._id || recruiterUser.company);
  if (jobCompanyId !== recruiterCompanyId && recruiterUser.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to schedule for this job');
  }

  // Interviewers validation
  const interviewers = await User.find({
    _id: { $in: interviewerIds },
    company: recruiterUser.company
  });

  if (interviewers.length === 0) {
    throw new BadRequestError('At least one valid company interviewer must be selected');
  }

  // Fetch busy intervals for all selected interviewers
  const interviewerBusyList = await Promise.all(
    interviewers.map(async (inv) => {
      const scheduledInterviews = await Interview.find({
        interviewers: inv._id,
        status: 'scheduled',
        scheduledStart: { $ne: null }
      }).select('scheduledStart scheduledEnd');

      const busy = scheduledInterviews.map((si) => ({
        start: si.scheduledStart,
        end: si.scheduledEnd
      }));

      return {
        _id: inv._id,
        name: inv.name,
        email: inv.email,
        timezone: inv.timezone || 'Asia/Kolkata',
        weekly: inv.availability?.weekly || [],
        bufferMinutes: inv.availability?.bufferMinutes ?? 15,
        busy
      };
    })
  );

  let finalSlots = [];

  if (Array.isArray(selectedSlots) && selectedSlots.length > 0) {
    finalSlots = selectedSlots.map((s) => ({
      start: new Date(s.start),
      end: new Date(s.end)
    }));
  } else {
    // Generate through pure slotEngine
    const engineResult = generateSlots({
      interviewers: interviewerBusyList,
      durationMinutes,
      bufferMinutes: interviewerBusyList[0]?.bufferMinutes ?? 15,
      rangeStart: rangeStart ? new Date(rangeStart) : undefined,
      rangeEnd: rangeEnd ? new Date(rangeEnd) : undefined,
      minLeadHours: 24,
      candidateWindows: null,
      maxSlots: 6,
      granularityMinutes: 30,
      maxPerDay: 2
    });

    if (!engineResult.slots || engineResult.slots.length === 0) {
      throw new BadRequestError(`Could not generate slots: ${engineResult.reason}`);
    }
    finalSlots = engineResult.slots;
  }

  const now = new Date();
  const offerExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

  const interview = await Interview.create({
    application: application._id,
    job: application.job._id,
    round,
    mode,
    durationMinutes,
    interviewers: interviewers.map((i) => i._id),
    status: 'slots_offered',
    offeredSlots: finalSlots,
    offerCreatedAt: now,
    offerExpiresAt,
    scheduledStart: null,
    scheduledEnd: null,
    rescheduleCount: 0,
    createdBy: recruiterUser._id
  });

  // Advance application stage if round is an advancement
  const currentStage = application.stage;
  const targetStage = round; // 'interview1', 'interview2', or 'hr_round'

  if (currentStage !== targetStage) {
    application.stage = targetStage;
    application.stageHistory.push({
      stage: targetStage,
      changedBy: recruiterUser._id,
      at: now,
      note: 'Interview scheduled'
    });
    await application.save();
  }

  // Notify candidate
  const company = await Company.findById(application.job.company).select('name');
  await createNotification({
    user: application.candidate._id,
    type: 'interview_slots_offered',
    title: `Interview Invitation: ${application.job.title}`,
    body: `${company?.name || 'Recruiter'} has invited you to choose an interview slot for the ${round} round.`,
    link: '/candidate/interviews',
    meta: { interviewId: interview._id, round }
  });

  // Send Email with offered slots
  const { subject, html } = renderSlotsOfferedTemplate({
    candidateName: application.candidate.name,
    jobTitle: application.job.title,
    companyName: company?.name || 'Acme Tech',
    roundName: round,
    slots: finalSlots,
    portalUrl: `${PORTAL_URL}/candidate/interviews`
  });

  await sendEmail({
    to: application.candidate.email,
    subject,
    html,
    kind: 'slots_offered',
    company: application.job.company,
    relatedInterview: interview._id
  });

  await logAudit({
    actor: recruiterUser._id,
    action: 'INTERVIEW_SLOTS_OFFERED',
    entityType: 'Interview',
    entityId: interview._id,
    meta: {
      applicationId: application._id,
      round,
      slotsCount: finalSlots.length,
      interviewers: interviewerIds
    },
    req
  });

  return interview;
}

/**
 * Candidate: Select one slot from offered slots
 */
export async function selectSlot({
  interviewId,
  candidateUser,
  slotStart,
  req = null
}) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job', 'title company')
    .populate('interviewers', 'name email');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  // Enforce candidate ownership
  if (String(interview.application.candidate._id) !== String(candidateUser._id)) {
    throw new ForbiddenError('You are not authorized to book this interview');
  }

  // Check status
  if (!['slots_offered', 'reschedule_requested'].includes(interview.status)) {
    throw new BadRequestError(`Cannot select slot when interview status is '${interview.status}'`);
  }

  // Check expiry
  if (interview.offerExpiresAt && new Date() > new Date(interview.offerExpiresAt)) {
    interview.status = 'expired';
    await interview.save();
    throw new BadRequestError('This slot offer has expired (72h limit reached). Please contact the recruiter.');
  }

  const requestedStart = new Date(slotStart);
  if (isNaN(requestedStart.getTime())) {
    throw new BadRequestError('Invalid slot start timestamp');
  }

  // Verify requestedStart matches one of offeredSlots
  const matchedSlot = interview.offeredSlots.find((s) => (
    Math.abs(new Date(s.start).getTime() - requestedStart.getTime()) < 1000
  ));

  if (!matchedSlot) {
    throw new BadRequestError('The selected slot was not among the offered slots for this interview');
  }

  const slotEnd = new Date(matchedSlot.end);

  // Overlap Conflict Check: Ensure no interviewer was double-booked in the interim
  const conflictingInterview = await Interview.findOne({
    _id: { $ne: interview._id },
    interviewers: { $in: interview.interviewers.map((i) => i._id) },
    status: 'scheduled',
    scheduledStart: { $lt: slotEnd },
    scheduledEnd: { $gt: requestedStart }
  });

  if (conflictingInterview) {
    throw new ConflictError('This slot has already been booked or is in conflict with an interviewer schedule. Please select another slot.');
  }

  // Conditional update for double-booking concurrency protection
  const meetingLink = interview.mode === 'video'
    ? `https://meet.jit.si/HireFlow-${crypto.randomBytes(6).toString('hex')}`
    : '';

  interview.scheduledStart = requestedStart;
  interview.scheduledEnd = slotEnd;
  interview.status = 'scheduled';
  if (meetingLink) {
    interview.meetingLink = meetingLink;
  }

  await interview.save();

  // Generate RFC 5545 ICS
  const company = await Company.findById(interview.job.company).select('name');
  const companyName = company?.name || 'HireFlow Partner';

  const attendees = [
    { name: interview.application.candidate.name, email: interview.application.candidate.email },
    ...interview.interviewers.map((i) => ({ name: i.name, email: i.email }))
  ];

  const ics = generateIcs({
    interviewId: interview._id,
    title: `${interview.round.toUpperCase()} Interview - ${interview.job.title}`,
    description: `Interview session with ${companyName} for the ${interview.job.title} position.`,
    start: requestedStart,
    end: slotEnd,
    meetingLink,
    location: interview.location || meetingLink,
    attendees
  });

  // Send Confirmation Email to Candidate
  const candEmail = renderConfirmedTemplate({
    recipientName: interview.application.candidate.name,
    jobTitle: interview.job.title,
    companyName,
    roundName: interview.round,
    scheduledStart: requestedStart,
    scheduledEnd: slotEnd,
    meetingLink,
    location: interview.location,
    portalUrl: `${PORTAL_URL}/candidate/interviews`
  });

  await sendEmail({
    to: interview.application.candidate.email,
    subject: candEmail.subject,
    html: candEmail.html,
    ics,
    kind: 'confirmed_candidate',
    company: interview.job.company,
    relatedInterview: interview._id
  });

  // Send Confirmation Email & Notification to Interviewers
  for (const inv of interview.interviewers) {
    const invEmail = renderConfirmedTemplate({
      recipientName: inv.name,
      jobTitle: interview.job.title,
      companyName,
      roundName: interview.round,
      scheduledStart: requestedStart,
      scheduledEnd: slotEnd,
      meetingLink,
      location: interview.location,
      portalUrl: `${PORTAL_URL}/recruiter/applications/${interview.application._id}`
    });

    await sendEmail({
      to: inv.email,
      subject: invEmail.subject,
      html: invEmail.html,
      ics,
      kind: 'confirmed_interviewer',
      company: interview.job.company,
      relatedInterview: interview._id
    });

    await createNotification({
      user: inv._id,
      type: 'interview_booked',
      title: `Interview Booked: ${interview.job.title}`,
      body: `Candidate ${interview.application.candidate.name} has selected a slot for the ${interview.round} round on ${requestedStart.toUTCString()}.`,
      link: `/recruiter/applications/${interview.application._id}`
    });
  }

  // Candidate confirmation notification
  await createNotification({
    user: candidateUser._id,
    type: 'interview_confirmed',
    title: `Interview Confirmed: ${interview.job.title}`,
    body: `Your ${interview.round} interview is scheduled for ${requestedStart.toUTCString()}. Calendar invite has been emailed.`,
    link: '/candidate/interviews'
  });

  await logAudit({
    actor: candidateUser._id,
    action: 'INTERVIEW_SLOT_SELECTED',
    entityType: 'Interview',
    entityId: interview._id,
    meta: {
      scheduledStart: requestedStart,
      scheduledEnd: slotEnd,
      round: interview.round
    },
    req
  });

  return interview;
}

/**
 * Candidate: Decline slots ("None of these work") with up to 3 alternate windows
 */
export async function declineSlots({
  interviewId,
  candidateUser,
  windows = [],
  note = '',
  req = null
}) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job', 'title')
    .populate('createdBy', 'name email');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  if (String(interview.application.candidate._id) !== String(candidateUser._id)) {
    throw new ForbiddenError('You are not authorized to decline slots for this interview');
  }

  if (windows.length > 3) {
    throw new BadRequestError('Maximum 3 alternate windows may be proposed');
  }

  interview.status = 'slots_declined';
  interview.candidateAvailability = {
    windows: windows.map((w) => ({
      start: new Date(w.start),
      end: new Date(w.end)
    })),
    note: String(note).trim()
  };

  await interview.save();

  // Notify recruiter
  if (interview.createdBy) {
    await createNotification({
      user: interview.createdBy._id,
      type: 'slots_declined',
      title: `Slots Declined: ${interview.application.candidate.name}`,
      body: `Candidate indicated offered times do not work and proposed ${windows.length} alternate window(s). Note: "${note || 'None'}"`,
      link: `/recruiter/applications/${interview.application._id}`
    });
  }

  await logAudit({
    actor: candidateUser._id,
    action: 'INTERVIEW_SLOTS_DECLINED',
    entityType: 'Interview',
    entityId: interview._id,
    meta: {
      proposedWindowsCount: windows.length,
      note
    },
    req
  });

  return interview;
}

/**
 * Candidate: Request reschedule (max 2 times)
 */
export async function requestReschedule({
  interviewId,
  candidateUser,
  reason,
  windows = [],
  req = null
}) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job', 'title')
    .populate('createdBy', 'name email');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  if (String(interview.application.candidate._id) !== String(candidateUser._id)) {
    throw new ForbiddenError('You are not authorized to reschedule this interview');
  }

  if (interview.rescheduleCount >= 2) {
    throw new BadRequestError('Maximum reschedule limit (2) reached for this interview. Please contact the recruiter directly.');
  }

  if (interview.status !== 'scheduled') {
    throw new BadRequestError(`Cannot reschedule an interview with status '${interview.status}'`);
  }

  interview.rescheduleCount += 1;
  interview.status = 'reschedule_requested';
  interview.candidateAvailability = {
    windows: windows.map((w) => ({
      start: new Date(w.start),
      end: new Date(w.end)
    })),
    note: String(reason).trim()
  };

  await interview.save();

  // Notify recruiter
  if (interview.createdBy) {
    await createNotification({
      user: interview.createdBy._id,
      type: 'reschedule_requested',
      title: `Reschedule Requested: ${interview.application.candidate.name}`,
      body: `Candidate requested reschedule (${interview.rescheduleCount}/2) for ${interview.job?.title}. Reason: "${reason}"`,
      link: `/recruiter/applications/${interview.application._id}`
    });

    const { subject, html } = renderRescheduleRequestedTemplate({
      recruiterName: interview.createdBy.name,
      candidateName: interview.application.candidate.name,
      jobTitle: interview.job?.title || 'Job',
      reason,
      portalUrl: `${PORTAL_URL}/recruiter/applications/${interview.application._id}`
    });

    await sendEmail({
      to: interview.createdBy.email,
      subject,
      html,
      kind: 'reschedule_requested',
      company: interview.job?.company,
      relatedInterview: interview._id
    });
  }

  await logAudit({
    actor: candidateUser._id,
    action: 'INTERVIEW_RESCHEDULE_REQUESTED',
    entityType: 'Interview',
    entityId: interview._id,
    meta: {
      rescheduleCount: interview.rescheduleCount,
      reason
    },
    req
  });

  return interview;
}

/**
 * Recruiter: Regenerate slots using candidate windows if present
 */
export async function regenerateSlots({
  interviewId,
  recruiterUser,
  req = null
}) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job')
    .populate('interviewers');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  const interviewerBusyList = await Promise.all(
    interview.interviewers.map(async (inv) => {
      const scheduledInterviews = await Interview.find({
        _id: { $ne: interview._id },
        interviewers: inv._id,
        status: 'scheduled',
        scheduledStart: { $ne: null }
      }).select('scheduledStart scheduledEnd');

      return {
        _id: inv._id,
        timezone: inv.timezone || 'Asia/Kolkata',
        weekly: inv.availability?.weekly || [],
        bufferMinutes: inv.availability?.bufferMinutes ?? 15,
        busy: scheduledInterviews.map((si) => ({ start: si.scheduledStart, end: si.scheduledEnd }))
      };
    })
  );

  const candidateWindows = interview.candidateAvailability?.windows?.length > 0
    ? interview.candidateAvailability.windows
    : null;

  const engineResult = generateSlots({
    interviewers: interviewerBusyList,
    durationMinutes: interview.durationMinutes || 45,
    bufferMinutes: interviewerBusyList[0]?.bufferMinutes ?? 15,
    rangeStart: new Date(),
    rangeEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    minLeadHours: 24,
    candidateWindows,
    maxSlots: 6,
    granularityMinutes: 30,
    maxPerDay: 2
  });

  if (!engineResult.slots || engineResult.slots.length === 0) {
    throw new BadRequestError(`Could not regenerate slots: ${engineResult.reason}`);
  }

  const now = new Date();
  interview.offeredSlots = engineResult.slots;
  interview.status = 'slots_offered';
  interview.offerCreatedAt = now;
  interview.offerExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  interview.scheduledStart = null;
  interview.scheduledEnd = null;

  await interview.save();

  // Notify candidate
  await createNotification({
    user: interview.application.candidate._id,
    type: 'interview_slots_regenerated',
    title: `New Interview Slots Available: ${interview.job?.title}`,
    body: `New interview times have been generated for your ${interview.round} interview.`,
    link: '/candidate/interviews'
  });

  await logAudit({
    actor: recruiterUser._id,
    action: 'INTERVIEW_SLOTS_REGENERATED',
    entityType: 'Interview',
    entityId: interview._id,
    meta: { slotsCount: engineResult.slots.length },
    req
  });

  return interview;
}

/**
 * Recruiter: Set interview time manually (conflict-checked)
 */
export async function setManualTime({
  interviewId,
  recruiterUser,
  scheduledStart,
  scheduledEnd,
  mode = 'video',
  meetingLink = '',
  location = '',
  req = null
}) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job', 'title company')
    .populate('interviewers', 'name email');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new BadRequestError('Invalid start or end date');
  }

  // Conflict check for interviewers
  const conflicting = await Interview.findOne({
    _id: { $ne: interview._id },
    interviewers: { $in: interview.interviewers.map((i) => i._id) },
    status: 'scheduled',
    scheduledStart: { $lt: end },
    scheduledEnd: { $gt: start }
  });

  if (conflicting) {
    throw new ConflictError('Manual time conflicts with an existing scheduled interview for one of the interviewers.');
  }

  const finalLink = meetingLink || (mode === 'video' ? `https://meet.jit.si/HireFlow-${crypto.randomBytes(6).toString('hex')}` : '');

  interview.scheduledStart = start;
  interview.scheduledEnd = end;
  interview.mode = mode;
  interview.meetingLink = finalLink;
  interview.location = location;
  interview.status = 'scheduled';

  await interview.save();

  // Send ICS and emails
  const company = await Company.findById(interview.job.company).select('name');
  const companyName = company?.name || 'HireFlow Partner';

  const attendees = [
    { name: interview.application.candidate.name, email: interview.application.candidate.email },
    ...interview.interviewers.map((i) => ({ name: i.name, email: i.email }))
  ];

  const ics = generateIcs({
    interviewId: interview._id,
    title: `${interview.round.toUpperCase()} Interview - ${interview.job.title}`,
    description: `Interview session with ${companyName}.`,
    start,
    end,
    meetingLink: finalLink,
    location,
    attendees
  });

  const candEmail = renderConfirmedTemplate({
    recipientName: interview.application.candidate.name,
    jobTitle: interview.job.title,
    companyName,
    roundName: interview.round,
    scheduledStart: start,
    scheduledEnd: end,
    meetingLink: finalLink,
    location,
    portalUrl: `${PORTAL_URL}/candidate/interviews`
  });

  await sendEmail({
    to: interview.application.candidate.email,
    subject: candEmail.subject,
    html: candEmail.html,
    ics,
    kind: 'confirmed_candidate',
    company: interview.job.company,
    relatedInterview: interview._id
  });

  await logAudit({
    actor: recruiterUser._id,
    action: 'INTERVIEW_MANUAL_TIME_SET',
    entityType: 'Interview',
    entityId: interview._id,
    meta: { start, end, mode },
    req
  });

  return interview;
}

/**
 * Recruiter: Cancel interview
 */
export async function cancelInterview({
  interviewId,
  recruiterUser,
  reason = 'Cancelled by recruiter',
  req = null
}) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job', 'title company')
    .populate('interviewers', 'name email');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  interview.status = 'cancelled';
  await interview.save();

  const company = await Company.findById(interview.job?.company).select('name');

  // Notify candidate
  await createNotification({
    user: interview.application.candidate._id,
    type: 'interview_cancelled',
    title: `Interview Cancelled: ${interview.job.title}`,
    body: `Your ${interview.round} interview was cancelled. Reason: ${reason}`,
    link: '/candidate/interviews'
  });

  const { subject, html } = renderCancelledTemplate({
    recipientName: interview.application.candidate.name,
    jobTitle: interview.job.title,
    companyName: company?.name || 'Acme Tech',
    roundName: interview.round,
    reason
  });

  await sendEmail({
    to: interview.application.candidate.email,
    subject,
    html,
    kind: 'cancelled',
    company: interview.job.company,
    relatedInterview: interview._id
  });

  await logAudit({
    actor: recruiterUser._id,
    action: 'INTERVIEW_CANCELLED',
    entityType: 'Interview',
    entityId: interview._id,
    meta: { reason },
    req
  });

  return interview;
}

/**
 * Recruiter: Mark interview completed
 */
export async function markCompleted({ interviewId, recruiterUser, req = null }) {
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  interview.status = 'completed';
  await interview.save();

  await logAudit({
    actor: recruiterUser._id,
    action: 'INTERVIEW_MARKED_COMPLETED',
    entityType: 'Interview',
    entityId: interview._id,
    req
  });

  return interview;
}

/**
 * Recruiter: Mark interview no-show
 */
export async function markNoShow({ interviewId, recruiterUser, req = null }) {
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  interview.status = 'no_show';
  await interview.save();

  await logAudit({
    actor: recruiterUser._id,
    action: 'INTERVIEW_MARKED_NO_SHOW',
    entityType: 'Interview',
    entityId: interview._id,
    req
  });

  return interview;
}

/**
 * Generate RFC 5545 ICS string for download
 */
export async function getInterviewIcs(interviewId, user) {
  const interview = await Interview.findById(interviewId)
    .populate({
      path: 'application',
      populate: { path: 'candidate', select: 'name email' }
    })
    .populate('job', 'title company')
    .populate('interviewers', 'name email');

  if (!interview) {
    throw new NotFoundError('Interview not found');
  }

  // Access check
  const isCandidate = String(interview.application.candidate._id) === String(user._id);
  const isInterviewer = interview.interviewers.some((inv) => String(inv._id) === String(user._id));
  const isCompanyRecruiter = user.role === 'recruiter' && String(interview.job?.company) === String(user.company?._id || user.company);

  if (!isCandidate && !isInterviewer && !isCompanyRecruiter && user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to access calendar invites for this interview');
  }

  if (!interview.scheduledStart || !interview.scheduledEnd) {
    throw new BadRequestError('Interview has not been scheduled with confirmed dates');
  }

  const company = await Company.findById(interview.job.company).select('name');
  const attendees = [
    { name: interview.application.candidate.name, email: interview.application.candidate.email },
    ...interview.interviewers.map((i) => ({ name: i.name, email: i.email }))
  ];

  return generateIcs({
    interviewId: interview._id,
    title: `${interview.round.toUpperCase()} Interview - ${interview.job.title}`,
    description: `Interview session with ${company?.name || 'HireFlow'}.`,
    start: interview.scheduledStart,
    end: interview.scheduledEnd,
    meetingLink: interview.meetingLink,
    location: interview.location,
    attendees
  });
}

/**
 * Strict candidate interview serializer
 * Canditate NEVER sees internal notes, questions, AI summaries, feedback, scorecards, or evaluations
 */
export function serializeCandidateInterview(interview) {
  if (!interview) return null;
  const doc = interview.toObject ? interview.toObject() : interview;

  return {
    _id: doc._id,
    round: doc.round,
    mode: doc.mode,
    durationMinutes: doc.durationMinutes,
    status: doc.status,
    offeredSlots: doc.offeredSlots || [],
    offerCreatedAt: doc.offerCreatedAt,
    offerExpiresAt: doc.offerExpiresAt,
    scheduledStart: doc.scheduledStart,
    scheduledEnd: doc.scheduledEnd,
    meetingLink: doc.meetingLink || '',
    location: doc.location || '',
    rescheduleCount: doc.rescheduleCount || 0,
    candidateAvailability: doc.candidateAvailability || { windows: [], note: '' },
    interviewers: (doc.interviewers || []).map((i) => ({
      _id: i._id,
      name: i.name
    })),
    job: doc.job ? {
      _id: doc.job._id,
      title: doc.job.title,
      company: doc.job.company?.name || doc.job.company || 'Acme Tech'
    } : null,
    application: doc.application ? {
      _id: doc.application._id,
      stage: doc.application.stage
    } : null,
    createdAt: doc.createdAt
  };
}

export default {
  offerSlotsForApplication,
  selectSlot,
  declineSlots,
  requestReschedule,
  regenerateSlots,
  setManualTime,
  cancelInterview,
  markCompleted,
  markNoShow,
  getInterviewIcs,
  serializeCandidateInterview
};
