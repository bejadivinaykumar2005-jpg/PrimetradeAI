import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as userService from './user.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { items, meta } = await userService.listUsers(req.query);
  sendSuccess(res, { message: 'Users retrieved', data: { users: items }, meta });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, { message: 'User retrieved', data: { user } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser({
    id: req.params.id,
    actingUserId: req.user.id,
    updates: req.body,
  });
  sendSuccess(res, { message: 'User updated', data: { user } });
});
