// ─── Database Client — Graceful Fallback ───
// If Prisma is not configured (@prisma/client not generated),
// export a null-safe stub instead of crashing the entire app.

let db: any;

try {
  // Dynamic require with error handling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client') as any;

  const globalForPrisma = globalThis as unknown as {
    prisma: any;
  };

  db = globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

  console.log('[db] Prisma client initialized successfully');
} catch (err: any) {
  // Prisma not available — provide null-safe stub
  console.warn('[db] Prisma client not available:', err?.message || 'Unknown error');
  console.warn('[db] Using null-safe database stub. Run `npx prisma generate` to enable Prisma.');

  // Create a proxy that returns empty results instead of crashing
  const nullAsync = () => async () => null;
  const emptyArrayAsync = () => async () => [];
  const zeroAsync = () => async () => 0;
  const emptyObjAsync = () => async () => ({});

  db = new Proxy({} as any, {
    get(_target, prop: string) {
      // Common Prisma model methods — return safe defaults
      if (prop === '$connect') return async () => {};
      if (prop === '$disconnect') return async () => {};
      if (prop === '$queryRaw') return emptyArrayAsync();
      if (prop === '$executeRaw') return zeroAsync();
      if (prop === '$transaction') return async (fn: any) => typeof fn === 'function' ? fn(db) : [];

      // For model access (e.g., db.user.findMany()), return a proxied model
      return new Proxy({} as any, {
        get(_t, method: string) {
          // Common Prisma methods with safe return values
          if (method === 'findMany') return emptyArrayAsync();
          if (method === 'findUnique') return nullAsync();
          if (method === 'findFirst') return nullAsync();
          if (method === 'create') return emptyObjAsync();
          if (method === 'update') return emptyObjAsync();
          if (method === 'delete') return emptyObjAsync();
          if (method === 'upsert') return emptyObjAsync();
          if (method === 'count') return zeroAsync();
          if (method === 'aggregate') return emptyObjAsync();
          if (method === 'groupBy') return emptyArrayAsync();
          return nullAsync();
        }
      });
    }
  });
}

export { db };
