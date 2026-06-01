import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task id');

const statusEnum = z.enum(['todo', 'in_progress', 'done']);
const priorityEnum = z.enum(['low', 'medium', 'high']);

export const createTaskSchema = {
  body: z
    .object({
      title: z.string().trim().min(1, 'Title is required').max(140),
      description: z.string().trim().max(2000).optional().default(''),
      status: statusEnum.optional().default('todo'),
      priority: priorityEnum.optional().default('medium'),
      dueDate: z.coerce.date().optional().nullable(),
    })
    .strict(),
};

export const updateTaskSchema = {
  params: z.object({ id: objectId }).strict(),
  body: z
    .object({
      title: z.string().trim().min(1).max(140).optional(),
      description: z.string().trim().max(2000).optional(),
      status: statusEnum.optional(),
      priority: priorityEnum.optional(),
      dueDate: z.coerce.date().optional().nullable(),
    })
    .strict()
    .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' }),
};

export const taskIdSchema = {
  params: z.object({ id: objectId }).strict(),
};

export const listTasksSchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      status: statusEnum.optional(),
      priority: priorityEnum.optional(),
      search: z.string().trim().max(140).optional(),
      sort: z.enum(['createdAt', '-createdAt', 'dueDate', '-dueDate']).default('-createdAt'),
    })
    .strict(),
};
