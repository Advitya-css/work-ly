const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.discoveredJob.findMany({ select: { title: true, location: true, country: true, workMode: true } });
  console.log("Total jobs:", jobs.length);
  console.log("Samples:", jobs.slice(0, 10));
}
main().finally(() => prisma.$disconnect());
