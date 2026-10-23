import jwt from 'jsonwebtoken';
import { User, Company } from '../models/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

const COOKIE_NAME = 'hireflow_token';
const JWT_EXPIRES_IN = '1d';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

export const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'hireflow_dev_secret_key_change_in_production_2026';
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      company: user.company ? String(user.company._id || user.company) : null
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
};

export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const secret = process.env.JWT_SECRET || 'hireflow_dev_secret_key_change_in_production_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      throw new UnauthorizedError('Session expired or invalid, please log in again');
    }

    const user = await User.findById(decoded.id).populate('company');
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is deactivated. Please contact an administrator.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' is not authorized to access this resource`));
    }

    next();
  };
};
