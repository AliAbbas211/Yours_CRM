const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.agentConfig.deleteMany({});
  console.log('Cleared AgentConfig');
}

main().catch(console.error).finally(() => prisma.$disconnect());
