import { ApiError } from '../utils/ApiError.js';

// Validates request parts against zod schemas. Parsed values land on req.valid
// (req.query is read-only in Express 5, so we don't write back to it).
export const validate = (schemas) => (req, _res, next) => {
  req.valid = req.valid || {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ApiError(422, details[0]?.message || 'Please check the details and try again.', {
        code: 'VALIDATION_ERROR',
        details,
      });
    }
    req.valid[part] = result.data;
  }
  next();
};
