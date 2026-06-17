# KnOT — Decentralized Nostr Client

A full-featured decentralized microblog (Twitter/X-style) built on the **Nostr** protocol.

- **Backend** — a plain Python NIP-01 relay, storing events in SQLite and serving them over WebSocket.
- **Frontend** — a React + Vite + Tailwind CSS client. Keys live in the browser; every note is signed locally before publishing.

```
┌──────────────────────────┐     WebSocket (NIP-01)     ┌────────────────────┐
│  Frontend (React + Vite) │  ["EVENT"] / ["REQ"] ...   │  Python Relay      │
│  signs notes locally     │ ─────────────────────────► │  verify → SQLite   │
│  Primal-style UI         │ ◄───── ["EVENT"] live ──── │  ws://...:8765     │
└──────────────────────────┘                            └────────────────────┘
```

Also connects to public relays: **Damus**, **Primal**, **nos.lol** for global content.

---

## Quick Start

```bash
# 1. Python relay (terminal 1)
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python relay.py          # ws://127.0.0.1:8765

# 2. React frontend (terminal 2)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

---

## Features

### Authentication
- **Sign up** — generates a new keypair in the browser (never leaves the device)
- **Sign in** — import an existing `nsec` private key
- **NIP-07** — browser extension support (Alby, nos2x)
- Keys stored in `localStorage`, never sent to any server

### Home Feed
- **Global tab** — live posts from all relays
- **Following tab** — posts only from people you follow (NIP-02)
- **Collapsed composer** — "Say something on nostr…" pill expands into full editor with live note preview
- **Refresh feed** button + 30-second auto-refresh interval (fetch-then-stop, not a live stream)
- **Spam filtering** — blocks key dumps, base64 payloads, `[broadcast:]` routing spam, hashtag/URL bots, known spam domains, non-English posts

### Post (NoteCard)
- **Reply** — threaded reply with modal composer
- **Repost** — one-click repost (NIP-18)
- **Like** — reaction event (NIP-25, kind 7)
- **Zap** — Lightning tip via LNURL (NIP-57)
- **Bookmark** — save to kind-10003 list
- **Share** — modal with WhatsApp, Facebook, X (Twitter), LinkedIn, Instagram + copy nostr link + copy Event ID
- **Mute author** — adds to local mute list (kind-10000)
- **Sensitive content** — hidden with "Show" reveal button; media blurred for unfollowed authors
- **Click post** → opens Thread page

### Thread Page (`/note/:id`)
- Root post at top
- **❤️ Who liked** — avatar row, click any avatar to visit their profile, "See all" modal
- **🔁 Who reposted** — same
- **⚡ Who zapped** — same
- **💬 Replies** — threaded below

### Profile Page (`/profile/:pubkey`)
- Banner image (click → full-screen lightbox, corner-expand animation)
- Avatar (click → full-screen lightbox, **iris open/close** animation)
- Name, NIP-05 verified badge, bio, lightning address, website
- Following / Followers counts (clickable)
- **Notes / Replies / Highlights / Media** tabs
- Follow / Unfollow button
- Edit profile (own profile)
- View/copy keypair

### Notifications
- **Real-time** — permanent open subscription (unlike feed, stays live)
- **Unread badge** — purple count on bell icon in sidebar and mobile nav
- **Toast alerts** — slide-in popup for new events (emoji + name + action)
- **Notification types**: ❤️ Reactions, 🔁 Reposts, 💬 Replies, 👤 New Followers, ⚡ Zaps, 🔔 Mentions
- Click notification row → open post thread; click avatar → open profile

### Search (`/explore`)
- **Right sidebar** — live dropdown as you type: avatar + name + NIP-05 + follower count, click to navigate to profile
- **Explore page** — For You / Trending / People / Media tabs
- Search by name, handle, NIP-05, pubkey, or npub
- Paste `npub1…` or 64-char hex → jumps directly to profile

### Settings
- **Account** — view full npub, reveal/hide nsec, copy buttons
- **Appearance** — Midnight Wave (dark) / Ice Wave (light) theme toggle, persisted to localStorage
- **Muted Content** — manage muted users, words, hashtags, threads
- **Content Moderation** — toggle hide sensitive notes / blur media from strangers
- **Zaps** — set default zap amount with preset buttons (21 / 420 / 1000 / 5000 / 10000 / 100000 sats)
- **Network & Relays** — relay connection status
- **Notifications** — per-type toggles (Followers / Zaps / Reactions / Reposts / Replies / Mentions); unticking stops that subscription

### Relay Architecture
- Connects to **4 relays** simultaneously: local KnOT relay + Damus + Primal + nos.lol
- **RelayPool** deduplicates events by ID across all relays
- EOSE (End of Stored Events) handling: waits for ALL relays before closing subscription (with 3s safety timeout)
- Feed subscriptions close after EOSE (fetch-then-stop pattern)
- Notification subscription stays permanently open

---

## Nostr NIPs Implemented

| NIP | Description | Where |
|-----|-------------|-------|
| NIP-01 | Basic protocol — events, filters, WebSocket | `backend/relay.py`, `nostr/relay.js` |
| NIP-02 | Contact list (follows) | `nostr/events.js` `buildContacts()` |
| NIP-07 | Browser extension signing | `nostr/keys.js` |
| NIP-18 | Repost (kind 6) | `nostr/events.js` `buildRepost()` |
| NIP-19 | bech32 encoding (npub/nsec/note1) | `nostr/keys.js`, `nostr/format.js` |
| NIP-25 | Reactions (kind 7) | `nostr/events.js` `buildReaction()` |
| NIP-51 | Bookmarks (kind 10003), Mutes (kind 10000) | `nostr/events.js` |
| NIP-57 | Lightning Zaps (kind 9735) | `ZapModal.jsx` |

---

## Theme System

Two themes toggled from **Settings → Appearance**:

| Theme | Class | Description |
|-------|-------|-------------|
| Midnight Wave | (default dark) | Dark background, purple primary |
| Ice Wave | `html.theme-light` | Light background, same purple accents |

Theme is applied at app startup via `initTheme()` before first render to avoid flash.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS v4 + CSS variables |
| Routing | React Router v6 |
| Nostr crypto | `nostr-tools` (schnorr signing, NIP-19) |
| Backend | Python 3 + `websockets` + SQLite |
| State | React Context (NostrContext) |
