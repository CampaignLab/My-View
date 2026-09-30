import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured');
  return drizzle(neon(process.env.DATABASE_URL));
}
