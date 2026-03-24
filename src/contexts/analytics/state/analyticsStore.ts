/**
 * Analytics Zustand store.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AnalyticsEvent, AnalyticsSummary } from '../types';

interface AnalyticsState {
  recentEvents: AnalyticsEvent[];
  summary: AnalyticsSummary | null;
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsActions {
  addEvent: (event: AnalyticsEvent) => void;
  setRecentEvents: (events: AnalyticsEvent[]) => void;
  setSummary: (summary: AnalyticsSummary) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AnalyticsState = {
  recentEvents: [],
  summary: null,
  isLoading: false,
  error: null,
};

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  immer((set) => ({
    ...initialState,

    addEvent: (event) =>
      set((state) => { state.recentEvents.unshift(event); }),

    setRecentEvents: (events) =>
      set((state) => { state.recentEvents = events; }),

    setSummary: (summary) =>
      set((state) => { state.summary = summary; }),

    setLoading: (loading) =>
      set((state) => { state.isLoading = loading; }),

    setError: (error) =>
      set((state) => { state.error = error; }),

    reset: () => set(() => initialState),
  }))
);
