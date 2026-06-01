import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as taskService from './task.service.js';

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.user, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Task created', data: { task } });
});

export const listTasks = asyncHandler(async (req, res) => {
  const { items, meta } = await taskService.listTasks(req.user, req.query);
  sendSuccess(res, { message: 'Tasks retrieved', data: { tasks: items }, meta });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.user, req.params.id);
  sendSuccess(res, { message: 'Task retrieved', data: { task } });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.user, req.params.id, req.body);
  sendSuccess(res, { message: 'Task updated', data: { task } });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteTask(req.user, req.params.id);
  sendSuccess(res, { message: 'Task deleted', data: result });
});
