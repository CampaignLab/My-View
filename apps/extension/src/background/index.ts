import type { Capture, ContentResult } from '../types';
import { isFacebook } from '../types';
const menuId = 'my-view-use';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: menuId, title: 'Use in My View', contexts: ['selection','page'], documentUrlPatterns: ['https://*.facebook.com/*','https://facebook.com/*'] }));
  void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
});
export async function inject(tabId: number) { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); }
async function saveCapture(tabId: number, post: Capture['post']) {
  await chrome.storage.session.set({ capture: { id: crypto.randomUUID(), tabId, post } satisfies Capture, captureError: null });
}
async function capture(tab: chrome.tabs.Tab, selectedText?: string) {
  if (!tab.id || !isFacebook(tab.url)) throw new Error('Open a Facebook discussion first.');
  await inject(tab.id);
  const result: ContentResult = await chrome.tabs.sendMessage(tab.id, { type: selectedText ? 'MV_SELECTION' : 'MV_CAPTURE', text: selectedText });
  if (!result.ok) throw new Error(result.error);
  if (result.post) await saveCapture(tab.id, result.post);
}
function report(error: unknown) { void chrome.storage.session.set({ captureError: error instanceof Error ? error.message : 'Capture failed. Highlight post text and try again.' }); }
// Open synchronously in the click handler to retain Chrome's user gesture.
chrome.action.onClicked.addListener(tab => {
  if (tab.id) void chrome.sidePanel.open({ tabId: tab.id }).catch(report);
  void capture(tab).catch(report);
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== menuId || !tab?.id) return;
  void chrome.sidePanel.open({ tabId: tab.id }).catch(report);
  void capture(tab, info.selectionText).catch(report);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message.type === 'MV_PICKED_ERROR' && sender.tab && isFacebook(sender.tab.url)) {
    report(new Error('Could not read that post. Highlight its text and right-click Use in My View.')); return;
  }
  if (message.type === 'MV_PICKED' && sender.tab?.id && isFacebook(sender.tab.url)) {
    void saveCapture(sender.tab.id, message.post).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false })); return true;
  }
  if (sender.tab) return; // Only extension pages may ask to inject/capture/insert.
  if (message.type === 'MV_PICK' || message.type === 'MV_INSERT') {
    void (async () => {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!active?.id || !isFacebook(active.url)) throw new Error('Switch to Facebook first.');
      if (message.type === 'MV_INSERT') {
        const { capture: saved } = await chrome.storage.session.get<{ capture?: Capture }>('capture');
        if (!saved || saved.id !== message.captureId || saved.tabId !== active.id) throw new Error('Return to the tab containing the captured post, or capture it again.');
        await inject(active.id);
        const result = await chrome.tabs.sendMessage(active.id, { type: 'MV_INSERT_TEXT', text: message.text, sourceUrl: saved.post.url });
        sendResponse(result);
      } else {
        await inject(active.id);
        sendResponse(await chrome.tabs.sendMessage(active.id, { type: 'MV_START_PICK' }));
      }
    })().catch(e => sendResponse({ ok: false, error: e.message })); return true;
  }
});
chrome.tabs.onRemoved.addListener(tabId => {
  void chrome.storage.session.get<{ capture?: Capture }>('capture').then(({ capture: saved }) => { if (saved?.tabId === tabId) return chrome.storage.session.remove(['capture','captureError','draft']); });
});
