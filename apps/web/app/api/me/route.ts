import { endpoint, preflight } from '../../../lib/http';
import { requireUser } from '../../../lib/auth';
export const GET = endpoint(async request => { const user = await requireUser(request); return { id: user.id, email: user.email, connected: true }; });
export const OPTIONS = preflight;
