import type { CapturedPost } from '@my-view/shared';
export interface Capture { id: string; tabId: number; post: CapturedPost }
export type ContentResult = { ok: true; post?: CapturedPost } | { ok: false; error: string };
export const isFacebook = (url?: string) => { try { const u = new URL(url || ''); return u.protocol === 'https:' && (u.hostname === 'facebook.com' || u.hostname.endsWith('.facebook.com')) && !/^\/messages(?:\/|$)/.test(u.pathname); } catch { return false; } };
