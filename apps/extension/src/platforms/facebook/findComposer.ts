export type Composer = HTMLTextAreaElement | HTMLInputElement | HTMLElement;
export function isComposer(element: Element | null): element is Composer {
  if (!(element instanceof HTMLElement)) return false;
  const editable = element.matches('textarea, [contenteditable="true"][role="textbox"]');
  const label = `${element.getAttribute('aria-label') || ''} ${element.getAttribute('placeholder') || ''}`;
  return editable && !/search|message|messenger/i.test(label) && !element.closest('[role="dialog"][aria-label*="Messenger"]');
}
export function findComposer(article: HTMLElement | null, lastFocused: HTMLElement | null): Composer | null {
  if (!article?.isConnected) return null;
  if (isComposer(lastFocused) && lastFocused.isConnected && article.contains(lastFocused)) return lastFocused;
  const candidates = [...article.querySelectorAll<HTMLElement>('textarea, [contenteditable="true"][role="textbox"]')].filter(el => isComposer(el) && el.getClientRects().length > 0);
  return candidates.length === 1 ? candidates[0] : null;
}
