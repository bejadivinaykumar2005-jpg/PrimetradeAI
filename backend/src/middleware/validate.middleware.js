import { ApiError } from '../utils/ApiError.js';

/**
 * Validates and sanitises req.body / req.query / req.params against a Zod schema.
 * On success the parsed (coerced, stripped) values replace the originals so
 * controllers only ever see clean, typed input.
 *
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) {
        req[key] = schemas[key].parse(req[key]);
      }
    }
    next();
  } catch (err) {
    if (err?.name === 'ZodError') {
      const details = err.issues.map((i) => ({
        field: i.path.join('.') || '(root)',
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    return next(err);
  }
};
