import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const windowMs = env.rateLimit.windowMinutes * 60 * 1000;

const baseOptions = {
  windowMs,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

/** Global limiter applied to the whole API. */
export const globalLimiter = rateLimit({ ...baseOptions, max: env.rateLimit.max });

/** Stricter limiter for auth endpoints to slow down credential-stuffing / brute force. */
export const authLimiter = rateLimit({ ...baseOptions, max: env.rateLimit.authMax });
