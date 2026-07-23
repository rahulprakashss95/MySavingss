import { create } from "zustand";

/**
 * Holds the open/closed state of the app-wide SideDrawer overlay. Formerly a
 * React context + provider; now a Zustand store so any component can read or
 * toggle it without the provider wrapper. The `useDrawer` hook name and shape
 * are unchanged, so call sites didn't move.
 */
type DrawerState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useDrawer = create<DrawerState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
