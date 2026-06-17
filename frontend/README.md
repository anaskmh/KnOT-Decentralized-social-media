# KnOT — Frontend (React + Tailwind)

The KnOT web client: a decentralized social platform on Nostr, built to the
**"Obsidian Nexus"** design system (true-black, electric-purple, cyan/emerald
accents, Inter + JetBrains Mono). Keys live in the browser; every event is
signed locally and published to a pool of relays over WebSocket.

## Stack
React 18 · Vite · Tailwind CSS · react-router · nostr-tools. No backend calls —
the app talks straight to relays (NIP-01) over WebSocket.

## Folder layout
```
frontend/
  tailwind.config.js     # Obsidian Nexus tokens (colors, fonts, spacing)
  src/
    nostr/
      keys.js     events.js   relay.js   # identity · event builders · RelayPool
      format.js   dm.js       zap.js     # display helpers · NIP-04 · NIP-57
    context/NostrContext.jsx             # identity, relays, profiles, follows, bookmarks
    hooks/
      useFeed.js  useEngagement.js  useFollowCounts.js
    components/
      layout/  AppLayout LeftSidebar RightSidebar MobileNav
      ui/      Icon Avatar DisplayName Header NoteContent
      Composer NoteCard Feed ComposeModal ReplyModal ZapModal
      EditProfileModal DMBubble RelayMesh ErrorBoundary
    pages/
      Home Explore Notifications Messages Bookmarks Relays Profile Login
```

## Setup & run
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```
Start the relay first (see ../backend/README.md): `cd ../backend/relay && python3 server.py`.

## Screens & what's wired (all real Nostr)
| Screen | Functionality |
|--------|---------------|
| **Login** | Generate / import an identity (npub/nsec, NIP-19) |
| **Home** | Compose (kind 1), live Global + Following feeds |
| **Note actions** | Reply (NIP-10), repost (NIP-18), like (NIP-25), zap (NIP-57), bookmark (NIP-51), share |
| **Profile** | kind-0 metadata, edit profile, follow/unfollow (NIP-02), live follower/following counts, tabs |
| **Explore** | Search notes/hashtags/npubs, live trending hashtags |
| **Messages** | Encrypted DMs (NIP-04) — encrypt out, decrypt in |
| **Notifications** | Replies / reposts / likes / zaps that reference you |
| **Bookmarks** | Your saved notes (NIP-51 kind 10003) |
| **Relays** | Live mesh graph, measured latency, health, add/remove relays |
| **Wallet** | Nostr Wallet Connect (NIP-47): connect via NWC string, live balance, Receive (make invoice), Send (pay invoice), real transaction history |

## Relay pool
Connects to 4 relays by default — **KnOT** (`ws://127.0.0.1:8765`), **Damus**,
**Primal**, **nos.lol** — and de-duplicates events by id. Manage them on the
Relays screen.
