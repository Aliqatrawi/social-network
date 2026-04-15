# Waves - Social Network Platform

## Comprehensive Technical Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Backend](#4-backend)
5. [Frontend](#5-frontend)
6. [Real-Time Communication](#6-real-time-communication)
7. [Authentication & Security](#7-authentication--security)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Docker Deployment](#10-docker-deployment)
11. [Features](#11-features)
12. [Privacy & Access Control](#12-privacy--access-control)
13. [File Upload System](#13-file-upload-system)
14. [Testing Approach](#14-testing-approach)
15. [Project Structure](#15-project-structure)

---

## 1. Project Overview

**Waves** is a full-stack social network platform built as a group project. It supports user profiles, posts with privacy controls, a follower system, groups with events, real-time chat (private and group), notifications, and a rich text editor. The application is fully containerized with Docker.

### Key Capabilities

- User registration and authentication with session-based cookies
- Public and private user profiles with follow/request system
- Posts with three privacy levels (public, followers-only, selected users)
- Rich text content with image uploads
- Groups with membership management, invitations, join requests, and events
- Real-time private and group chat via WebSocket
- Real-time notifications via WebSocket with polling fallback
- Infinite scroll pagination across feed, notifications, and chat
- Responsive design with glass-morphism UI
- Docker containerization with nginx reverse proxy

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│                                                          │
│   Next.js 16 App (React 19) ── HeroUI ── Tailwind CSS  │
│         │              │                                 │
│    HTTP/REST       WebSocket                             │
│         │              │                                 │
└─────────┼──────────────┼────────────────────────────────┘
          │              │
          ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                  │
│                                                          │
│   /api/*  ────────► backend:8080                         │
│   /uploads/* ─────► backend:8080                         │
│   /ws ────────────► backend:8080 (WebSocket upgrade)     │
│   /* ─────────────► frontend:3000                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────┐
│   Go Backend │  │ Next.js SSR  │  │  SQLite   │
│   (net/http) │  │  (Node.js)   │  │ Database  │
│              │  │              │  │           │
│  Handlers    │  │  App Router  │  │ 20 tables │
│  WebSocket   │  │  RSC + CSR   │  │           │
│  Middleware   │  │  Standalone  │  │           │
└──────────────┘  └──────────────┘  └──────────┘
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend language | Go | Fast compilation, built-in HTTP server, low memory footprint, strong concurrency for WebSocket |
| Frontend framework | Next.js 16 (App Router) | Server-side rendering, file-based routing, React Server Components |
| Database | SQLite | Zero-config, single-file database, sufficient for project scope, no external service needed |
| Auth mechanism | Session cookies (HttpOnly) | Secure against XSS, works with SSR, simpler than JWT for a monolithic app |
| Real-time | WebSocket (gorilla/websocket) | Full-duplex, low latency for chat and notifications |
| UI library | HeroUI v2 | React Aria-based accessibility, dark mode support, Tailwind integration |
| Containerization | Docker Compose | Multi-service orchestration, reproducible environments |

### Communication Patterns

- **Client → Backend (REST):** All CRUD operations use JSON over HTTP with cookie-based auth
- **Client ↔ Backend (WebSocket):** Chat messages, typing indicators, and notification push
- **Frontend → Backend (SSR):** Next.js rewrites proxy `/api/*` to the backend during server-side rendering
- **Nginx → Services:** Reverse proxy routes requests to the appropriate container

---

## 3. Technology Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Go | 1.22 | Server language |
| net/http | stdlib | HTTP server and router (Go 1.22 pattern matching) |
| gorilla/websocket | v1.5 | WebSocket connections |
| golang-migrate | v4 | Database schema migrations |
| mattn/go-sqlite3 | latest | SQLite driver (CGO) |
| google/uuid | v1 | UUID generation |
| golang.org/x/crypto | latest | bcrypt password hashing |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | React framework (App Router) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| HeroUI | 2.8.9 | Component library (React Aria-based) |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.34.3 | Animations and transitions |
| TipTap | 3.20.0 | Rich text editor |
| DOMPurify | 3.3.1 | HTML sanitization (XSS prevention) |
| next-themes | 0.4.6 | Dark/light mode |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker | Container runtime |
| Docker Compose | Multi-service orchestration |
| Nginx (Alpine) | Reverse proxy, WebSocket upgrade, static routing |

---

## 4. Backend

### Server Initialization (`server.go`)

The entry point initializes the following in order:

1. **Database** — Opens SQLite, runs all migrations via `golang-migrate`
2. **Upload directories** — Creates `./uploads/avatars/` and `./uploads/images/`
3. **Handlers** — Instantiates all handler structs with DB dependency injection
4. **WebSocket Hub** — Creates the Hub (connection registry), Throttler (rate limiter), and WS Handler
5. **Router** — Registers 50+ routes using Go 1.22's `mux.HandleFunc("METHOD /path", handler)` syntax
6. **Middleware** — Wraps the router with CORS middleware
7. **Listener** — Starts HTTP server on configurable `PORT` (default 8080)

### Handler Architecture

Each feature domain has its own handler struct that receives the `*sql.DB` via constructor injection:

```
pkg/handlers/
├── auth.go           Register, Login, Logout
├── user.go           GetUser, UpdateProfile, Search
├── follow.go         Follow, Unfollow, Accept/Decline requests
├── post.go           CRUD posts, reactions, feed queries
├── comment.go        CRUD comments with image support
├── group.go          Groups, memberships, invitations, join requests
├── event.go          Group events, RSVP, respondent lists
├── notification.go   CRUD notifications, unread counts
└── upload.go         Generic file upload
```

### Middleware

**Authentication** (`pkg/middleware/auth.go`):
- `RequireAuth(db, handlerFunc)` wraps protected endpoints
- Reads `session_id` from HTTP cookie
- Queries the `sessions` table for a valid, non-expired session
- Loads the full `User` record and injects it into `r.Context()`
- Helper: `GetUserFromContext(r)` retrieves the authenticated user

**CORS** (`pkg/middleware/cors.go`):
- Configurable origin via `CORS_ORIGIN` environment variable (default: `http://localhost:3000`)
- Allows methods: GET, POST, PUT, DELETE, OPTIONS
- Allows headers: Content-Type, Authorization
- Credentials: enabled (required for cookie-based auth)
- Handles preflight OPTIONS requests

### Chat Service (`pkg/chat/`)

The chat system is split into three layers:

```
pkg/chat/
├── service.go    Business logic (access control, permission checks)
├── repo.go       Database operations (queries, inserts, reads)
└── handlers.go   HTTP handlers for REST endpoints
```

**Access Control Rules:**
- **Private chat:** Allowed if at least one user follows the other (status = 'accepted')
- **Group chat:** Allowed if user is a group member
- **After unfollow:** Users can read existing message history but cannot send new messages

**Conversation Model:**
- Private conversations enforce `user1_id < user2_id` for deterministic ordering
- Group conversations use `group:{groupId}` as the conversation ID
- Each conversation tracks `lastMessage` and per-user `unreadCount`

### WebSocket System (`pkg/ws/`)

```
pkg/ws/
├── hub.go            Connection registry (user→clients, room→clients)
├── handler.go        WS upgrade, message routing, chat integration
├── client.go         Client interface and base implementation
├── gorilla_client.go Gorilla WebSocket client implementation
├── auth.go           Cookie-based WS authentication
└── throttle.go       Per-user rate limiter
```

**Hub** — Central registry managing:
- `userClients map[string][]*Client` — All connections per user (supports multiple tabs)
- `rooms map[string][]*Client` — Room memberships (one room per conversation)
- Methods: `SendToUser()`, `BroadcastRoom()`, `IsOnline()`

**Connection Lifecycle:**
1. Client connects to `GET /ws`
2. `auth.go` validates `session_id` cookie, extracts `userID`
3. Client registered in Hub, auto-joined to all group rooms they belong to
4. Read loop processes incoming JSON messages
5. Messages are rate-limited (20 per 5 seconds per user)
6. On disconnect, client removed from Hub and all rooms

**Message Types:**
- `chat_message` — Routes to `handleChatMessage()`, stored in DB, broadcast to participants
- `typing` — Routes to `handleTyping()`, forwarded to conversation participants
- `notification` — Server-originated push to specific user

---

## 5. Frontend

### Application Structure

The frontend uses Next.js 16 App Router with two route groups:

```
src/app/
├── (auth)/              # Public routes (login, register)
│   ├── layout.tsx       # Decorative auth layout
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/               # Protected routes (requires authentication)
│   ├── layout.tsx       # App shell: sidebar, auth guard, background
│   ├── feed/page.tsx
│   ├── chat/page.tsx
│   ├── profile/page.tsx
│   ├── profile/[id]/page.tsx
│   ├── search/page.tsx
│   ├── notifications/page.tsx
│   ├── groups/page.tsx
│   └── groups/[id]/page.tsx
├── layout.tsx           # Root layout (fonts, providers)
├── page.tsx             # Landing page (public)
├── providers.tsx        # Context provider tree
├── error.tsx            # Global error boundary
└── globals.css          # Tailwind + custom glass styles
```

### State Management

Three React Context providers manage global state:

**AuthContext:**
- State: `user`, `isLoading`, `isAuthenticated`
- Actions: `login()`, `logout()`, `refresh()`, `updateUser()`
- On mount: Calls `getCurrentUser()` to validate session cookie
- Dev mode: Supports `NEXT_PUBLIC_DEV_AUTH=true` with mock user for frontend-only development

**ChatContext:**
- State: `unreadCount`, `activeConversationId`
- Actions: `refresh()`, `onNewMessage()`, `setActiveConversationId()`
- Polls unread count every 30 seconds
- Listens on WebSocket for incoming messages
- Shows toast notification for new messages (when not viewing that conversation)

**NotificationContext:**
- State: `unreadCount`
- Actions: `refresh()`, `onNewNotification()`
- Polls unread count every 15 seconds
- Listens on WebSocket for real-time notification push
- Subscriber pattern for component-level listeners

### Component Architecture

80+ components organized by feature domain:

| Domain | Count | Key Components |
|--------|-------|---------------|
| Feed | 8 | PostCard, PostComposer, FeedList, CommentSection, ReactionBar, PrivacySelector |
| Chat | 7 | MessageThread, MessageBubble, MessageInput, ConversationList, ConversationItem |
| Profile | 9 | ProfileHeader, ProfileStats, FollowButton, EditProfileModal, ActivityTimeline |
| Groups | 12 | GroupList, GroupCard, MemberList, EventList, EventCard, InviteMemberModal |
| Notifications | 2 | NotificationList, NotificationItem |
| Editor | 4 | RichTextEditor, EditorToolbar, ImageBubbleMenu, RichTextRenderer |
| Sidebar | 3 | Sidebar, SidebarNavItem, MobileBottomBar |
| Skeletons | 11 | Loading placeholders for every major component |
| Landing | 5 | FeatureCards, HeroIllustration, StatsSection, WaveBackground |

### API Client (`src/lib/api.ts`)

Central HTTP client with ~960 lines covering all endpoints:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function apiClient<T>(endpoint, options?): Promise<ApiResponse<T>> {
  // Automatically includes credentials (cookies)
  // Handles JSON parsing and error extraction
  // Returns { data?: T, error?: string, status: number }
}
```

Every endpoint function has a `DEV_AUTH` fallback that imports mock data for frontend-only development without a backend.

### Styling

- **Tailwind CSS v4** with utility-first approach
- **Glass-morphism** effect via custom CSS classes:
  - `.glass-card` — `backdrop-blur`, `backdrop-saturate`, semi-transparent gradient
  - `.glass-sidebar` — Sidebar-specific blur
- **Dark mode** via `next-themes` with class strategy
- **Ambient background** — SVG with radial gradient blobs and flowing wave strokes
- **Custom toast styling** — Glass effect with colored left border stripe
- **Responsive breakpoints** — Desktop sidebar (`lg:flex`), mobile bottom bar (`lg:hidden`)

### Rich Text Editor

Built on TipTap (ProseMirror-based):

- **Extensions:** StarterKit, Image, Placeholder, Underline
- **Toolbar:** Bold, italic, underline, headings (H1-H3), bullet list, code block, image upload, link
- **Output:** HTML content stored with `contentFormat: "html"`
- **Rendering:** `RichTextRenderer` component uses DOMPurify for XSS sanitization
- **Image insertion:** Uploads via `/api/upload`, inserts URL into editor

### Infinite Scroll

Implemented using `IntersectionObserver` pattern:

```typescript
// Sentinel element at bottom of list
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting && hasMore) loadMore(); },
    { rootMargin: "200px" }  // Pre-fetch 200px before visible
  );
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [hasMore]);
```

Used in: Feed (PAGE_SIZE=10), Notifications (PAGE_SIZE=20), Chat Messages (PAGE_SIZE=30)

---

## 6. Real-Time Communication

### WebSocket Protocol

**Connection:**
```
ws://hostname/ws
Cookie: session_id=<uuid>
```

**Client → Server Messages:**

```json
// Chat message
{ "type": "chat_message", "conversationId": "uuid", "content": "Hello!" }

// Typing indicator
{ "type": "typing", "conversationId": "uuid" }
```

**Server → Client Messages:**

```json
// Chat message (broadcast)
{
  "type": "chat_message",
  "payload": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "content": "Hello!",
    "createdAt": "2026-03-28T...",
    "sender": { "firstName": "Hassan", "lastName": "Ali", "avatarUrl": "..." }
  }
}

// Typing indicator
{ "type": "typing", "payload": { "conversationId": "uuid", "userId": "uuid" } }

// Notification push
{
  "type": "notification",
  "payload": {
    "notification": { "id": "uuid", "type": "like", "message": "...", ... },
    "unreadCount": 5
  }
}
```

### Rate Limiting

The WebSocket Throttler limits each user to **20 messages per 5-second window**. Excess messages are silently dropped. The throttler maintains a per-user timestamp history, filtering expired entries on each check.

### Reconnection Strategy

The frontend `ChatSocket` class auto-reconnects after 1200ms on connection close. It maintains a subscriber set and re-registers all listeners after reconnection.

### Fallback Mechanisms

- **Chat:** If WebSocket is not connected, `sendMessage()` falls back to HTTP POST `/api/chat/messages`
- **Notifications:** Polls `/api/notifications/unread-count` every 15 seconds regardless of WebSocket state
- **Unread chat:** Polls `/api/chat/unread-count` every 30 seconds

---

## 7. Authentication & Security

### Session-Based Authentication

```
Registration/Login
       │
       ▼
  Backend creates session (UUID, 7-day TTL)
  Stores in `sessions` table
       │
       ▼
  Sets HTTP cookie: session_id=<uuid>
  Flags: HttpOnly, SameSite=Lax, Path=/
       │
       ▼
  All subsequent requests include cookie
  RequireAuth middleware validates on each request
```

**Session Properties:**
- ID: UUID v4
- TTL: 7 days from creation
- Storage: `sessions` table in SQLite
- Cookie flags: `HttpOnly` (no JS access), `SameSite=Lax`, `Path=/`

### Password Security

- Hashed using **bcrypt** (`golang.org/x/crypto/bcrypt`)
- Default cost factor (10 rounds)
- Raw password never stored or logged

### Frontend Validation

Registration enforces:
- Email format (regex)
- Password: 8+ characters, must contain uppercase, lowercase, digit, special character
- Password strength meter with score (0-100) and labels (Weak/Fair/Good/Strong)
- Date of birth: must be in the past, age under 120
- Username: 3-20 characters, alphanumeric + underscore only

### XSS Prevention

- Rich text content rendered through **DOMPurify** sanitization
- HTML stripped of dangerous tags/attributes before DOM insertion
- User-generated content never inserted via `dangerouslySetInnerHTML` without sanitization

### CORS Configuration

- Origin restricted to configured value (default: `http://localhost:3000`)
- Credentials mode enabled for cookie transmission
- Configurable via `CORS_ORIGIN` environment variable
- Behind nginx reverse proxy, all requests are same-origin (no CORS needed)

### Access Control

- All protected routes wrapped with `RequireAuth` middleware
- Frontend `(app)/layout.tsx` redirects unauthenticated users to `/login`
- Post visibility enforced at query level (see Privacy section)
- Group content restricted to members
- Chat access requires mutual follow or existing history

---

## 8. Database Schema

SQLite database with 20 sequential migrations. All tables use UUID text primary keys.

### Entity Relationship Overview

```
users ──────┬──── sessions
            │
            ├──── followers (follower_id, following_id, status)
            │
            ├──── posts ──────┬──── post_visibility (private post access)
            │                 ├──── post_reactions (like/dislike)
            │                 └──── comments
            │
            ├──── groups ─────┬──── group_members
            │                 ├──── group_invitations
            │                 ├──── events ──── event_responses
            │                 ├──── group posts (posts.group_id)
            │                 └──── group_messages
            │
            ├──── notifications
            │
            └──── private_conversations ──── private_messages
```

### Table Details

| Table | Key Columns | Constraints |
|-------|------------|-------------|
| `users` | id, email, password_hash, first_name, last_name, date_of_birth, username, about_me, avatar_url, banner_url, is_public | UNIQUE(email), UNIQUE(username) |
| `sessions` | id, user_id, expires_at | FK(user_id) |
| `followers` | follower_id, following_id, status | UNIQUE(follower_id, following_id), status IN (pending, accepted) |
| `posts` | id, user_id, title, content, image_url, privacy_level, content_format, group_id | FK(user_id), FK(group_id) |
| `post_visibility` | post_id, user_id | UNIQUE(post_id, user_id), used for "private" posts |
| `post_reactions` | post_id, user_id, reaction | UNIQUE(post_id, user_id), CHECK(reaction IN ('like','dislike')) |
| `comments` | id, post_id, user_id, content, image_url | FK(post_id), FK(user_id) |
| `groups` | id, name, description, creator_id, image_url | FK(creator_id) |
| `group_members` | group_id, user_id, role | UNIQUE(group_id, user_id), role IN (creator, member) |
| `group_invitations` | group_id, user_id, invited_by_id, status | UNIQUE(group_id, user_id) |
| `events` | id, group_id, title, description, date_time, created_by_id | FK(group_id) |
| `event_responses` | event_id, user_id, response | UNIQUE(event_id, user_id), response IN (going, not_going) |
| `notifications` | id, user_id, type, title, message, related_user_id, group_id, event_id, is_read | 14 notification types |
| `private_conversations` | id, user1_id, user2_id | UNIQUE(user1_id, user2_id), CHECK(user1_id < user2_id) |
| `private_messages` | id, conversation_id, sender_id, receiver_id, content, is_read | FK(conversation_id) |
| `group_messages` | id, group_id, sender_id, content | FK(group_id) |

### Migration History

| # | Name | Description |
|---|------|-------------|
| 001 | create_users | Users table with profile fields |
| 002 | create_sessions | Session-based auth |
| 003 | create_followers | Follow system with pending/accepted |
| 004 | create_posts | Posts + post_visibility for private access |
| 005 | create_comments | Comments on posts |
| 006 | create_groups | Groups + group_id on posts |
| 007 | create_group_members | Group membership with roles |
| 008 | create_group_invitations | Group invitation system |
| 009 | create_events | Group events |
| 010 | create_event_responses | Event RSVP |
| 011 | create_notifications | Notification system |
| 012 | add_title_to_posts | Post title field |
| 013 | create_post_reactions | Like/dislike reactions |
| 014 | add_post_id_to_notifications | Link notifications to posts |
| 015 | add_content_format | Rich text format flag |
| 017 | create_private_conversations | Private chat conversations |
| 018 | create_private_messages | Private chat messages |
| 019 | create_group_messages | Group chat messages |
| 020 | add_image_url_to_groups | Group cover images |

---

## 9. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | No | Register new user (multipart form with optional avatar) |
| POST | `/api/login` | No | Login with email/password, returns session cookie |
| POST | `/api/logout` | Yes | Invalidate session |
| GET | `/api/me` | Yes | Get current authenticated user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/{userId}` | Yes | Get user profile with stats |
| PUT | `/api/user/profile` | Yes | Update own profile |
| GET | `/api/users` | Yes | List all users |
| GET | `/api/search?q=term` | Yes | Search users, posts, groups |

### Follow System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/user/{userId}/follow` | Yes | Follow user (instant for public, pending for private) |
| DELETE | `/api/user/{userId}/follow` | Yes | Unfollow user |
| GET | `/api/user/{userId}/followers` | Yes | Get user's followers |
| GET | `/api/user/{userId}/following` | Yes | Get who user follows |
| GET | `/api/follow-requests` | Yes | Get incoming follow requests |
| GET | `/api/follow-requests/sent` | Yes | Get outgoing follow requests |
| POST | `/api/follow-requests/{requesterId}/accept` | Yes | Accept follow request |
| POST | `/api/follow-requests/{requesterId}/decline` | Yes | Decline follow request |
| DELETE | `/api/follow-requests/{userId}/cancel` | Yes | Cancel sent request |

### Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/posts` | Yes | Create post (multipart form) |
| GET | `/api/posts?limit=N&offset=N` | Yes | Get feed with pagination |
| GET | `/api/posts/{postId}` | Yes | Get single post |
| DELETE | `/api/posts/{postId}` | Yes | Delete own post |
| POST | `/api/posts/{postId}/react` | Yes | Like or dislike post |
| GET | `/api/user/{userId}/activities` | Yes | Get user's activity feed |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/posts/{postId}/comments` | Yes | Add comment (multipart, optional image) |
| GET | `/api/posts/{postId}/comments` | Yes | Get post comments |
| DELETE | `/api/comments/{commentId}` | Yes | Delete own comment |

### Groups

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/groups` | Yes | Create group |
| GET | `/api/groups` | Yes | List all groups |
| GET | `/api/groups/my` | Yes | List groups user belongs to |
| GET | `/api/groups/{groupId}` | Yes | Get group details |
| POST | `/api/groups/{groupId}/join` | Yes | Request to join |
| POST | `/api/groups/{groupId}/leave` | Yes | Leave group |
| POST | `/api/groups/{groupId}/invite` | Yes | Invite user |
| POST | `/api/groups/{groupId}/accept-invitation` | Yes | Accept invitation |
| POST | `/api/groups/{groupId}/decline-invitation` | Yes | Decline invitation |
| GET | `/api/groups/{groupId}/members` | Yes | List members |
| DELETE | `/api/groups/{groupId}/members/{memberId}` | Yes | Kick member (creator only) |
| GET | `/api/groups/{groupId}/join-requests` | Yes | List join requests |
| POST | `/api/groups/{groupId}/join-requests/{requestId}/accept` | Yes | Accept join request |
| POST | `/api/groups/{groupId}/join-requests/{requestId}/decline` | Yes | Decline join request |

### Group Posts & Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/groups/{groupId}/posts` | Yes | Create group post |
| GET | `/api/groups/{groupId}/posts` | Yes | Get group posts |
| POST | `/api/groups/{groupId}/events` | Yes | Create event |
| GET | `/api/groups/{groupId}/events` | Yes | List events |
| POST | `/api/events/{eventId}/rsvp` | Yes | RSVP to event |
| GET | `/api/events/{eventId}/respondents` | Yes | Get going/not going users |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications?limit=N&offset=N` | Yes | Get notifications |
| GET | `/api/notifications/unread-count` | Yes | Get unread count |
| PUT | `/api/notifications/{id}/read` | Yes | Mark as read |
| PUT | `/api/notifications/read-all` | Yes | Mark all as read |
| DELETE | `/api/notifications/{id}` | Yes | Delete notification |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chat/conversations` | Yes | List conversations |
| POST | `/api/chat/conversations/private/{userId}` | Yes | Get or create private conversation |
| GET | `/api/chat/conversations/{id}/messages?limit=N&offset=N` | Yes | Get messages |
| POST | `/api/chat/messages` | Yes | Send message (HTTP fallback) |
| PUT | `/api/chat/conversations/{id}/read` | Yes | Mark conversation as read |
| GET | `/api/chat/unread-count` | Yes | Get total unread messages |

### File Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | Yes | Upload image file (max 10MB) |

---

## 10. Docker Deployment

### Container Architecture

```
docker-compose.yml
├── backend     (Go API + WebSocket server)
├── frontend    (Next.js standalone production server)
└── nginx       (Reverse proxy on port 80)
```

### Docker Compose Configuration

```yaml
services:
  backend:
    build: ./backend
    environment:
      PORT: 8080
      DB_PATH: /app/data/social_network.db
      CORS_ORIGIN: http://localhost
    volumes:
      - db-data:/app/data       # Persistent SQLite database
      - uploads:/app/uploads     # Persistent uploaded files

  frontend:
    build: ./frontend
    environment:
      BACKEND_INTERNAL_URL: http://backend:8080
    depends_on: [backend]

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: [backend, frontend]

volumes:
  db-data:    # SQLite database persistence
  uploads:    # User-uploaded files persistence
```

### Build Process

**Backend Dockerfile (multi-stage):**
1. **Build stage** (`golang:1.22-alpine`): Compiles Go binary with CGO enabled (required for SQLite)
2. **Runtime stage** (`alpine:3.20`): Copies binary + migrations only (~15MB image)

**Frontend Dockerfile (multi-stage):**
1. **Deps stage** (`node:20-alpine`): Installs npm dependencies
2. **Build stage**: Runs `next build` with `output: "standalone"`
3. **Runtime stage** (`node:20-alpine`): Copies standalone server + static assets (~150MB image)

### Nginx Configuration

```nginx
# WebSocket upgrade for /ws
location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;  # 24-hour timeout for long-lived connections
}

# API and uploads → backend
location /api/    { proxy_pass http://backend; }
location /uploads/ { proxy_pass http://backend; }

# Everything else → frontend
location / { proxy_pass http://frontend; }
```

### Running

```bash
# Build and start all services
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

Access the application at `http://localhost` after startup.

### Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | backend | 8080 | HTTP listen port |
| `DB_PATH` | backend | ./social_network.db | SQLite database file path |
| `CORS_ORIGIN` | backend | http://localhost:3000 | Allowed CORS origin |
| `BACKEND_INTERNAL_URL` | frontend | http://localhost:8080 | Backend URL for SSR rewrites |
| `NEXT_PUBLIC_API_URL` | frontend | http://localhost:8080 | Client-side API base URL (empty = relative) |
| `NEXT_PUBLIC_DEV_AUTH` | frontend | (empty) | Set to "true" for mock auth |

---

## 11. Features

### User Management
- Registration with email, password, name, date of birth, username, optional avatar
- Login/logout with persistent sessions (7-day TTL)
- Profile editing (name, username, about, avatar, banner)
- Public/private profile toggle
- Profile page shows: name, username, email, date of birth, about, avatar, banner, follower/following counts, activity timeline

### Follow System
- Follow public profiles instantly
- Follow private profiles via request (pending → accepted/declined)
- Notifications sent for: follow request, request accepted, new follower
- Cancel outgoing follow requests
- Unfollow removes the relationship

### Posts
- Create posts with title, rich text content (HTML), optional image, tags
- Three privacy levels:
  - **Public** — visible to everyone
  - **Almost Private** — visible to accepted followers only
  - **Private** — visible only to author and selected followers
- Like and dislike reactions (one per user, togglable)
- Comments with optional image attachments
- Delete own posts
- Feed with infinite scroll pagination

### Groups
- Create groups with name, description, cover image
- Membership system with roles (creator, member)
- Join request workflow (request → creator accepts/declines)
- Invitation system with tabs (Following / All Users)
- Group posts (separate from main feed)
- Group events with RSVP (going / not going)
- View event respondents with user details
- Kick members (creator only)
- Leave group

### Chat
- Private messaging (1-on-1)
- Group messaging (tied to group membership)
- Real-time delivery via WebSocket
- Typing indicators
- Message history with pagination (load older messages)
- Unread count badges per conversation and globally
- Conversation list with last message preview
- Mark conversations as read on open and on new message while viewing

### Notifications
14 notification types:

| Type | Trigger |
|------|---------|
| `follow_request` | Someone requests to follow you |
| `follow_accepted` | Your follow request was accepted |
| `follow_declined` | Your follow request was declined |
| `new_follower` | Someone followed your public profile |
| `comment` | Someone commented on your post |
| `like` | Someone liked your post |
| `dislike` | Someone disliked your post |
| `group_invitation` | You were invited to a group |
| `group_join_request` | Someone requested to join your group |
| `group_event` | New event in your group |
| `group_kicked` | You were removed from a group |
| `group_member_left` | A member left your group |
| `group_join_accepted` | Your join request was accepted |
| `group_invitation_declined` | Someone declined your invitation |

- Real-time push via WebSocket
- Infinite scroll pagination
- Mark individual or all as read
- Action buttons for follow requests (accept/decline)

### Search
- Global search across users, posts, and groups
- Results grouped by type
- User cards with follow button

---

## 12. Privacy & Access Control

### Profile Privacy

| Profile Type | Visible To | Follow Behavior |
|-------------|-----------|-----------------|
| Public | Everyone | Instant follow |
| Private | Followers + self | Follow request required |

Private profiles show limited info (name, avatar, public/private badge) to non-followers. Full profile, posts, followers/following lists, and activities are hidden behind a "This profile is private" gate.

### Post Privacy

| Level | `privacy_level` | Visible To | Comment Access |
|-------|-----------------|-----------|----------------|
| Public | `public` | All authenticated users | All authenticated users |
| Followers Only | `almost_private` | Author's accepted followers + author | Author's accepted followers + author |
| Selected Users | `private` | Selected users (via `post_visibility` table) + author | Selected users + author |

**Feed Query Logic (SQL):**
```sql
WHERE p.group_id IS NULL AND (
    p.privacy_level = 'public'
    OR p.user_id = :currentUser
    OR (p.privacy_level = 'almost_private' AND EXISTS (
        SELECT 1 FROM followers
        WHERE follower_id = :currentUser AND following_id = p.user_id AND status = 'accepted'
    ))
    OR (p.privacy_level = 'private' AND EXISTS (
        SELECT 1 FROM post_visibility
        WHERE post_id = p.id AND user_id = :currentUser
    ))
)
```

### Chat Access Control

| Scenario | Can Chat? | Can Read History? |
|----------|----------|------------------|
| Mutual follow | Yes | Yes |
| One-way follow | Yes | Yes |
| No follow relationship | No | No |
| Unfollowed after chatting | No (new messages) | Yes (existing history) |
| Group member | Yes (group chat) | Yes |
| Left group | No | No |

### Group Access Control

| Action | Who Can Do It |
|--------|--------------|
| Create group | Any authenticated user |
| View group details | Any authenticated user |
| View group posts/events | Members only |
| Create group post | Members only |
| Create event | Members only |
| Invite users | Members |
| Accept/decline join requests | Creator |
| Kick members | Creator |
| Delete group | Creator |

---

## 13. File Upload System

### Upload Flow

```
Client (FormData with "file" field)
    │
    ▼
POST /api/upload (RequireAuth)
    │
    ├── Validate file type (JPEG, PNG, GIF, WebP)
    ├── Validate size (max 10MB)
    ├── Generate UUID filename
    ├── Save to ./uploads/images/
    │
    ▼
Response: { "url": "/uploads/images/uuid.ext" }
```

### Upload Contexts

| Context | Endpoint | Destination | Max Size |
|---------|----------|------------|----------|
| Generic upload | `POST /api/upload` | `./uploads/images/` | 10MB |
| Registration avatar | `POST /api/register` | `./uploads/avatars/` | 10MB |
| Post image | `POST /api/posts` | `./uploads/images/` | 10MB |
| Comment image | `POST /api/posts/{id}/comments` | `./uploads/images/` | 10MB |
| Group image | Via `/api/upload` first | `./uploads/images/` | 10MB |

### Supported File Types

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

### Docker Persistence

Uploaded files are stored in a Docker volume (`uploads`) mounted at `/app/uploads`, ensuring they persist across container restarts.

---

## 14. Testing Approach

### Manual Testing

The project was tested manually across multiple browsers to verify:

- Registration with duplicate email/username detection
- Authentication persistence and session expiration
- Cross-browser session isolation (logged-in vs. logged-out)
- Profile information completeness (all registration fields displayed)
- Post privacy enforcement across user accounts
- Follow request/accept/decline flows with notifications
- Group creation, joining, inviting, leaving workflows
- Chat message delivery and read receipts
- Notification real-time delivery
- Infinite scroll pagination
- File upload and display
- Responsive layout (desktop sidebar vs. mobile bottom bar)

### Dev Mode

Setting `NEXT_PUBLIC_DEV_AUTH=true` enables frontend-only development:
- Mock user auto-authenticated
- All API calls return mock data
- Chat includes auto-reply simulation with typing indicator
- No backend required

---

## 15. Project Structure

```
social-network/
├── backend/
│   ├── server.go                    # Entry point, routing, initialization
│   ├── Dockerfile                   # Multi-stage Go build
│   ├── .dockerignore
│   ├── go.mod / go.sum              # Go dependencies
│   └── pkg/
│       ├── handlers/                # HTTP handlers (auth, user, post, comment,
│       │                            #   group, event, notification, follow, upload)
│       ├── models/                  # Data models and types
│       ├── middleware/              # CORS, auth middleware
│       ├── db/
│       │   └── migrations/sqlite/  # 20 SQL migration files
│       ├── chat/                    # Chat service, repository, HTTP handlers
│       ├── ws/                      # WebSocket hub, client, handler, throttler
│       └── utils/                   # JSON response helpers, password hashing
│
├── frontend/
│   ├── Dockerfile                   # Multi-stage Next.js build
│   ├── .dockerignore
│   ├── next.config.ts               # Standalone output, API rewrites
│   ├── package.json
│   └── src/
│       ├── app/                     # Next.js App Router pages
│       │   ├── (auth)/              # Login, Register
│       │   ├── (app)/               # Feed, Chat, Profile, Groups, etc.
│       │   ├── providers.tsx        # Context provider tree
│       │   └── globals.css          # Tailwind + glass effects
│       ├── components/              # 80+ React components
│       │   ├── feed/                # Posts, comments, reactions
│       │   ├── chat/                # Conversations, messages
│       │   ├── profile/             # User profiles
│       │   ├── groups/              # Groups, events, members
│       │   ├── notifications/       # Notification list
│       │   ├── editor/              # Rich text (TipTap)
│       │   ├── sidebar/             # Navigation
│       │   └── skeletons/           # Loading placeholders
│       ├── context/                 # AuthContext, ChatContext, NotificationContext
│       ├── hooks/                   # useChatRealtime, useMockChat
│       └── lib/                     # api.ts, chatSocket.ts, toast.ts, validators.ts
│
├── docker/
│   └── nginx.conf                   # Reverse proxy configuration
│
├── docker-compose.yml               # Service orchestration
└── Documentation.md                 # This file
```
