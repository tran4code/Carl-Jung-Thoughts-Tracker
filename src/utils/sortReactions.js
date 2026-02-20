/**
 * Sort reactions by passage position in the chapter.
 * Reactions with a passageStart are sorted by that ID (lexicographic).
 * Reactions without a passage go at the end, sorted by timestamp.
 */
export function sortByPassagePosition(reactions) {
  const withPassage = reactions.filter((r) => r.passageStart);
  const withoutPassage = reactions.filter((r) => !r.passageStart);

  withPassage.sort((a, b) => a.passageStart.localeCompare(b.passageStart));

  withoutPassage.sort((a, b) => {
    const tA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
    const tB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
    return tA - tB;
  });

  return [...withPassage, ...withoutPassage];
}
