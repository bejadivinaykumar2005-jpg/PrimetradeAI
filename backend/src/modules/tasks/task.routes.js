import { Router } from 'express';
import * as taskController from './task.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  listTasksSchema,
} from './task.validation.js';

const router = Router();

// All task routes require a valid access token.
router.use(authenticate);

/**
 * @openapi
 * /api/v1/tasks:
 *   get:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: List the caller's tasks (admins see all), paginated & filterable
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: status, schema: { type: string, enum: [todo, in_progress, done] } }
 *       - { in: query, name: priority, schema: { type: string, enum: [low, medium, high] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sort, schema: { type: string, enum: [createdAt, -createdAt, dueDate, -dueDate] } }
 *     responses:
 *       200: { description: List of tasks }
 *   post:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTaskInput' }
 *     responses:
 *       201: { description: Task created }
 */
router
  .route('/')
  .get(validate(listTasksSchema), taskController.listTasks)
  .post(validate(createTaskSchema), taskController.createTask);

/**
 * @openapi
 * /api/v1/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Get a single task by id
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a task
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateTaskInput' }
 *     responses:
 *       200: { description: Task updated }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete a task
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task deleted }
 *       404: { description: Not found }
 */
router
  .route('/:id')
  .get(validate(taskIdSchema), taskController.getTask)
  .patch(validate(updateTaskSchema), taskController.updateTask)
  .delete(validate(taskIdSchema), taskController.deleteTask);

export default router;
