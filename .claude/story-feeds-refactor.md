# Story Feeds Refactor Documentation

## Overview

This document describes the refactoring of the HackerNews reader app to support multiple story feed tabs by extracting shared logic into reusable components.

## Architecture

### StoryList Component

The `StoryList` component (`/components/story-list.tsx`) is the core reusable component that handles:

- **State Management**: Stories, loading states, pagination, error handling
- **Data Fetching**: Uses HackerNewsClient with configurable feed types
- **UI Rendering**: FlatList with pull-to-refresh, infinite scroll, loading indicators
- **Navigation**: Handles story press events to navigate to detail view

#### Props
```typescript
interface StoryListProps {
  feedType: StoryFeedKind; // 'top' | 'new' | 'best' | 'ask' | 'show' | 'job'
  title?: string;
}
```

#### Key Features
- Automatic pagination with `onEndReached`
- Pull-to-refresh functionality
- Loading states (initial, refresh, load more)
- Error handling with user-friendly messages
- Responsive design with safe area handling

### Tab Structure

The app now supports 5 main tabs (mobile tab navigation limit):

1. **Top** (`/app/(tabs)/index.tsx`) - Front page stories (default HN top stories)
2. **New** (`/app/(tabs)/new.tsx`) - Latest submitted stories
3. **Best** (`/app/(tabs)/best.tsx`) - Highest scoring stories of all time
4. **Ask** (`/app/(tabs)/ask.tsx`) - Ask HN posts
5. **Search** (`/app/(tabs)/search/index.tsx`) - Search functionality (placeholder)

### Tab Layout Configuration

The tab layout (`/app/(tabs)/_layout.tsx`) defines:
- Tab labels and icons
- Navigation structure
- Platform-specific styling

## Implementation Details

### Data Flow

1. **Component Mount**: StoryList component mounts and calls `fetchStories(0)`
2. **API Call**: Uses HackerNewsClient.listStories(feedType, options)
3. **State Update**: Updates stories array and pagination state
4. **Render**: FlatList renders stories using StoryItem component
5. **User Interaction**: 
   - Pull to refresh → `handleRefresh()` → `fetchStories(0, true)`
   - Scroll to bottom → `handleLoadMore()` → `fetchStories(currentPage + 1)`
   - Story press → `handleStoryPress()` → Navigate to `/story/[id]`

### Error Handling

- Network errors are caught and displayed in user-friendly format
- Loading states prevent multiple simultaneous requests
- Empty states provide appropriate feedback

### Performance Considerations

- **Caching**: HackerNewsClient uses 1-minute TTL cache
- **Concurrency**: Limited to 6 concurrent requests
- **Pagination**: 30 stories per page to balance performance and UX
- **Memoization**: useCallback hooks prevent unnecessary re-renders

## Adding New Feed Types

To add a new story feed:

1. **Update API Types**: Add new feed type to `StoryFeedKind` in `/lib/hn-api.ts`
2. **Create Tab Component**: Create new file in `/app/(tabs)/` following the pattern:
   ```typescript
   import React from 'react';
   import { StoryList } from '@/components/story-list';
   
   export default function NewFeedScreen() {
     return <StoryList feedType="newFeedType" />;
   }
   ```
3. **Update Tab Layout**: Add new tab trigger in `/app/(tabs)/_layout.tsx`

## Future Enhancements

### Search Implementation
The search tab currently shows top stories as a placeholder. To implement proper search:

1. **API Integration**: Extend HackerNewsClient with search methods
2. **Search UI**: Add search input and filters
3. **Results Display**: Use StoryList with search results
4. **Query State**: Manage search query and filters

### Additional Features
- **Favorites/Bookmarks**: Save stories for later reading
- **User Profiles**: View user submissions and comments
- **Comment Threading**: Enhanced comment viewing
- **Offline Support**: Cache stories for offline reading
- **Push Notifications**: Notify for top stories or specific users

## Code Organization

```
/app/(tabs)/
├── index.tsx          # Top stories (front page)
├── new.tsx            # New stories
├── best.tsx           # Best stories
├── ask.tsx            # Ask HN
├── search/
│   └── index.tsx      # Search (placeholder)
└── _layout.tsx        # Tab navigation

/components/
├── story-list.tsx     # Reusable story list component
├── story-item.tsx     # Individual story display
└── ...

/lib/
└── hn-api.ts          # HackerNews API client with feed types
```

This architecture provides a clean separation of concerns and makes it easy to add new features while maintaining consistency across all story feeds.
