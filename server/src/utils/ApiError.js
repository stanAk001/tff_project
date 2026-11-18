export class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, extra) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...extra });
  }
  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }
  static forbidden(message = 'You do not have access to this.') {
    return new ApiError(403, message, { code: 'FORBIDDEN' });
  }
  static notFound(message = 'Not found.') {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }
  static conflict(message, extra) {
    return new ApiError(409, message, { code: 'CONFLICT', ...extra });
  }
}
