export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length > b.length) return editDistance(b, a);
  let row = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    const next = [j];
    for (let i = 1; i <= a.length; i++) next[i] = Math.min(next[i - 1] + 1, row[i] + 1, row[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[a.length];
}
