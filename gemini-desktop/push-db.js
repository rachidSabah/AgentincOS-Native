const { execSync } = require('child_process');
try {
  execSync('npx prisma@6.11.1 db push --schema=prisma/schema.prisma', { stdio: 'inherit' });
} catch (e) {
  console.error(e);
}
