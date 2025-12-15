// src/stores/app-store.ts
// Global app state - Theme, Sidebar, etc.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
    // Sidebar
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;

    // Theme (cho tương lai)
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // Mobile menu
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Sidebar - default mở trên desktop
            sidebarOpen: true,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

            // Theme
            theme: 'light',
            setTheme: (theme) => set({ theme }),

            // Mobile menu
            mobileMenuOpen: false,
            setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
        }),
        {
            name: 'laba-app-store',
            storage: createJSONStorage(() => localStorage),
            // Chỉ persist theme, sidebar state reset khi refresh
            partialize: (state) => ({ theme: state.theme }),
        }
    )
);

// Selectors
export const selectSidebarOpen = (state: AppState) => state.sidebarOpen;
export const selectTheme = (state: AppState) => state.theme;
