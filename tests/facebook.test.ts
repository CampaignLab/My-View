// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectPost } from '../apps/extension/src/platforms/facebook/detectPost';
import { extractPost } from '../apps/extension/src/platforms/facebook/extractPost';
import { findComposer } from '../apps/extension/src/platforms/facebook/findComposer';
import { insertText } from '../apps/extension/src/platforms/facebook/insertText';
import { isFacebook } from '../apps/extension/src/types';
describe('Facebook handoff boundaries', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('extracts only the chosen post message, excluding comments and neighbouring posts', () => {
    document.body.innerHTML = '<article role="article"><h3>Alex</h3><div data-ad-preview="message">Chosen post</div><div>Private reply context not requested</div></article><article role="article"><div data-ad-preview="message">Other post</div></article>';
    const article = detectPost(document.querySelector('[data-ad-preview]'));
    expect(extractPost(article)?.postText).toBe('Chosen post');
    expect(extractPost(article)?.author).toBe('Alex');
  });
  it('does not read an entire article when a message selector is unavailable', () => {
    document.body.innerHTML = '<div role="article">Unknown post layout and comments</div>';
    expect(extractPost(document.querySelector('[role="article"]'))).toBeNull();
    expect(extractPost(null, 'Deliberately selected text')?.postText).toBe('Deliberately selected text');
  });
  it('ignores a composer focused in a different post', () => {
    document.body.innerHTML = '<div role="article" id="one"></div><div role="article"><textarea id="other"></textarea></div>';
    expect(findComposer(document.querySelector('#one'), document.querySelector('#other'))).toBeNull();
  });
  it('preserves an existing draft and never activates the publish button', () => {
    document.body.innerHTML = '<textarea>Existing draft</textarea><button>Comment</button>';
    const publish = vi.fn(); document.querySelector('button')!.addEventListener('click', publish);
    expect(insertText(document.querySelector('textarea')!, 'Replacement')).toBe(false);
    expect(document.querySelector('textarea')!.value).toBe('Existing draft');
    expect(publish).not.toHaveBeenCalled();
  });
  it('inserts plain text and emits input without submitting', () => {
    document.body.innerHTML = '<form><textarea></textarea><button>Comment</button></form>';
    const input = vi.fn(); const submit = vi.fn(); document.querySelector('textarea')!.addEventListener('input', input); document.querySelector('form')!.addEventListener('submit', submit);
    expect(insertText(document.querySelector('textarea')!, '<script>plain text</script>')).toBe(true);
    expect(document.querySelector('script')).toBeNull(); expect(input).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
  });
  it('rejects lookalike domains and message pages', () => {
    expect(isFacebook('https://www.facebook.com/groups/example')).toBe(true);
    expect(isFacebook('https://facebook.com.evil.example')).toBe(false);
    expect(isFacebook('https://www.facebook.com/messages/t/123')).toBe(false);
  });
});
