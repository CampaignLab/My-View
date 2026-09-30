import { captureSchema } from '@my-view/shared';
import { body, endpoint, preflight } from '../../../lib/http';
import { requireUser } from '../../../lib/auth';
import { saveCapture } from '../../../lib/capture';
export const POST = endpoint(async request => { const user = await requireUser(request); const input = await body(request, captureSchema); await saveCapture(user.id, input); return { captureId: input.captureId }; });
export const OPTIONS = preflight;
