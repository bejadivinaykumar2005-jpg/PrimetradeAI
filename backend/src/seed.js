import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { User } from './modules/users/user.model.js';
import { Task } from './modules/tasks/task.model.js';

/**
 * Idempotent seed: ensures an admin account exists and gives it a couple of
 * sample tasks. Safe to run multiple times.
 */
async function seed() {
  await connectDB();

  let admin = await User.findOne({ email: env.seedAdmin.email });
  if (!admin) {
    admin = await User.create({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      password: env.seedAdmin.password,
      role: 'admin',
    });
    logger.info(`Created admin: ${admin.email}`);
  } else {
    logger.info(`Admin already exists: ${admin.email}`);
  }

  const taskCount = await Task.countDocuments({ owner: admin._id });
  if (taskCount === 0) {
    await Task.insertMany([
      {
        title: 'Review backend submissions',
        description: 'Go through intern API submissions',
        status: 'in_progress',
        priority: 'high',
        owner: admin._id,
      },
      {
        title: 'Prepare onboarding docs',
        description: 'Draft the developer onboarding guide',
        status: 'todo',
        priority: 'medium',
        owner: admin._id,
      },
    ]);
    logger.info('Seeded sample tasks for admin');
  }

  logger.info('\nSeed complete. Login with:');
  logger.info(`  email:    ${env.seedAdmin.email}`);
  logger.info(`  password: ${env.seedAdmin.password}`);

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.stack || err.message}`);
  process.exit(1);
});
