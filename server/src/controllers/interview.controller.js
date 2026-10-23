import {
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
} from '../services/interview.service.js';
import { Interview, Application, Job, User } from '../models/index.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import {
  offerSlotsSchema,
  selectSlotSchema,
  declineSlotsSchema,
  requestRescheduleSchema,
  manualTimeSchema
} from '../validators/interview.validator.js';

/**
 * Recruiter: Offer slots
 */
export async function offerSlots(req, res, next) {
  try {
    const { id: applicationId } = req.params;
    const validated = offerSlotsSchema.parse(req.body);

    const interview = await offerSlotsForApplication({
      applicationId,
      recruiterUser: req.user,
      round: validated.round,
      mode: validated.mode,
      durationMinutes: validated.durationMinutes,
      interviewerIds: validated.interviewers,
      rangeStart: validated.rangeStart,
      rangeEnd: validated.rangeEnd,
      selectedSlots: validated.selectedSlots,
      req
    });

    return sendSuccess(res, { interview }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: Regenerate slots
 */
export async function regenerateInterviewSlots(req, res, next) {
  try {
    const { id } = req.params;
    const interview = await regenerateSlots({
      interviewId: id,
      recruiterUser: req.user,
      req
    });
    return sendSuccess(res, { interview });
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: Set manual interview time
 */
export async function manualSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const validated = manualTimeSchema.parse(req.body);

    const interview = await setManualTime({
      interviewId: id,
      recruiterUser: req.user,
      scheduledStart: validated.scheduledStart,
      scheduledEnd: validated.scheduledEnd,
      mode: validated.mode,
      meetingLink: validated.meetingLink,
      location: validated.location,
      req
    });

    return sendSuccess(res, { interview });
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: Cancel interview
 */
export async function cancel(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const interview = await cancelInterview({
      interviewId: id,
      recruiterUser: req.user,
      reason,
      req
    });
    return sendSuccess(res, { interview });
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: Mark completed
 */
export async function complete(req, res, next) {
  try {
    const { id } = req.params;
    const interview = await markCompleted({
      interviewId: id,
      recruiterUser: req.user,
      req
    });
    return sendSuccess(res, { interview });
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: Mark no-show
 */
export async function noShow(req, res, next) {
  try {
    const { id } = req.params;
    const interview = await markNoShow({
      interviewId: id,
      recruiterUser: req.user,
      req
    });
    return sendSuccess(res, { interview });
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: List interviews
 */
export async function getRecruiterInterviews(req, res, next) {
  try {
    const companyId = req.user.company?._id || req.user.company;
    const { status, from, to, mine, jobId, round } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    // Filter by company jobs
    const jobs = await Job.find({ company: companyId }).select('_id');
    const jobIds = jobs.map((j) => j._id);

    const query = { job: { $in: jobIds } };

    if (jobId) {
      query.job = jobId;
    }

    if (status) {
      query.status = status;
    }

    if (round) {
      query.round = round;
    }

    if (mine === 'true') {
      query.interviewers = req.user._id;
    }

    if (from || to) {
      query.scheduledStart = {};
      if (from) query.scheduledStart.$gte = new Date(from);
      if (to) query.scheduledStart.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      Interview.find(query)
        .populate({
          path: 'application',
          populate: { path: 'candidate', select: 'name email' }
        })
        .populate('job', 'title department location blindScreening')
        .populate('interviewers', 'name email timezone')
        .sort({ scheduledStart: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Interview.countDocuments(query)
    ]);

    // Respect blind mode for candidate names if applicable
    const processedItems = items.map((item) => {
      const isBlind = item.job?.blindScreening;
      const stage = item.application?.stage;
      const isAnonymized = isBlind && ['applied', 'screening'].includes(stage);

      if (isAnonymized && item.application?.candidate) {
        const idSuffix = String(item.application.candidate._id).slice(-4).toUpperCase();
        item.application.candidate.name = `Candidate #${idSuffix}`;
        item.application.candidate.email = `candidate-${idSuffix.toLowerCase()}@anonymous.blind`;
      }
      return item;
    });

    return sendPaginated(res, processedItems, { total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
}

/**
 * Recruiter: Get single interview by ID
 */
export async function getRecruiterInterviewById(req, res, next) {
  try {
    const { id } = req.params;
    const interview = await Interview.findById(id)
      .populate({
        path: 'application',
        populate: { path: 'candidate', select: 'name email' }
      })
      .populate('job')
      .populate('interviewers', 'name email timezone availability');

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    // Company check
    const jobCompanyId = String(interview.job.company);
    const recruiterCompanyId = String(req.user.company?._id || req.user.company);
    if (jobCompanyId !== recruiterCompanyId && req.user.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this interview');
    }

    return sendSuccess(res, { interview });
  } catch (err) {
    next(err);
  }
}

/**
 * Candidate: List their own interviews
 */
export async function getCandidateInterviews(req, res, next) {
  try {
    // Find candidate applications
    const applications = await Application.find({ candidate: req.user._id }).select('_id');
    const applicationIds = applications.map((a) => a._id);

    const interviews = await Interview.find({ application: { $in: applicationIds } })
      .populate('job', 'title company')
      .populate('interviewers', 'name')
      .populate('application', 'stage')
      .sort({ createdAt: -1 })
      .lean();

    // STRICT CANDIDATE SERIALIZATION
    const serialized = interviews.map(serializeCandidateInterview);

    return sendSuccess(res, { interviews: serialized });
  } catch (err) {
    next(err);
  }
}

/**
 * Candidate: Select slot
 */
export async function candidateSelectSlot(req, res, next) {
  try {
    const { id } = req.params;
    const validated = selectSlotSchema.parse(req.body);

    const interview = await selectSlot({
      interviewId: id,
      candidateUser: req.user,
      slotStart: validated.slotStart,
      req
    });

    return sendSuccess(res, { interview: serializeCandidateInterview(interview) });
  } catch (err) {
    next(err);
  }
}

/**
 * Candidate: Decline slots ("None of these work")
 */
export async function candidateDeclineSlots(req, res, next) {
  try {
    const { id } = req.params;
    const validated = declineSlotsSchema.parse(req.body);

    const interview = await declineSlots({
      interviewId: id,
      candidateUser: req.user,
      windows: validated.windows,
      note: validated.note,
      req
    });

    return sendSuccess(res, { interview: serializeCandidateInterview(interview) });
  } catch (err) {
    next(err);
  }
}

/**
 * Candidate: Request reschedule
 */
export async function candidateRequestReschedule(req, res, next) {
  try {
    const { id } = req.params;
    const validated = requestRescheduleSchema.parse(req.body);

    const interview = await requestReschedule({
      interviewId: id,
      candidateUser: req.user,
      reason: validated.reason,
      windows: validated.windows,
      req
    });

    return sendSuccess(res, { interview: serializeCandidateInterview(interview) });
  } catch (err) {
    next(err);
  }
}

/**
 * Shared: Download .ics calendar invite
 */
export async function downloadIcs(req, res, next) {
  try {
    const { id } = req.params;
    const icsContent = await getInterviewIcs(id, req.user);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="interview.ics"');
    return res.send(icsContent);
  } catch (err) {
    next(err);
  }
}

export default {
  offerSlots,
  regenerateInterviewSlots,
  manualSchedule,
  cancel,
  complete,
  noShow,
  getRecruiterInterviews,
  getRecruiterInterviewById,
  getCandidateInterviews,
  candidateSelectSlot,
  candidateDeclineSlots,
  candidateRequestReschedule,
  downloadIcs
};
