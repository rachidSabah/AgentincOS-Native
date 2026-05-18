const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.provider.upsert({
    where: { name: 'DeepSeek' },
    update: { 
      apiKey: 'sk-c31ad53c85bc4144bb6c51e305734496',
      baseUrl: 'https://api.deepseek.com'
    },
    create: { 
      name: 'DeepSeek',
      apiKey: 'sk-c31ad53c85bc4144bb6c51e305734496',
      baseUrl: 'https://api.deepseek.com',
      isActive: true
    },
  });
  console.log('DeepSeek provider updated:', provider);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
