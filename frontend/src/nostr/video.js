// ─────────────────────────────────────────────
// Short video helpers (NIP-71 kind 22 + NIP-92 imeta)
// ─────────────────────────────────────────────
// A short-video event keeps its file in an "imeta" tag, whose parts are
// space-separated "key value" pairs, e.g.:
//   ["imeta", "url https://…/clip.mp4", "m video/mp4", "dim 1080x1920"]
// As a fallback we also accept a bare video URL sitting in the content.

const VIDEO_URL = /https?:\/\/[^\s]+\.(mp4|webm|mov|m4v)(\?[^\s]*)?/i;

// Pull "key value" fields out of one imeta tag into a plain object.
function parseImeta(tag) {
  const fields = {};
  for (let i = 1; i < tag.length; i++) {
    const part = tag[i];
    const space = part.indexOf(" ");
    if (space === -1) continue;
    fields[part.slice(0, space)] = part.slice(space + 1);
  }
  return fields;
}

// Rich metadata for a kind-22 event, including optional poster/thumbnail
// hints if the author stored them in the imeta tag.
export function getShortMediaDetails(event) {
  const imetas = (event.tags || []).filter((t) => t[0] === "imeta");
  for (const tag of imetas) {
    const fields = parseImeta(tag);
    const { url, m } = fields;
    if (url && (!m || m.startsWith("video/") || VIDEO_URL.test(url))) {
      return {
        url,
        mimeType: m || "",
        posterUrl: fields.image || fields.thumb || fields.poster || "",
        dimensions: fields.dim || "",
      };
    }
  }

  const match = String(event.content || "").match(VIDEO_URL);
  return match
    ? {
        url: match[0],
        mimeType: "",
        posterUrl: "",
        dimensions: "",
      }
    : null;
}

// The playable video URL for a kind-22 event, or null if it has none.
export function getShortVideoUrl(event) {
  return getShortMediaDetails(event)?.url || null;
}

// The caption to show under a short — its content, minus a trailing bare
// video URL if the author put the link inline instead of in an imeta tag.
export function getShortCaption(event) {
  return String(event.content || "").replace(VIDEO_URL, "").trim();
}
