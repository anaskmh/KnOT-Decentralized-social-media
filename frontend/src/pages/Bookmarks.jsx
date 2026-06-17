// ─────────────────────────────────────────────
// Bookmarks — notes you saved (NIP-51 kind 10003)
// ─────────────────────────────────────────────
// The bookmark ids live in context (loaded from your kind-10003 list); here
// we fetch those exact notes by id and render them.
import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import NoteCard from "../components/NoteCard";
import { useNostr } from "../context/NostrContext";
import { useFeed } from "../hooks/useFeed";

export default function Bookmarks() {
  const { bookmarks } = useNostr();
  const { notes } = useFeed(
    bookmarks.length > 0 ? { ids: bookmarks, limit: bookmarks.length } : null,
    { enabled: bookmarks.length > 0 },
  );

  return (
    <>
      <Header title="Bookmarks" subtitle={`${bookmarks.length} saved`} />
      {bookmarks.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="bookmark" size={40} />
          <p className="text-body-md">No bookmarks yet. Tap the bookmark icon on any note.</p>
        </div>
      ) : (
        notes.map((note) => <NoteCard key={note.id} note={note} />)
      )}
    </>
  );
}
