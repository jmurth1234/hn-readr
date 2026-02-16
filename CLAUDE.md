# CLAUDE.md

## Project Overview

hn-readr is a read-only Hacker News client built with React Native, Expo SDK 54, and TypeScript. It targets iOS, Android, and web. The app is read-only — there is no authentication or write functionality.

## Commands

- `yarn install` — Install dependencies (uses Yarn, not npm)
- `yarn start` — Start Expo dev server
- `yarn ios` / `yarn android` / `yarn web` — Run on specific platform
- `yarn test` — Run Jest tests
- `yarn test:watch` — Run tests in watch mode
- `yarn test:coverage` — Run tests with coverage
- `yarn lint` — Run ESLint
- `yarn format` — Format with Prettier
- `yarn format:check` — Check formatting

## Architecture

### Routing

File-based routing via Expo Router. Routes live in `app/`:

- `app/(tabs)/` — Bottom tab screens (Top, New, Best, Ask, Search)
- `app/story/[id].tsx` — Story detail with comments (dynamic route)
- `app/_layout.tsx` — Root layout with providers
- `app/(tabs)/_layout.tsx` — Tab bar configuration

### Data Layer

`lib/hn-api.ts` contains `HackerNewsClient`, a singleton provided via React Context (`contexts/hn-client-context.tsx`). It fetches from two APIs:

- **Firebase REST API** (`hacker-news.firebaseio.com`) — Story lists and individual items
- **Algolia API** (`hn.algolia.com`) — Search and bulk comment fetching

The client includes LRU+TTL caching (30s TTL, 2000 entries), concurrency limiting via semaphore (8-15 parallel requests), automatic retries with exponential backoff, and 15s request timeouts.

### Key Patterns

- **State management**: React hooks + Context API only (no Redux/Zustand)
- **Infinite scroll**: `hooks/use-infinite-list.ts` handles pagination, pull-to-refresh, and loading states
- **Tablet layout**: `hooks/use-responsive.ts` detects tablets (width >= 768px), rendering `SplitView` (35/65 split) instead of standard navigation
- **Comment trees**: `lib/comment-tree.ts` builds trees from flat Algolia responses, with collapsible nodes and depth limiting (max 6 levels)
- **Theming**: Automatic light/dark via `hooks/use-color-scheme.ts`, colors defined in `constants/theme.ts`, applied through `ThemedView`/`ThemedText` components
- **Platform styles**: `constants/platform-styles.ts` provides cross-platform elevation, pressable feedback (ripple on Android, opacity on iOS), and spacing constants

### Component Organization

- `components/*-item.tsx` — List item renderers (StoryItem, CommentItem, BaseItem)
- `components/*-list.tsx` — List containers with FlatList (StoryList, SearchList, CommentThreadList)
- `components/adaptive-*.tsx` — Components that switch between mobile/tablet layouts
- `components/tablet/` — Tablet-specific components (SplitView)
- `components/themed-*.tsx` — Theme-aware base components
- `components/ui/` — UI utilities

### Performance

- `React.memo()` on list items (StoryItem, CommentItem, BaseItem)
- FlatList tuning: `initialNumToRender: 16`, `maxToRenderPerBatch: 24`, `windowSize: 9`, `removeClippedSubviews: true`
- Comments rendered as a flattened array in a single FlatList (not nested)
- React Compiler enabled (`experiments.reactCompiler: true` in app.json)

## Code Style

- TypeScript strict mode
- Prettier: semicolons, single quotes, trailing commas, 100 char width, 2-space indent
- ESLint: no `console`, prefer `const`, no `var`
- Path alias: `@/*` maps to project root (e.g., `@/lib/hn-api`)
- Functional components only, no class components
- Platform-specific files use `.web.ts` / `.ios.tsx` suffixes

## Testing

Tests live in `lib/__tests__/`. Framework is Jest with `jest-expo` preset. The `@/` path alias is mapped in `jest.config.js`.
