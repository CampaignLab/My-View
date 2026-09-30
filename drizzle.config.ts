import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
config({ path: 'apps/web/.env.local' });
export default defineConfig({
  dialect: 'postgresql', schema: './packages/db/schema.ts',
  out: './packages/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
