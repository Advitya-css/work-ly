const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function generateCodes(count = 10) {
  const codes = [];
  console.log(`Generating ${count} beta codes...`);
  
  for (let i = 0; i < count; i++) {
    // Generate a code like "BETA-A1B2C3D4"
    const code = 'BETA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    await prisma.betaCode.create({
      data: { code }
    });
    codes.push(code);
    console.log(`- ${code}`);
  }
  
  console.log('\nDone! Give these codes to your beta testers.');
  await prisma.$disconnect();
}

const count = parseInt(process.argv[2]) || 10;
generateCodes(count).catch(e => {
  console.error(e);
  process.exit(1);
});
