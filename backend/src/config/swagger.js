import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * OpenAPI 3 spec. The base definition (servers, security scheme, reusable schemas)
 * is declared here; per-endpoint paths are collected from the @openapi JSDoc
 * comments in the route files via swagger-jsdoc.
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Primetrade.ai Task API',
    version: '1.0.0',
    description:
      'Scalable REST API with JWT authentication, role-based access control, and Task CRUD. Built for the Primetrade.ai backend assignment.',
  },
  servers: [{ url: `http://localhost:${env.port}`, description: 'Local server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: {
            type: 'string',
            format: 'password',
            example: 'Passw0rd!',
            description: 'Min 8 chars, with upper, lower, and a number',
          },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', format: 'password', example: 'Passw0rd!' },
        },
      },
      RefreshInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      CreateTaskInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'Ship the assignment' },
          description: { type: 'string', example: 'Finish backend + frontend' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'], example: 'todo' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      UpdateTaskInput: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['user', 'admin'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Registration, login, token refresh & session' },
    { name: 'Tasks', description: 'CRUD for the Task entity (ownership-scoped)' },
    { name: 'Users (Admin)', description: 'User management — admin role required' },
  ],
};

// Normalise to forward slashes — the underlying glob does not match Windows
// backslash paths, which would otherwise yield an empty `paths` object.
const apisGlob = path.join(__dirname, '../modules/**/*.routes.js').replace(/\\/g, '/');

export const swaggerSpec = swaggerJSDoc({
  definition,
  apis: [apisGlob],
});
