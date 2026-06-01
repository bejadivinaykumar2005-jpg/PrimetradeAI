import { User } from '../users/user.model.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';

/** Issue a fresh access + refresh token pair and persist the refresh token hash. */
async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await user.addRefreshToken(refreshToken);
  return { accessToken, refreshToken };
}

export async function register({ name, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('An account with that email already exists');

  // The very first registered account is promoted to admin so the system is
  // usable out of the box; everyone after that is a regular user.
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;

  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? 'admin' : 'user',
  });

  const tokens = await issueTokens(user);
  return { user: user.toJSON(), ...tokens };
}

export async function login({ email, password }) {
  // Password is select:false, so request it explicitly for the comparison.
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const tokens = await issueTokens(user);
  return { user: user.toJSON(), ...tokens };
}

/** Verify + rotate the refresh token: old one is revoked, a new pair is issued. */
export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid refresh token');

  const matchedHash = await user.hasRefreshToken(refreshToken);
  if (!matchedHash) throw ApiError.unauthorized('Refresh token has been revoked');

  // Rotation: drop the used token, then issue a brand new pair.
  await user.removeRefreshToken(matchedHash);
  const tokens = await issueTokens(user);
  return { user: user.toJSON(), ...tokens };
}

export async function logout({ userId, refreshToken }) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;
  const matchedHash = refreshToken ? await user.hasRefreshToken(refreshToken) : null;
  if (matchedHash) {
    await user.removeRefreshToken(matchedHash);
  } else {
    // No/unknown token supplied — revoke everything for safety.
    await user.clearRefreshTokens();
  }
}
