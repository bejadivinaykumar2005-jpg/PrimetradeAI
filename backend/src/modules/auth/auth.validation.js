import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
      email: z.string().trim().toLowerCase().email('A valid email is required'),
      password,
    })
    .strict(),
};

export const loginSchema = {
  body: z
    .object({
      email: z.string().trim().toLowerCase().email('A valid email is required'),
      password: z.string().min(1, 'Password is required'),
    })
    .strict(),
};

export const refreshSchema = {
  body: z
    .object({
      refreshToken: z.string().min(10, 'refreshToken is required'),
    })
    .strict(),
};
