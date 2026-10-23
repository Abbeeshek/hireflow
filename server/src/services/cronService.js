import cron from 'node-cron';
import { Interview, User, Application, Job, InterviewFeedback } from '../models/index.js';
import { createNotification } from './notificationService.js';
import {
  sendEmail,
  renderReminderTemplate
} from './mailService.js';

let cronTask = null;

/**
 * Run reminder & lifecycle jobs idempotently
 */
export async function runReminderJobs() {
  const now = new Date();
  const summary = {
    h24Count: 0,
    h1Count: 0,
    nudgeCount: 0,
    expiredCount: 0,
    feedbackPendingCount: 0
  };

  const portalUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

  // 1. 24h Reminder for scheduled interviews
  const h24Threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const interviewsH24 = await Interview.find({
    status: 'scheduled',
    scheduledStart: { $lte: h24Threshold, $gt: now },
    'reminders.h24SentAt': null
  }).populate({
    path: 'application',
    populate: { path: 'candidate', select: 'name email' }
  }).populate('job', 'title company').populate('interviewers', 'name email');

  for (const interview of interviewsH24) {
    interview.reminders.h24SentAt = now;
    await interview.save();
    summary.h24Count++;

    const candidate = interview.application?.candidate;
    const jobTitle = interview.job?.title || 'Interview';

    // Notify candidate
    if (candidate) {
      await createNotification({
        user: candidate._id,
        type: 'interview_reminder_24h',
        title: `Upcoming Interview: ${jobTitle}`,
        body: `Your interview is scheduled in approximately 24 hours at ${new Date(interview.scheduledStart).toUTCString()}.`,
        link: '/candidate/interviews'
      });

      const { subject, html } = renderReminderTemplate({
        recipientName: candidate.name,
        jobTitle,
        companyName: 'HireFlow Partner',
        roundName: interview.round,
        scheduledStart: interview.scheduledStart,
        meetingLink: interview.meetingLink,
        portalUrl: `${portalUrl}/candidate/interviews`,
        hoursAhead: 24
      });
      await sendEmail({
        to: candidate.email,
        subject,
        html,
        kind: 'reminder_24h',
        company: interview.job?.company,
        relatedInterview: interview._id
      });
    }

    // Notify interviewers
    for (const inv of interview.interviewers || []) {
      await createNotification({
        user: inv._id,
        type: 'interview_reminder_24h',
        title: `Upcoming Interview: ${jobTitle}`,
        body: `You are scheduled to interview a candidate in 24 hours at ${new Date(interview.scheduledStart).toUTCString()}.`,
        link: `/recruiter/applications/${interview.application?._id}`
      });
    }
  }

  // 2. 1h Reminder for scheduled interviews
  const h1Threshold = new Date(now.getTime() + 60 * 60 * 1000);
  const interviewsH1 = await Interview.find({
    status: 'scheduled',
    scheduledStart: { $lte: h1Threshold, $gt: now },
    'reminders.h1SentAt': null
  }).populate({
    path: 'application',
    populate: { path: 'candidate', select: 'name email' }
  }).populate('job', 'title company').populate('interviewers', 'name email');

  for (const interview of interviewsH1) {
    interview.reminders.h1SentAt = now;
    await interview.save();
    summary.h1Count++;

    const candidate = interview.application?.candidate;
    const jobTitle = interview.job?.title || 'Interview';

    if (candidate) {
      await createNotification({
        user: candidate._id,
        type: 'interview_reminder_1h',
        title: `Interview Starting in 1 Hour: ${jobTitle}`,
        body: `Your interview starts at ${new Date(interview.scheduledStart).toUTCString()}. Join link: ${interview.meetingLink || 'via portal'}.`,
        link: '/candidate/interviews'
      });

      const { subject, html } = renderReminderTemplate({
        recipientName: candidate.name,
        jobTitle,
        companyName: 'HireFlow Partner',
        roundName: interview.round,
        scheduledStart: interview.scheduledStart,
        meetingLink: interview.meetingLink,
        portalUrl: `${portalUrl}/candidate/interviews`,
        hoursAhead: 1
      });
      await sendEmail({
        to: candidate.email,
        subject,
        html,
        kind: 'reminder_1h',
        company: interview.job?.company,
        relatedInterview: interview._id
      });
    }

    for (const inv of interview.interviewers || []) {
      await createNotification({
        user: inv._id,
        type: 'interview_reminder_1h',
        title: `Interview in 1 Hour: ${jobTitle}`,
        body: `Interview starts at ${new Date(interview.scheduledStart).toUTCString()}. Join link: ${interview.meetingLink}.`,
        link: `/recruiter/applications/${interview.application?._id}`
      });
    }
  }

  // 3. Nudge if no response 48h after slots offered
  const nudgeThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const interviewsToNudge = await Interview.find({
    status: 'slots_offered',
    offerCreatedAt: { $lte: nudgeThreshold },
    'reminders.nudgeSentAt': null
  }).populate({
    path: 'application',
    populate: { path: 'candidate', select: 'name email' }
  }).populate('job', 'title');

  for (const interview of interviewsToNudge) {
    interview.reminders.nudgeSentAt = now;
    await interview.save();
    summary.nudgeCount++;

    const candidate = interview.application?.candidate;
    if (candidate) {
      await createNotification({
        user: candidate._id,
        type: 'slot_choice_nudge',
        title: 'Interview Slots Expiring Soon',
        body: `Please choose an interview slot for ${interview.job?.title || 'your application'} before your offered times expire.`,
        link: '/candidate/interviews'
      });
    }
  }

  // 4. Mark expired at 72h
  const expiredInterviews = await Interview.find({
    status: 'slots_offered',
    offerExpiresAt: { $lte: now }
  }).populate('createdBy', 'name email').populate({
    path: 'application',
    populate: { path: 'candidate', select: 'name' }
  }).populate('job', 'title');

  for (const interview of expiredInterviews) {
    interview.status = 'expired';
    await interview.save();
    summary.expiredCount++;

    if (interview.createdBy) {
      await createNotification({
        user: interview.createdBy._id,
        type: 'interview_offer_expired',
        title: 'Offered Interview Slots Expired',
        body: `Offered slots for ${interview.application?.candidate?.name || 'Candidate'} on ${interview.job?.title || 'Job'} expired without booking.`,
        link: `/recruiter/applications/${interview.application?._id}`
      });
    }
  }

  // 5. Feedback Pending Reminders (2h and 24h after interview end)
  const fp2hThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const fp24hThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const pendingInterviews = await Interview.find({
    status: { $in: ['scheduled', 'completed'] },
    scheduledEnd: { $lte: fp2hThreshold }
  }).populate('job', 'title').populate('interviewers', 'name email');

  for (const interview of pendingInterviews) {
    const existingFeedbacks = await InterviewFeedback.find({ interview: interview._id }).select('interviewer');
    const submittedInterviewerIds = new Set(existingFeedbacks.map((f) => String(f.interviewer)));

    const needsH2 = !interview.reminders.feedbackPending1SentAt;
    const needsH24 = !interview.reminders.feedbackPending2SentAt && interview.scheduledEnd <= fp24hThreshold;

    if (needsH2 || needsH24) {
      for (const inv of interview.interviewers || []) {
        if (!submittedInterviewerIds.has(String(inv._id))) {
          await createNotification({
            user: inv._id,
            type: 'interview_feedback_pending',
            title: `Scorecard Feedback Pending: ${interview.job?.title || 'Interview'}`,
            body: `Please submit your scorecard feedback for the completed ${interview.round} interview.`,
            link: `/recruiter/applications/${interview.application}`
          });
          summary.feedbackPendingCount++;
        }
      }

      if (needsH2) interview.reminders.feedbackPending1SentAt = now;
      if (needsH24) interview.reminders.feedbackPending2SentAt = now;
      await interview.save();
    }
  }

  return summary;
}

export function startCron() {
  const isCronEnabled = process.env.ENABLE_CRON === 'true';
  if (!isCronEnabled) {
    console.log('[CronService] Background cron disabled (ENABLE_CRON !== true)');
    return;
  }

  if (cronTask) {
    return;
  }

  // Run every minute
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await runReminderJobs();
    } catch (err) {
      console.error('[CronService] Error executing reminder cron job:', err.message);
    }
  });

  console.log('[CronService] Background reminder cron scheduled (runs every minute)');
}

export function stopCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

export default {
  runReminderJobs,
  startCron,
  stopCron
};
