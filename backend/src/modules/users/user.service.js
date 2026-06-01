import { User } from './user.model.js';
import { ApiError } from '../../utils/ApiError.js';

export async function listUsers({ page, limit, role, search }) {
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => u.toJSON()),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

export async function updateUser({ id, actingUserId, updates }) {
  if (id === actingUserId && updates.role && updates.role !== 'admin') {
    throw ApiError.badRequest('Admins cannot demote their own account');
  }
  if (id === actingUserId && updates.isActive === false) {
    throw ApiError.badRequest('Admins cannot deactivate their own account');
  }

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  if (updates.role !== undefined) user.role = updates.role;
  if (updates.isActive !== undefined) {
    user.isActive = updates.isActive;
    // Revoking access for a deactivated account: drop all refresh tokens.
    if (!updates.isActive) await user.clearRefreshTokens();
  }
  await user.save();
  return user.toJSON();
}
