import { createApp } from './app.js';
import { env } from './env.js';
import { prisma } from './db.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Cronograma Studio API escuchando en http://localhost:${env.port}`);
  if (env.nodeEnv !== 'production') {
    console.log('Frontend de desarrollo: http://localhost:5173');
  }
});

async function shutdown(signal: string) {
  console.log(`\n${signal} recibido, cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
