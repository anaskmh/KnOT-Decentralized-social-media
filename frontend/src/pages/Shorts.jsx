// ─────────────────────────────────────────────
// Shorts — full-screen vertical reel of short videos (NIP-71 kind 22)
// ─────────────────────────────────────────────
// Scroll-snap feed: one video per screen, autoplaying as it comes into view.
//
// Only a small WINDOW of cards is actually mounted at a time (the current one
// plus a few ahead/behind) — mounting all of them would spin up hundreds of
// <video> elements at once and hang the app. Every slot still reserves its
// full height so scroll position and snapping stay correct; off-window slots
// are cheap placeholders until you scroll near them.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Icon from "../components/ui/Icon";
import ShortCard from "../components/shorts/ShortCard";
import { useShortsFeed } from "../hooks/useShortsFeed";
import { useFeed } from "../hooks/useFeed";

const AHEAD = 3;   // preload this many upcoming reels
const BEHIND = 1;  // keep this many already-watched reels mounted
const PULL_THRESHOLD = 72;
const PULL_MAX = 120;

export default function Shorts() {
  // /shorts/:id — arrived here from a direct link (e.g. a shared video in a
  // DM). Show just that one short full-screen instead of the shuffled feed.
  const { id } = useParams();
  if (id) return <SingleShortView id={id} />;
  return <ShortsFeed />;
}

function SingleShortView({ id }) {
  const navigate = useNavigate();
  const { notes, loading } = useFeed({ ids: [id] });
  const short = notes[0];
  const [muted, setMuted] = useState(true); // browsers block autoplay-with-sound anyway

  return (
    <div className="relative h-[calc(100dvh-4rem)] lg:h-screen bg-black">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-3 pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto text-white" type="button">
          <Icon name="arrow_back" size={24} />
        </button>
      </div>

      {short ? (
        <ShortCard short={short} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      ) : (
        <div className="h-full flex items-center justify-center text-white/60">
          {loading ? (
            <Icon name="progress_activity" className="animate-spin" size={32} />
          ) : (
            <p className="text-body-lg px-8 text-center">Couldn't find that video on any connected relay.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ShortsFeed() {
  const { shorts, loading, loadingMore, hasMore, refresh, loadMore } = useShortsFeed();
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(0);
  const sentinelRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [muted, setMuted] = useState(true); // shared across every reel
  const shortsRef = useRef(shorts);
  const pullDistanceRef = useRef(0);
  const wheelReleaseTimerRef = useRef(null);
  const pullReady = pullDistance >= PULL_THRESHOLD;
  const pullProgress = useMemo(
    () => Math.min(1, pullDistance / PULL_THRESHOLD),
    [pullDistance],
  );

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    shortsRef.current = shorts;
  }, [shorts]);

  useEffect(() => () => clearTimeout(wheelReleaseTimerRef.current), []);

  // Which reel is on screen = scrollTop / one screen height. Throttled to one
  // update per animation frame so fast flicking doesn't thrash React.
  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / el.clientHeight);
      setCurrent((prev) => (prev === index ? prev : index));

      // As you near the end of the loaded window, fetch the next page so the
      // reel keeps going instead of looping over the same slice.
      if (hasMore && !loadingMore && index >= shorts.length - 4) {
        loadMore();
      }
    });
  }, [hasMore, loadingMore, loadMore, shorts.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { root, threshold: 0.25 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore, shorts.length]);

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    setPulling(false);
    setPullDistance(0);
    try {
      await Promise.resolve(refresh());
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: 0, behavior: "auto" });
      setCurrent(0);
    } finally {
      requestAnimationFrame(() => setRefreshing(false));
    }
  }, [refresh]);

  const releasePull = useCallback(() => {
    clearTimeout(wheelReleaseTimerRef.current);
    wheelReleaseTimerRef.current = null;
    const shouldRefresh = pullDistanceRef.current >= PULL_THRESHOLD;
    setPulling(false);
    setPullDistance(0);
    if (shouldRefresh) {
      void triggerRefresh();
    }
  }, [triggerRefresh]);

  const scheduleRelease = useCallback(() => {
    clearTimeout(wheelReleaseTimerRef.current);
    wheelReleaseTimerRef.current = setTimeout(releasePull, 140);
  }, [releasePull]);

  const onWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;

    // Only turn the top-edge wheel gesture into pull-to-refresh when the reel
    // is already at the top; otherwise let the reel scroll normally.
    if (el.scrollTop > 0) {
      if (pullDistanceRef.current > 0) releasePull();
      return;
    }

    if (e.deltaY < 0) {
      e.preventDefault();
      setPulling(true);
      setPullDistance((currentPull) => Math.min(PULL_MAX, currentPull + (-e.deltaY * 0.5)));
      scheduleRelease();
    } else if (pullDistanceRef.current > 0) {
      releasePull();
    }
  }, [releasePull, scheduleRelease]);

  return (
    <div className="relative h-[calc(100dvh-4rem)] lg:h-screen bg-black">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 py-3 pointer-events-none">
        <h1 className="font-h1 text-h1 text-white drop-shadow pointer-events-auto">Shorts</h1>
      </div>

      {/* Reel */}
      {loading && shorts.length === 0 ? (
        <div className="h-full flex items-center justify-center text-white/60">
          <Icon name="progress_activity" className="animate-spin" size={32} />
        </div>
      ) : shorts.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-white/60 px-8 text-center">
          <Icon name="video_library" size={48} />
          <p className="text-body-lg">No shorts yet.</p>
          <button onClick={refresh} className="mt-2 text-primary font-bold">Refresh</button>
        </div>
      ) : (
        <div className="relative h-full">
          <div
            className="absolute left-1/2 top-4 z-30 -translate-x-1/2 transition-all duration-150 pointer-events-none"
            style={{
              opacity: pulling || refreshing ? 1 : 0,
              transform: `translateX(-50%) translateY(${Math.min(pullDistance, 40)}px) scale(${0.8 + pullProgress * 0.2})`,
            }}
          >
            <div className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-white backdrop-blur-sm border border-white/10">
              <Icon name="progress_activity" className="animate-spin" size={18} />
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={onScroll}
            onWheel={onWheel}
            className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-contain"
            style={{ touchAction: "pan-y" }}
          >
            {shorts.map((short, i) => {
              const inWindow = i >= current - BEHIND && i <= current + AHEAD;
              return (
                <div key={short.id} className="h-full w-full snap-start bg-black">
                  {inWindow ? (
                    <ShortCard short={short} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
                  ) : (
                    // Placeholder keeps the slot's height (so scrolling/snapping
                    // stays aligned) without loading a video.
                    <div className="h-full w-full" />
                  )}
                </div>
              );
            })}
            {hasMore && (
              <div ref={sentinelRef} className="h-24 flex items-center justify-center text-white/50 text-sm">
                {loadingMore ? "Loading more shorts…" : "Scroll for more"}
              </div>
            )}
            {!hasMore && shorts.length > 0 && (
              <div className="h-24 flex items-center justify-center text-white/40 text-sm">
                End of shorts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
