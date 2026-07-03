# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with three independent sub-projects:
- `client/` — React 19 + Capacitor 6 mobile app (iOS/Android), never deployed as web
- `client-admin/` — React 18 + Vite admin dashboard, runs at port 5174
- `server/` — NestJS 11 + TypeORM + PostgreSQL backend

### `client/` is a native mobile app — never a website

`client/` is exclusively a Capacitor iOS/Android app and will never be deployed as a website or need web-responsive support. All UI/UX work in `client/` must target native mobile design standards (safe areas via `env(safe-area-inset-*)`, edge-to-edge backgrounds with no seams in notch/home-indicator areas, touch-friendly hit targets) and must look correct on both iOS and Android devices. Do not propose web-only patterns, ask whether this is a web project, or hedge designs for desktop/browser use.

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
- Usernames are Instagram-style lowercase: `^[a-z0-9._]{3,30}$`, Turkish chars auto-transliterated. Single-source utils: `server/src/users/username.util.ts` + `client/utils/username.ts` (identical logic — never duplicate the regex/map elsewhere; see agent.md §41)

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

### Keyboard-avoidance (mandatory, app-wide)
- `useKeyboardScroll()` (`client/utils/useKeyboardScroll.ts`) is mounted **once** at the app root in `App.tsx`. It listens for `keyboardWillShow`/`keyboardWillHide` and `focusin`, and scrolls the currently focused input/textarea to `block: 'center'` whenever the keyboard opens or focus moves to another field while the keyboard is already visible.
- This is the **single source of truth** for keyboard-avoidance — do not add per-screen `onFocus` + `scrollIntoView` handlers, they would duplicate/conflict with this global behavior.
- `useKeyboardHeight()` (`client/utils/useKeyboardHeight.ts`) only reports the live keyboard height (px) for adjusting `paddingBottom` on scroll containers/footers so fixed bottom bars aren't covered when the keyboard is open. Use it on any full-screen form with a fixed footer.
- Every focusable input/textarea must sit inside a scrollable ancestor (`overflow-y-auto`) — `scrollIntoView` has no effect otherwise.

### Safe-area conventions for full-screen modals/views
- Any fixed header inside a full-screen modal or wizard step (e.g. time pickers, multi-step registration sub-views) must include `paddingTop: 'max(16px, env(safe-area-inset-top))'` so it doesn't sit under the iOS status bar/notch.
- Any fixed footer must include `paddingBottom: 'max(16px, env(safe-area-inset-bottom))'` so it doesn't sit under the iOS home-indicator.
- This applies to **every** fixed header/footer added inside `client/`, including sub-views/sub-headers of multi-step modals (not just the outermost one) — each gets its own safe-area padding since it can become the topmost/bottommost element on screen.
