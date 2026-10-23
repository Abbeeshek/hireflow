export const sendSuccess = (res, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

export const sendPaginated = (
  res,
  items = [],
  pagination = {},
  extra = {},
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data: {
      items,
      pagination: {
        total: pagination.total || items.length,
        page: pagination.page || 1,
        limit: pagination.limit || items.length,
        totalPages: pagination.totalPages || 1
      },
      ...extra
    }
  });
};

export const sendError = (res, error, statusCode = 500) => {
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An unexpected error occurred';
  const details = error.details || null;

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
};
