import 'server-only';
import { and, eq } from 'drizzle-orm';
import { capturedPosts, interactions } from '@my-view/db';
import type { z } from 'zod';
import type { captureSchema } from '@my-view/shared';
import { db } from './db';
import { HttpError } from './http';
export async function saveCapture(userId: string, input: z.infer<typeof captureSchema>) {
  const database = db();
  const inserted = await database.insert(capturedPosts).values({ id: input.captureId, userId, platform: 'facebook', sourceUrl: input.post.url, author: input.post.author, text: process.env.STORE_CAPTURED_POST_TEXT === 'true' ? input.post.text : null }).onConflictDoNothing().returning();
  const [capture] = await database.select().from(capturedPosts).where(and(eq(capturedPosts.id, input.captureId), eq(capturedPosts.userId, userId)));
  if (!capture) throw new HttpError(404, 'Capture not found.');
  if (inserted.length) await database.insert(interactions).values({ userId, capturedPostId: capture.id, event: 'post_captured' });
  return capture;
}
