export function detectPost(target: Node | null): HTMLElement | null {
  const element = target instanceof Element ? target : target?.parentElement;
  return element?.closest<HTMLElement>('[role="article"]') ?? null;
}
