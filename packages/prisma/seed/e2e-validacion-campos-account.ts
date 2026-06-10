import { prisma } from '..';
import { seedUser } from './users';

/**
 * Creates the account used by tests/playwright (Cucumber/Serenity), tests/cypress and
 * tests/stagehand for the "validación de campos insertados" feature
 * (see tests/playwright/PLAN-PRUEBAS-CAJA-NEGRA.md).
 *
 * Email/password and personal team url are hardcoded across those test files.
 */
const EMAIL = 'venividivichi3105@gmail.com';
const PASSWORD = 'Clave1234**A';
const TEAM_URL = 'kbudzsciukycrosn';

const main = async () => {
  const existing = await prisma.user.findFirst({ where: { email: EMAIL } });

  if (existing) {
    console.log(`User ${EMAIL} already exists, skipping.`);
    return;
  }

  const { team } = await seedUser({
    name: 'programador',
    email: EMAIL,
    password: PASSWORD,
    verified: true,
    isPersonalOrganisation: true,
  });

  await prisma.team.update({
    where: { id: team.id },
    data: { url: TEAM_URL },
  });

  console.log(`Seeded ${EMAIL} with personal team url "${TEAM_URL}".`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
