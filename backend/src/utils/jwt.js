import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Token strategy:
 *  - Short-lived access token (default 15m) carried in the Authorization header.
 *  - Longer-lived refresh token (default 7d). Its hash is stored on the user document
 *    so it can be revoked on logout and rotated on every refresh.
 */
export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

export function signRefreshToken(user) {
  // `jti` (unique token id) guarantees every refresh token is distinct even when
  // two are issued within the same second — essential for rotation & revocation,
  // since otherwise identical payloads produce byte-identical JWTs.
  return jwt.sign({ sub: user.id, type: 'refresh', jti: randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}
