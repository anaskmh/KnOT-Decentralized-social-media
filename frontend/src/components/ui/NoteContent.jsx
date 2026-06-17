// ─────────────────────────────────────────────
// NoteContent — render a note's text with rich tokens
// ─────────────────────────────────────────────
// Highlights #hashtags (purple, clickable), links, and image URLs (inlined).
// With blurMedia, images from authors you don't follow start blurred and
// only sharpen when deliberately clicked — the main shield against
// unexpected adult images from the global firehose.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TOKEN = /(#[\p{L}\d_]+|https?:\/\/[^\s]+)/giu;
const IMAGE = /\.(png|jpe?g|gif|webp|avif)$/i;

function BlurrableImage({ src, blur }) {
  const [shown, setShown] = useState(!blur);
  return (
    <div className="relative mt-3 rounded-xl overflow-hidden border border-outline-variant">
      <img
        src={src}
        alt=""
        className={`max-h-[400px] w-full object-cover transition-all duration-200 ${shown ? "" : "blur-2xl scale-110"}`}
        onError={(e) => {
          e.currentTarget.closest("div").style.display = "none";
        }}
      />
      {!shown && (
        <button
          onClick={(e) => { e.stopPropagation(); setShown(true); }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-on-surface"
        >
          <span className="bg-black/60 px-4 py-2 rounded-full font-bold text-label-sm">
            Media from someone you don't follow — click to view
          </span>
        </button>
      )}
    </div>
  );
}

export default function NoteContent({ text, blurMedia = false }) {
  const navigate = useNavigate();
  const parts = String(text || "").split(TOKEN);
  const images = [];

  const rendered = parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("#")) {
      return (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/explore?q=${encodeURIComponent(part)}`);
          }}
          className="text-primary hover:underline"
        >
          {part}
        </button>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      if (IMAGE.test(part)) {
        images.push(part);
        return null;
      }
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-secondary hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });

  return (
    <>
      <p className="mt-1 font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap break-words">
        {rendered}
      </p>
      {images.map((src) => (
        <BlurrableImage key={src} src={src} blur={blurMedia} />
      ))}
    </>
  );
}
