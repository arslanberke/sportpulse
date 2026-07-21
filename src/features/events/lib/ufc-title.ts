/**
 * UFC event titles bundle the card name and the main bout together, e.g.
 * "UFC Fight Night 282 Ankalaev vs Rountree Jr" or "UFC 320: Jones vs Aspinall".
 * Splitting them lets heroes show the card name as a label and the bout big.
 */
export function splitUfcTitle(title: string): { card: string; bout: string } | null {
  const match = /^(UFC(?:\s+(?:Fight Night|on\s+\S+))?(?:\s+\d+)?)[\s:–-]+(.+)$/i.exec(title.trim());
  if (!match || match[2].trim().length < 3) return null;
  return { card: match[1].trim(), bout: match[2].trim() };
}
