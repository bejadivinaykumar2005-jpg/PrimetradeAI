import { Router } from 'express';
import authRoutes from '../../modules/auth/auth.routes.js';
import userRoutes from '../../modules/users/user.routes.js';
import taskRoutes from '../../modules/tasks/task.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Primetrade API v1',
    endpoints: {
      auth: '/api/v1/auth',
      tasks: '/api/v1/tasks',
      users: '/api/v1/users (admin)',
      docs: '/api/docs',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);

export default router;
