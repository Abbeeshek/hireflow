import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  // Operational errors
  if (err instanceof AppError) {
    return sendError(res, { code: err.code, message: err.message, details: err.details }, err.statusCode);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return sendError(
      res,
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details
      },
      400
    );
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message
    }));
    return sendError(
      res,
      {
        code: 'VALIDATION_ERROR',
        message: 'Data validation failed',
        details
      },
      400
    );
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(
      res,
      {
        code: 'DUPLICATE_KEY',
        message: `Duplicate value for ${field}`,
        details: err.keyValue
      },
      409
    );
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    return sendError(
      res,
      {
        code: 'INVALID_ID',
        message: `Invalid identifier for ${err.path}`,
        details: { path: err.path, value: err.value }
      },
      400
    );
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(
        res,
        {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum allowed limit (5 MB)'
        },
        400
      );
    }
    return sendError(
      res,
      {
        code: 'UPLOAD_ERROR',
        message: err.message
      },
      400
    );
  }

  // Fallback / unhandled error
  console.error('[UNHANDLED_ERROR]', err);
  return sendError(
    res,
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message
    },
    500
  );
};
