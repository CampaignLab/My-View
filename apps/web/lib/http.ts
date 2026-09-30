import 'server-only';
import { z } from 'zod';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function allowedOrigins() { return (process.env.APP_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(s => s.trim()).filter(Boolean); }
export function cors(request: Request) {
  const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' });
  const origin = request.headers.get('origin');
  if (origin && allowedOrigins().includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }
  return headers;
}
export function preflight(request: Request) { return new Response(null, { status: request.headers.get('origin') && !allowedOrigins().includes(request.headers.get('origin')!) ? 403 : 204, headers: cors(request) }); }
export function endpoint(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      const origin = request.headers.get('origin');
      if (origin && !allowedOrigins().includes(origin)) throw new HttpError(403, 'This app origin is not allowed.');
      return Response.json(await handler(request), { headers: cors(request) });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : error instanceof z.ZodError ? 400 : 500;
      const message = error instanceof HttpError ? error.message : error instanceof z.ZodError ? 'Please check the supplied fields and text length.' : 'My View could not complete this request. Please try again.';
      // Do not log request bodies, posts, tokens, or upstream errors containing text.
      if (status === 500) console.error('My View request failed', { errorType: error instanceof Error ? error.name : 'Unknown' });
      return Response.json({ error: message }, { status, headers: cors(request) });
    }
  };
}
export async function body<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Send JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 65000) { await reader.cancel(); throw new HttpError(413, 'The request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  return schema.parse(parsed);
}
