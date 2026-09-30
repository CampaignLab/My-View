import { endpoint, preflight } from '../../../lib/http';
export const GET = endpoint(async () => ({ ok: true, authConfigured: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), databaseConfigured: Boolean(process.env.DATABASE_URL), aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));
export const OPTIONS = preflight;
