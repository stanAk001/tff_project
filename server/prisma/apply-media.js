// Adds the demo photography and film (see seed-media.js) to an existing database.
// Only empty spaces are filled; anything you have uploaded is left alone.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { applyDemoMedia } from './seed-media.js';

const prisma = new PrismaClient();
applyDemoMedia(prisma)
  .then((counts) => console.log('Demo media added:', counts))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
