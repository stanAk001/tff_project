import { Prisma } from '@prisma/client';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  let code = err.code || 'SERVER_ERROR';
  let details = err.details;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      const field = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'value';
      message = `That ${field} is already in use.`;
    } else if (err.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'That item no longer exists.';
    } else if (err.code === 'P2003') {
      status = 400;
      code = 'BAD_REQUEST';
      message = 'A linked item could not be found.';
    } else {
      status = 500;
      code = 'SERVER_ERROR';
    }
    details = undefined;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : 'Upload failed.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'The request could not be read.';
  }

  if (status >= 500) {
    console.error(err);
    // Never leak internals to the client
    message = env.isProduction ? 'Something went wrong on our side.' : message;
  }

  res.status(status).json({ success: false, error: { message, code, ...(details ? { details } : {}) } });
};
