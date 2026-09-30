import type { CapturedPost } from '@my-view/shared';
export function extractPost(article: HTMLElement | null, selectedText?: string): CapturedPost | null {
  const message = article?.querySelector<HTMLElement>('[data-ad-preview="message"], [data-ad-comet-preview="message"]');
  // Never use article.innerText: it includes unrelated comments and controls.
  const postText = (selectedText || message?.innerText || message?.textContent || '').trim().slice(0, 12000);
  if (!postText) return null;
  const author = article?.querySelector('h2, h3, strong')?.textContent?.trim().slice(0, 200);
  const permalink = article?.querySelector<HTMLAnchorElement>('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="]');
  return { platform: 'facebook', postText, url: permalink?.href || location.href, author };
}
