import { EmailLog } from '../models/index.js';
import { runReminderJobs } from '../services/cronService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ForbiddenError } from '../utils/errors.js';

export async function getDevMailbox(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Dev mailbox is unavailable in production mode');
    }

    const { role, email } = req.user;
    const companyId = req.user.company?._id || req.user.company;
    let query = {};

    if (role === 'admin') {
      // Admin sees all
      query = {};
    } else if (role === 'recruiter') {
      // Recruiter sees emails addressed to their email OR related to their company
      query = {
        $or: [
          { to: email.toLowerCase() },
          { company: companyId }
        ]
      };
    } else {
      // Candidate sees only emails sent to them
      query = { to: email.toLowerCase() };
    }

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailLog.countDocuments(query)
    ]);

    return sendSuccess(res, {
      items: emails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function runDevJobs(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Manual job runs are disabled in production mode');
    }

    const results = await runReminderJobs();
    return sendSuccess(res, { message: 'Jobs executed successfully', summary: results });
  } catch (err) {
    next(err);
  }
}

export default {
  getDevMailbox,
  runDevJobs
};
