/**
 * Vector Analysis Zustand store.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cluster, SimilarPost } from './types';

interface VectorState {
  embeddedPostIds: Set<string>;
  clusters: Cluster[];
  similarPosts: Map<string, SimilarPost[]>;
  isEmbedding: boolean;
  isClustering: boolean;
  isSearching: boolean;
  embeddingProgress: { current: number; total: number };
  error: string | null;
}

interface VectorActions {
  markPostEmbedded: (postId: string) => void;
  markPostsEmbedded: (postIds: string[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  setSimilarPosts: (postId: string, posts: SimilarPost[]) => void;
  setEmbedding: (embedding: boolean) => void;
  setClustering: (clustering: boolean) => void;
  setSearching: (searching: boolean) => void;
  setEmbeddingProgress: (current: number, total: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: VectorState = {
  embeddedPostIds: new Set(),
  clusters: [],
  similarPosts: new Map(),
  isEmbedding: false,
  isClustering: false,
  isSearching: false,
  embeddingProgress: { current: 0, total: 0 },
  error: null,
};

export const useVectorStore = create<VectorState & VectorActions>()(
  immer((set) => ({
    ...initialState,

    markPostEmbedded: (postId) =>
      set((state) => { state.embeddedPostIds.add(postId); }),

    markPostsEmbedded: (postIds) =>
      set((state) => { postIds.forEach((id) => state.embeddedPostIds.add(id)); }),

    setClusters: (clusters) =>
      set((state) => { state.clusters = clusters; }),

    setSimilarPosts: (postId, posts) =>
      set((state) => { state.similarPosts.set(postId, posts); }),

    setEmbedding: (embedding) =>
      set((state) => { state.isEmbedding = embedding; }),

    setClustering: (clustering) =>
      set((state) => { state.isClustering = clustering; }),

    setSearching: (searching) =>
      set((state) => { state.isSearching = searching; }),

    setEmbeddingProgress: (current, total) =>
      set((state) => { state.embeddingProgress = { current, total }; }),

    setError: (error) =>
      set((state) => { state.error = error; }),

    reset: () => set(() => initialState),
  }))
);
