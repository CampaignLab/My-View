import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn(async () => { throw new Error('Invalid signature'); }), createClerkClient: vi.fn() }));
import { requireUser } from '../apps/web/lib/auth';
import { body, endpoint, preflight } from '../apps/web/lib/http';
import { captureSchema } from '../packages/shared/src/index';
import { editDistance } from '../apps/web/lib/edit-distance';
describe('API authentication and validation', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('rejects requests without a bearer session before touching the database', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'test-only');
    await expect(requireUser(new Request('http://localhost/api/me'))).rejects.toMatchObject({ status: 401 });
  });
  it('rejects a forged bearer token', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'test-only');
    await expect(requireUser(new Request('http://localhost/api/me', { headers: { Authorization: 'Bearer forged' } }))).rejects.toMatchObject({ status: 401 });
  });
  it('does not accept requests from unlisted origins', async () => {
    const handler = vi.fn(async () => ({ ok: true }));
    const request = new Request('http://localhost/api/me', { headers: { Origin: 'https://untrusted.example' } });
    expect((await endpoint(handler)(request)).status).toBe(403);
    expect(preflight(request).headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
  it('rejects invalid or oversized capture payloads', async () => {
    const request = new Request('http://localhost/api/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ captureId: crypto.randomUUID(), post: { text: 'x'.repeat(12001) } }) });
    await expect(body(request, captureSchema)).rejects.toThrow();
  });
  it('computes edit distance on the generated and final text', () => {
    expect(editDistance('hello', 'hello!')).toBe(1); expect(editDistance('kitten','sitting')).toBe(3); expect(editDistance('', 'reply')).toBe(5);
  });
});
