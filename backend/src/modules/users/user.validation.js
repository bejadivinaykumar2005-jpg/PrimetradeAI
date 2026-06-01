import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const listUsersSchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      role: z.enum(['user', 'admin']).optional(),
      search: z.string().trim().max(80).optional(),
    })
    .strict(),
};

export const userIdSchema = {
  params: z.object({ id: objectId }).strict(),
};

export const updateUserSchema = {
  params: z.object({ id: objectId }).strict(),
  body: z
    .object({
      role: z.enum(['user', 'admin']).optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' }),
};
