/**
 * UI State Zustand store.
 * Central store for application-level UI state.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AppView, BatchProgress, Notification } from './types';

interface UIState {
  currentView: AppView;
  sidebarOpen: boolean;
  batchProgress: BatchProgress | null;
  notifications: Notification[];
  isAuthenticated: boolean;
}

interface UIActions {
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBatchProgress: (progress: BatchProgress | null) => void;
  addNotification: (notification: Notification) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  setAuthenticated: (authenticated: boolean) => void;
}

const initialState: UIState = {
  currentView: 'dashboard',
  sidebarOpen: true,
  batchProgress: null,
  notifications: [],
  isAuthenticated: false,
};

export const useUIStore = create<UIState & UIActions>()(
  immer((set) => ({
    ...initialState,

    setView: (view) =>
      set((state) => { state.currentView = view; }),

    toggleSidebar: () =>
      set((state) => { state.sidebarOpen = !state.sidebarOpen; }),

    setSidebarOpen: (open) =>
      set((state) => { state.sidebarOpen = open; }),

    setBatchProgress: (progress) =>
      set((state) => { state.batchProgress = progress; }),

    addNotification: (notification) =>
      set((state) => { state.notifications.unshift(notification); }),

    dismissNotification: (id) =>
      set((state) => {
        const n = state.notifications.find((n) => n.id === id);
        if (n) (n as { dismissed: boolean }).dismissed = true;
      }),

    clearNotifications: () =>
      set((state) => { state.notifications = []; }),

    setAuthenticated: (authenticated) =>
      set((state) => { state.isAuthenticated = authenticated; }),
  }))
);
