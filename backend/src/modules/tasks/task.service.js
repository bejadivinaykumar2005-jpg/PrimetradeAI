import { Task } from './task.model.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Build the ownership scope. Admins can see/act on every task; regular users are
 * always scoped to the tasks they own.
 */
function scopeFor(user, extra = {}) {
  if (user.role === 'admin') return { ...extra };
  return { ...extra, owner: user.id };
}

export async function createTask(user, data) {
  const task = await Task.create({ ...data, owner: user.id });
  return task.toJSON();
}

export async function listTasks(user, { page, limit, status, priority, search, sort }) {
  const filter = scopeFor(user);
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(limit).populate('owner', 'name email role'),
    Task.countDocuments(filter),
  ]);

  return {
    items: items.map((t) => t.toJSON()),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getTask(user, id) {
  const task = await Task.findOne(scopeFor(user, { _id: id })).populate('owner', 'name email role');
  if (!task) throw ApiError.notFound('Task not found');
  return task.toJSON();
}

export async function updateTask(user, id, updates) {
  const task = await Task.findOneAndUpdate(scopeFor(user, { _id: id }), updates, {
    new: true,
    runValidators: true,
  });
  if (!task) throw ApiError.notFound('Task not found');
  return task.toJSON();
}

export async function deleteTask(user, id) {
  const task = await Task.findOneAndDelete(scopeFor(user, { _id: id }));
  if (!task) throw ApiError.notFound('Task not found');
  return { id };
}
