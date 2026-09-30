import 'server-only';
import { eq } from 'drizzle-orm';
import { users, userViews, userStylePreferences } from '@my-view/db';
import { defaultProfile, styleSchema, type Profile } from '@my-view/shared';
import { db } from './db';
export async function getProfile(user: typeof users.$inferSelect): Promise<Profile> {
  const database = db();
  const [views, [style]] = await Promise.all([
    database.select().from(userViews).where(eq(userViews.userId, user.id)),
    database.select().from(userStylePreferences).where(eq(userStylePreferences.userId, user.id)),
  ]);
  return { topics: user.topics, views: views.map(v => ({ topic: v.topic, proposition: v.proposition, position: v.position, notes: v.notes ?? undefined })), style: style ? styleSchema.parse(style) : defaultProfile.style };
}
