import 'server-only';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { users } from '@my-view/db';
import { db } from './db';
import { HttpError, allowedOrigins } from './http';
export async function requireUser(request: Request) {
  if (!process.env.CLERK_SECRET_KEY) throw new HttpError(503, 'My View sign-in is not configured yet.');
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Sign into My View to connect.');
  let clerkId: string;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, authorizedParties: allowedOrigins() });
    clerkId = payload.sub;
    if (!clerkId || !payload.sid) throw new Error('Session required');
  } catch { throw new HttpError(401, 'Your session has expired. Sign in again.'); }
  if (!process.env.DATABASE_URL) throw new HttpError(503, 'The My View database is not configured yet.');
  const database = db();
  const [existing] = await database.select().from(users).where(eq(users.clerkUserId, clerkId));
  if (existing) return existing;
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const account = await clerk.users.getUser(clerkId);
  const email = account.emailAddresses.find(e => e.id === account.primaryEmailAddressId)?.emailAddress;
  await database.insert(users).values({ clerkUserId: clerkId, email }).onConflictDoNothing();
  const [user] = await database.select().from(users).where(eq(users.clerkUserId, clerkId));
  return user;
}
