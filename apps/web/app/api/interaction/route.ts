import { interactionSchema } from '@my-view/shared';
import { capturedPosts, suggestions, interactions } from '@my-view/db';
import { and, eq } from 'drizzle-orm';
import { body, endpoint, preflight, HttpError } from '../../../lib/http';
import { requireUser } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { editDistance } from '../../../lib/edit-distance';
export const POST = endpoint(async request => {
  const user = await requireUser(request); const input = await body(request, interactionSchema); const database = db();
  if (input.captureId) {
    const [capture] = await database.select().from(capturedPosts).where(and(eq(capturedPosts.id, input.captureId), eq(capturedPosts.userId, user.id)));
    if (!capture) throw new HttpError(404, 'Capture not found.');
  }
  let suggestionId = input.suggestionId; let distance: number | undefined;
  if (suggestionId) {
    const [suggestion] = await database.select().from(suggestions).where(and(eq(suggestions.id, suggestionId), eq(suggestions.userId, user.id)));
    if (!suggestion || (input.captureId && suggestion.capturedPostId !== input.captureId)) throw new HttpError(404, 'Suggestion not found.');
    if (input.finalText) {
      distance = suggestion.generatedText ? editDistance(suggestion.generatedText, input.finalText) : undefined;
      await database.update(suggestions).set({ finalText: input.finalText, status: input.event === 'suggestion_inserted' ? 'inserted' : input.event === 'suggestion_copied' ? 'copied' : undefined }).where(and(eq(suggestions.id, suggestionId), eq(suggestions.userId, user.id)));
    }
  } else if (input.finalText && input.captureId && ['suggestion_copied','suggestion_inserted'].includes(input.event)) {
    const [draft] = await database.insert(suggestions).values({ userId: user.id, capturedPostId: input.captureId, finalText: input.finalText, variant: 'manual', status: input.event === 'suggestion_inserted' ? 'inserted' : 'copied' }).returning();
    suggestionId = draft.id;
  }
  await database.insert(interactions).values({ userId: user.id, capturedPostId: input.captureId, suggestionId, event: input.event, editDistance: distance });
  return { recorded: true, suggestionId };
});
export const OPTIONS = preflight;
