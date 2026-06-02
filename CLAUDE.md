# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with three independent sub-projects:
- `client/` — React 19 + Capacitor 6 mobile app (iOS/Android), never deployed as web
- `client-admin/` — React 18 + Vite admin dashboard, runs at port 5174
- `server/` — NestJS 11 + TypeORM + PostgreSQL backend

## Commands

### Server
```
cd server
npm run start:dev      # Watch mode
npm run build          # Production build
npm run lint           # ESLint fix
npm test               # Jest unit tests
npm run test:e2e       # E2E tests
```

### Client (mobile)
```
cd client
npm run dev            # Vite dev server
npm run build          # Web build (prerequisite for Capacitor)
npx cap sync           # Sync web build to native
npx cap build ios      # Open Xcode
npx cap build android  # Open Android Studio
```

### Client-Admin
```
cd client-admin
npm run dev            # Dev server at :5174
npm run build          # Production build
```

## Architecture

### Auth — Two separate JWT strategies
- **User JWT** (`JwtAuthGuard`): secret=`JWT_SECRET`, guards customer-facing routes
- **Admin JWT** (`AdminJwtAuthGuard`): secret=`ADMIN_JWT_SECRET`, 8h expiry, guards all `/admin/` routes
- Admin token carries `adminRole` field (`superadmin | admin | reviewer`) decoded from JWT payload

### Server module pattern
NestJS feature modules under `server/src/`. Each module follows entity → service → controller.
- Always use `AdminJwtAuthGuard` on admin endpoints; never mix with `JwtAuthGuard`
- `synchronize: true` in TypeORM config — new entity columns auto-create on server restart, no migrations needed
- Entities auto-loaded via `autoLoadEntities: true`
- `ValidationPipe(whitelist: true, transform: true)` applied globally in `main.ts`

### Chat system
- WebSocket gateway at `server/src/gateway/app.gateway.ts`; clients authenticate via `socket.handshake.auth.token`
- Each user joins their own room: `socket.join(userId)`; events emitted via `server.to(userId).emit(...)`
- 4 channel types: `DM | MATCH_GROUP | TEAM_INTERNAL | JOKER_NEGOTIATION`
- Chat ban enforced in `ChatService.sendMessage()` — checks `isChatBanned` and `chatBanExpiry`; auto-expires timed bans on the spot
- System messages (`isSystemMessage: true`) bypass the chat ban check

### Admin panel conventions
- All API calls via `adminApi` axios instance (`client-admin/src/services/adminApi.ts`)
- Auth token stored in `localStorage` under key `admin_token`
- UI: dark theme `bg-[#0f1827]` / `bg-[#1e2d47]`, text `text-[#dde8f5]` / `text-[#7b9ab8]`
- Icons: custom SVG components in `client-admin/src/components/Icons.tsx` — add new icons there
- Page pattern: hook (`useXxxPage.ts`) owns all API calls + state; component is pure UI
- Adding a page requires: new page component + hook, route in `App.tsx`, nav item in `Sidebar.tsx`

### Client (mobile) conventions
- API base URL hardcoded in `client/src/services/api.ts` — axios instance with Bearer token interceptor
- Auth persisted via `authStorage.ts` (Capacitor Preferences, not localStorage)
- Provider order in `App.tsx`: `AuthProvider → SocketProvider → LocationProvider → FilterProvider`
- Long-press on chat messages uses **native non-passive** `touchstart` listeners attached via `useEffect` — React's synthetic `onTouchStart` cannot call `e.preventDefault()` in React 17+ (passive by default)
