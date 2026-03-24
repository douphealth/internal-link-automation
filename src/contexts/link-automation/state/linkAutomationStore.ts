/**
 * Link Automation Zustand store.
 * Manages link suggestions state and operations.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { LinkSuggestion, LinkScanResult } from '../types';

interface LinkAutomationState {
  suggestions: LinkSuggestion[];
  scanResults: Map<string, LinkScanResult>;
  isScanning: boolean;
  isRanking: boolean;
  isInjecting: boolean;
  selectedSuggestionIds: Set<string>;
  error: string | null;
}

interface LinkAutomationActions {
  setSuggestions: (suggestions: LinkSuggestion[]) => void;
  addScanResult: (postId: string, result: LinkScanResult) => void;
  updateSuggestionStatus: (id: string, status: LinkSuggestion['status']) => void;
  toggleSuggestionSelection: (id: string) => void;
  selectAllSuggestions: () => void;
  clearSelection: () => void;
  setScanning: (scanning: boolean) => void;
  setRanking: (ranking: boolean) => void;
  setInjecting: (injecting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: LinkAutomationState = {
  suggestions: [],
  scanResults: new Map(),
  isScanning: false,
  isRanking: false,
  isInjecting: false,
  selectedSuggestionIds: new Set(),
  error: null,
};

export const useLinkAutomationStore = create<LinkAutomationState & LinkAutomationActions>()(
  immer((set) => ({
    ...initialState,

    setSuggestions: (suggestions) =>
      set((state) => { state.suggestions = suggestions; }),

    addScanResult: (postId, result) =>
      set((state) => { state.scanResults.set(postId, result); }),

    updateSuggestionStatus: (id, status) =>
      set((state) => {
        const suggestion = state.suggestions.find((s) => s.id === id);
        if (suggestion) {
          (suggestion as { status: string }).status = status;
        }
      }),

    toggleSuggestionSelection: (id) =>
      set((state) => {
        if (state.selectedSuggestionIds.has(id)) {
          state.selectedSuggestionIds.delete(id);
        } else {
          state.selectedSuggestionIds.add(id);
        }
      }),

    selectAllSuggestions: () =>
      set((state) => {
        state.selectedSuggestionIds = new Set(
          state.suggestions.map((s) => s.id)
        );
      }),

    clearSelection: () =>
      set((state) => { state.selectedSuggestionIds = new Set(); }),

    setScanning: (scanning) =>
      set((state) => { state.isScanning = scanning; }),

    setRanking: (ranking) =>
      set((state) => { state.isRanking = ranking; }),

    setInjecting: (injecting) =>
      set((state) => { state.isInjecting = injecting; }),

    setError: (error) =>
      set((state) => { state.error = error; }),

    reset: () => set(() => initialState),
  }))
);
