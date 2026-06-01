import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Registration successful', data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendSuccess(res, { message: 'Login successful', data: result });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  sendSuccess(res, { message: 'Token refreshed', data: result });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout({ userId: req.user.id, refreshToken: req.body?.refreshToken });
  sendSuccess(res, { message: 'Logged out successfully' });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Current user', data: { user: req.user.toJSON() } });
});
