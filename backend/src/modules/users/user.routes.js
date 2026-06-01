import { Router } from 'express';
import * as userController from './user.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { listUsersSchema, userIdSchema, updateUserSchema } from './user.validation.js';

const router = Router();

// Every route here is admin-only — demonstrates role-based access control.
router.use(authenticate, authorize('admin'));

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     summary: List users (paginated, filterable) — admin only
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: role, schema: { type: string, enum: [user, admin] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: List of users }
 *       403: { description: Requires admin role }
 */
router.get('/', validate(listUsersSchema), userController.listUsers);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     summary: Get a single user by id — admin only
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: User }
 *       404: { description: Not found }
 */
router.get('/:id', validate(userIdSchema), userController.getUser);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags: [Users (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a user's role or active status — admin only
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateUserInput' }
 *     responses:
 *       200: { description: Updated user }
 *       404: { description: Not found }
 */
router.patch('/:id', validate(updateUserSchema), userController.updateUser);

export default router;
