/**
 * The "real" Prisma Client, ready to use once `npx prisma generate` has
 * been run successfully (it runs automatically on `npm install` via the
 * "postinstall" script - see the README for details on why it's not used
 * by default in this sandbox).
 *
 * To switch the app over from the interim raw-pg query layer
 * (src/lib/db/users.ts, career-profile.ts, career-goals.ts) to this client:
 *   1. Run `npx prisma generate` (needs normal internet access).
 *   2. Import `prisma` from this file wherever the query layer is used.
 *   3. Delete the interim query files once nothing references them.
 *
 * No schema or migration changes are needed either way - both paths read
 * the same tables defined in prisma/schema.prisma.
 */
import { PrismaPg } from "@prisma/adapter-pg";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - only resolves after `npx prisma generate` has run (see comment above)
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma?: InstanceType<typeof PrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
