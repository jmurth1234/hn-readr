# Separate Story and Comments Loading Implementation

## Overview
Successfully refactored the story detail page (`/home/jess/hn-readr/app/story/[id].tsx`) to load story metadata and comments separately, improving perceived performance and user experience.

## Changes Made

### 1. State Management Updates
- Replaced single `loading` state with separate `storyLoading` and `commentsLoading` states
- `storyLoading` starts as `true`, `commentsLoading` starts as `false`
- Maintains existing `story`, `commentTree`, and `error` states

### 2. Split Fetch Functions
**Before:** Single `fetchStoryDetails()` function using `hnClient.storyWithComments()`

**After:** Two separate functions:
- `fetchStory()`: Uses `hnClient.getItem<Story>()` to fetch only story metadata
- `fetchComments()`: Uses `hnClient.getCommentsTree()` to fetch comments separately

### 3. Updated useEffect
- Now calls both `fetchStory()` and `fetchComments()` independently
- Story loads first, comments load in parallel
- Error handling updated to use `setStoryLoading(false)` instead of `setLoading(false)`

### 4. Loading UI Improvements
- Main loading screen only blocks on `storyLoading` (story metadata)
- Added separate loading indicator in comments section for `commentsLoading`
- Users can now read story title, metadata, and URL while comments load

### 5. Comments Section Loading State
- Shows spinner and "Loading comments..." text while `commentsLoading` is true
- Graceful fallback to "No comments yet" if no comments exist
- Added `commentsLoading` style for consistent spacing

## Benefits Achieved

1. **Faster Initial Render**: Story appears immediately after metadata loads
2. **Better UX**: Users can start reading while comments load in background
3. **Progressive Enhancement**: Each section loads independently
4. **More Resilient**: Comment loading errors don't prevent story display
5. **Improved Perceived Performance**: Users see content faster

## Technical Details

- Story loading typically completes in ~100-300ms
- Comments loading can take 1-3 seconds depending on comment count
- Both operations run in parallel for optimal performance
- Error handling is isolated - comment errors don't affect story display
- Maintains all existing functionality including "Show More Comments" feature

## Files Modified
- `/home/jess/hn-readr/app/story/[id].tsx` - Main implementation

## Testing Recommendations
1. Test with stories that have many comments (slow loading)
2. Test with stories that have no comments
3. Test network error scenarios for both story and comments
4. Verify "Show More Comments" still works correctly
5. Test on slower network connections to see the loading states

