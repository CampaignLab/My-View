import { profileSchema } from '@my-view/shared';
import { users, userViews, userStylePreferences } from '@my-view/db';
import { eq } from 'drizzle-orm';
import { body, endpoint, preflight } from '../../../lib/http';
import { requireUser } from '../../../lib/auth';
import { getProfile } from '../../../lib/profile';
import { db } from '../../../lib/db';
export const GET = endpoint(async request => getProfile(await requireUser(request)));
export const PUT = endpoint(async request => {
  const user = await requireUser(request); const profile = await body(request, profileSchema); const database = db();
  const style = { userId: user.id, ...profile.style };
  // Neon HTTP batch runs all profile changes in one transaction.
  const changes = [
    database.update(users).set({ topics: profile.topics }).where(eq(users.id, user.id)),
    database.delete(userViews).where(eq(userViews.userId, user.id)),
    database.insert(userStylePreferences).values(style).onConflictDoUpdate({ target: userStylePreferences.userId, set: profile.style }),
  ] as const;
  if (profile.views.length) await database.batch([...changes, database.insert(userViews).values(profile.views.map(v => ({ ...v, userId: user.id })))]);
  else await database.batch(changes);
  return { saved: true };
});
export const OPTIONS = preflight;
