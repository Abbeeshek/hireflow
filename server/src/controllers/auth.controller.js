import * as authService from '../services/auth.service.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.register({
      ...req.body,
      req
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return sendSuccess(res, { user, token }, 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await authService.login({
      ...req.body,
      req
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return sendSuccess(res, { user, token }, 200);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    return sendSuccess(res, { message: 'Logged out successfully' }, 200);
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    return sendSuccess(res, { user }, 200);
  } catch (err) {
    next(err);
  }
};
