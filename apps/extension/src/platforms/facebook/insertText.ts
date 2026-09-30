import type { Composer } from './findComposer';
export function insertText(composer: Composer, text: string): boolean {
  if (!text.trim() || text.length > 5000) return false;
  const isInput = composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement;
  const existing = isInput ? composer.value : composer.innerText;
  if (existing.trim()) return false; // Protect an existing Facebook draft.
  composer.focus();
  if (isInput) {
    const prototype = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(composer, text);
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
    return composer.value === text;
  }
  const range = document.createRange();
  range.selectNodeContents(composer); range.collapse(false);
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  // insertText uses the browser editing pipeline; text is never interpreted as HTML.
  const inserted = document.execCommand('insertText', false, text);
  return inserted && (composer.innerText || composer.textContent || '').replace(/\r\n/g, '\n').trim() === text.trim();
}
