import bcrypt from 'bcryptjs';
import { User, Company, CandidateProfile } from '../models/index.js';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { logAudit } from './audit.service.js';

export const register = async ({ name, email, password, role, companyName, req = null }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let companyId = null;

  // Create user record first
  const user = new User({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    company: null
  });

  if (role === 'recruiter') {
    const company = await Company.create({
      name: companyName.trim(),
      owner: user._id
    });
    companyId = company._id;
    user.company = companyId;
  }

  await user.save();

  if (role === 'candidate') {
    await CandidateProfile.create({
      user: user._id,
      headline: '',
      location: '',
      skills: [],
      education: [],
      projects: []
    });
  }

  await logAudit({
    actor: user._id,
    action: 'REGISTER',
    entityType: 'User',
    entityId: user._id,
    meta: { email: user.email, role: user.role, company: companyId },
    req
  });

  const populatedUser = await User.findById(user._id).select('-passwordHash').populate('company');
  return populatedUser;
};

export const login = async ({ email, password, req = null }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).populate('company');
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated. Please contact an administrator.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  await logAudit({
    actor: user._id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user._id,
    meta: { email: user.email, role: user.role },
    req
  });

  const safeUser = await User.findById(user._id).select('-passwordHash').populate('company');
  return safeUser;
};

export const getMe = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash').populate('company');
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};
