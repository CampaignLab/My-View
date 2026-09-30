import { detectPost } from '../platforms/facebook/detectPost';
import { extractPost } from '../platforms/facebook/extractPost';
import { findComposer, isComposer } from '../platforms/facebook/findComposer';
import { insertText } from '../platforms/facebook/insertText';
import { isFacebook } from '../types';
const scope = window as unknown as { __myViewInstalled?: boolean };
if (!scope.__myViewInstalled && isFacebook(location.href)) {
  scope.__myViewInstalled = true;
  let article: HTMLElement | null = null;
  let lastFocused: HTMLElement | null = null;
  let capturedUrl = '';
  let cleanupPick: (() => void) | undefined;
  document.addEventListener('focusin', e => { if (isComposer(e.target as Element)) lastFocused = e.target as HTMLElement; });
  function pick() {
    cleanupPick?.();
    const notice = document.createElement('div');
    notice.textContent = 'My View · Click the post you want to reply to. Esc to cancel.';
    Object.assign(notice.style, { position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483647', padding: '16px 24px', background: '#115e59', color: '#fff', borderRadius: '14px', font: '14px system-ui', boxShadow: '0 8px 30px #0003' });
    document.body.appendChild(notice);
    function cleanup() { notice.remove(); document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey, true); cleanupPick = undefined; }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); cleanup(); } }
    function onClick(e: MouseEvent) {
      if (notice.contains(e.target as Node)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const candidate = detectPost(e.target as Node);
      const selected = window.getSelection()?.toString();
      const post = extractPost(candidate, selected);
      cleanup();
      if (!post) { void chrome.runtime.sendMessage({ type: 'MV_PICKED_ERROR' }); return; }
      article = candidate; capturedUrl = location.href;
      void chrome.runtime.sendMessage({ type: 'MV_PICKED', post });
    }
    cleanupPick = cleanup;
    document.addEventListener('click', onClick, true); document.addEventListener('keydown', onKey, true);
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'MV_CAPTURE' || message.type === 'MV_SELECTION') {
      const selection = window.getSelection();
      const text = message.text || selection?.toString();
      article = detectPost(selection?.anchorNode ?? null);
      const selectionElement = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
      if (text && (!selectionElement?.closest('[role="main"], [role="article"]') || selectionElement.closest('[data-pagelet*="ChatTab"], [aria-label*="Messenger"]'))) {
        sendResponse({ ok: false, error: 'Select text in a Facebook post. My View does not capture private messages.' }); return;
      }
      const post = text ? extractPost(article, text) : null;
      if (post) { capturedUrl = location.href; sendResponse({ ok: true, post }); }
      else { pick(); sendResponse({ ok: true }); }
    } else if (message.type === 'MV_START_PICK') { pick(); sendResponse({ ok: true }); }
    else if (message.type === 'MV_INSERT_TEXT') {
      if (capturedUrl !== location.href) { sendResponse({ ok: false, error: 'Facebook navigation changed. Capture the post again.' }); return; }
      const composer = findComposer(article, lastFocused);
      const ok = composer ? insertText(composer, message.text) : false;
      sendResponse({ ok, error: ok ? undefined : 'Open an empty comment field on the captured post, click it, and try again. You can also paste the copied reply.' });
    }
  });
}
