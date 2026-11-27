import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import { env } from './env.js';

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: env.adminEmail.toLowerCase() },
  });

  if (existing) {
    console.log(`Usuario existente: ${existing.email}. No se modificó su contraseña.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: env.adminName,
      email: env.adminEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(env.adminPassword, 10),
      role: 'admin',
    },
  });

  console.log(`Usuario administrador creado: ${user.email} (contraseña definida en ADMIN_PASSWORD).`);
  console.log('El panel inicia vacío. Crea un proyecto o importa un cronograma PlantUML.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
