/**
 * WordPress Zustand store.
 * Manages WP posts state and sync operations.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SyncedPost, WPPagination } from './types';

interface WordPressState {
  posts: SyncedPost[];
  pagination: WPPagination | null;
  isFetching: boolean;
  isSyncing: boolean;
  isUpdating: boolean;
  searchQuery: string;
  error: string | null;
  lastSyncAt: string | null;
}

interface WordPressActions {
  setPosts: (posts: SyncedPost[]) => void;
  addPosts: (posts: SyncedPost[]) => void;
  setPagination: (pagination: WPPagination) => void;
  setFetching: (fetching: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  setLastSyncAt: (timestamp: string) => void;
  reset: () => void;
}

const initialState: WordPressState = {
  posts: [],
  pagination: null,
  isFetching: false,
  isSyncing: false,
  isUpdating: false,
  searchQuery: '',
  error: null,
  lastSyncAt: null,
};

export const useWordPressStore = create<WordPressState & WordPressActions>()(
  immer((set) => ({
    ...initialState,

    setPosts: (posts) =>
      set((state) => { state.posts = posts; }),

    addPosts: (posts) =>
      set((state) => { state.posts.push(...posts); }),

    setPagination: (pagination) =>
      set((state) => { state.pagination = pagination; }),

    setFetching: (fetching) =>
      set((state) => { state.isFetching = fetching; }),

    setSyncing: (syncing) =>
      set((state) => { state.isSyncing = syncing; }),

    setUpdating: (updating) =>
      set((state) => { state.isUpdating = updating; }),

    setSearchQuery: (query) =>
      set((state) => { state.searchQuery = query; }),

    setError: (error) =>
      set((state) => { state.error = error; }),

    setLastSyncAt: (timestamp) =>
      set((state) => { state.lastSyncAt = timestamp; }),

    reset: () => set(() => initialState),
  }))
);
