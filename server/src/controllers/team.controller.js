import bcrypt from 'bcryptjs';
import { User, Company } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { BadRequestError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { teamCreateSchema, availabilitySchema } from '../validators/interview.validator.js';
import { logAudit } from '../services/audit.service.js';

export async function getTeamMembers(req, res, next) {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      return sendSuccess(res, { team: [] });
    }

    const team = await User.find({
      company: companyId,
      role: 'recruiter'
    }).select('name email timezone availability createdAt isActive').lean();

    const company = await Company.findById(companyId).select('owner');
    const isOwner = String(company?.owner) === String(req.user._id);

    return sendSuccess(res, {
      team: team.map((member) => ({
        ...member,
        isOwner: String(member._id) === String(company?.owner)
      })),
      currentUserIsOwner: isOwner
    });
  } catch (err) {
    next(err);
  }
}

export async function createTeammate(req, res, next) {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('User does not belong to any company');
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new BadRequestError('Company not found');
    }

    // Only company owner or admin can create teammate accounts
    if (String(company.owner) !== String(req.user._id) && req.user.role !== 'admin') {
      throw new ForbiddenError('Only the company owner can add team members');
    }

    const validated = teamCreateSchema.parse(req.body);

    const existing = await User.findOne({ email: validated.email.toLowerCase().trim() });
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const teammate = await User.create({
      name: validated.name.trim(),
      email: validated.email.toLowerCase().trim(),
      passwordHash,
      role: 'recruiter',
      company: company._id,
      timezone: req.user.timezone || 'Asia/Kolkata',
      availability: {
        weekly: [
          { day: 'monday', start: '09:00', end: '18:00' },
          { day: 'tuesday', start: '09:00', end: '18:00' },
          { day: 'wednesday', start: '09:00', end: '18:00' },
          { day: 'thursday', start: '09:00', end: '18:00' },
          { day: 'friday', start: '09:00', end: '18:00' }
        ],
        bufferMinutes: 15
      }
    });

    await logAudit({
      actor: req.user._id,
      action: 'TEAM_MEMBER_CREATED',
      entityType: 'User',
      entityId: teammate._id,
      meta: { email: teammate.email, name: teammate.name },
      req
    });

    return sendSuccess(res, {
      teammate: {
        _id: teammate._id,
        name: teammate.name,
        email: teammate.email,
        role: teammate.role,
        timezone: teammate.timezone,
        availability: teammate.availability
      }
    }, 201);
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('timezone availability');
    return sendSuccess(res, {
      timezone: user.timezone || 'Asia/Kolkata',
      availability: user.availability || {
        weekly: [
          { day: 'monday', start: '09:00', end: '18:00' },
          { day: 'tuesday', start: '09:00', end: '18:00' },
          { day: 'wednesday', start: '09:00', end: '18:00' },
          { day: 'thursday', start: '09:00', end: '18:00' },
          { day: 'friday', start: '09:00', end: '18:00' }
        ],
        bufferMinutes: 15
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAvailability(req, res, next) {
  try {
    const validated = availabilitySchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    user.timezone = validated.timezone;
    user.availability = {
      weekly: validated.weekly,
      bufferMinutes: validated.bufferMinutes
    };

    await user.save();

    await logAudit({
      actor: req.user._id,
      action: 'AVAILABILITY_UPDATED',
      entityType: 'User',
      entityId: user._id,
      meta: { timezone: validated.timezone, bufferMinutes: validated.bufferMinutes },
      req
    });

    return sendSuccess(res, {
      timezone: user.timezone,
      availability: user.availability
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getTeamMembers,
  createTeammate,
  getAvailability,
  updateAvailability
};
