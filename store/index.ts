import { create } from 'zustand';

interface CurrentUser {
  id: string;
  name: string;
  avatar: string;
}

interface AppState {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  // Persiste el token de invitación mientras el usuario completa el registro
  pendingInviteToken: string | null;
  setPendingInviteToken: (token: string | null) => void;

  // Suppress auth redirect (used by forgot password flow)
  suppressAuthRedirect: boolean;
  setSuppressAuthRedirect: (v: boolean) => void;

  // Toast global
  toastMessage: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  pendingInviteToken: null,
  setPendingInviteToken: (token) => set({ pendingInviteToken: token }),

  suppressAuthRedirect: false,
  setSuppressAuthRedirect: (v) => set({ suppressAuthRedirect: v }),

  toastMessage: null,
  showToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: null }),
}));
