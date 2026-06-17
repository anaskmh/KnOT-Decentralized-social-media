// ─────────────────────────────────────────────
// Discovery helpers — derive trends + active authors from notes
// ─────────────────────────────────────────────
// Shared by the right sidebar and the Explore page so the logic lives once.

// Count hashtags across sampled notes → top `limit`, most-used first.
export function deriveTrends(notes, limit = 12) {
  const counts = {};
  for (const note of notes) {
    const tags = (note.content.match(/#[\p{L}\d_]+/gu) || []).map((t) => t.slice(1).toLowerCase());
    for (const tag of new Set(tags)) counts[tag] = (counts[tag] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

// Most recent distinct authors → up to `limit` suggestions.
export function deriveAuthors(notes, limit = 3) {
  const seen = [];
  for (const note of notes) {
    if (!seen.includes(note.pubkey)) seen.push(note.pubkey);
    if (seen.length >= limit) break;
  }
  return seen;
}
