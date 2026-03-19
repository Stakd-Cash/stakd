import { create } from 'zustand';
import { lsGet, lsSet } from '../utils/storage.js';
import {
  EMPTY_CASH,
  EMPTY_ROLLS,
  LS_SETTINGS,
  LS_RECORD,
  LS_TUTORIAL,
  LS_HINT,
  LS_THEME,
} from '../utils/constants.js';
import { loadAppState } from '../utils/appState.js';

const initial = loadAppState();

export const useAppStore = create((set, get) => ({
  // --- Persisted drawer state ---
  cash: initial.cash,
  targetInput: initial.targetInput,
  billsMode: initial.billsMode,
  coinsMode: initial.coinsMode,
  coinRolls: initial.coinRolls,
  page: initial.page,

  setCash: (updater) =>
    set((s) => ({
      cash: typeof updater === 'function' ? updater(s.cash) : updater,
    })),
  setTargetInput: (val) => set({ targetInput: val }),
  setBillsMode: (val) => set({ billsMode: val }),
  setCoinsMode: (val) => set({ coinsMode: val }),
  setCoinRolls: (updater) =>
    set((s) => ({
      coinRolls: typeof updater === 'function' ? updater(s.coinRolls) : updater,
    })),
  setPage: (val) => set({ page: val }),

  // --- Navigation transition state ---
  pageDir: null,
  prevPage: null,
  transitioning: false,
  setPageDir: (val) => set({ pageDir: val }),
  setPrevPage: (val) => set({ prevPage: val }),
  setTransitioning: (val) => set({ transitioning: val }),

  // --- UI panel visibility ---
  showHistory: false,
  showSettings: false,
  showAbout: false,
  showChangelog: false,
  showResetConfirm: false,
  showRecord: null,
  drawerOpen: false,
  setShowHistory: (val) => set({ showHistory: val }),
  setShowSettings: (val) => set({ showSettings: val }),
  setShowAbout: (val) => set({ showAbout: val }),
  setShowChangelog: (val) => set({ showChangelog: val }),
  setShowResetConfirm: (val) => set({ showResetConfirm: val }),
  setShowRecord: (val) => set({ showRecord: val }),
  setDrawerOpen: (val) => set({ drawerOpen: val }),

  // --- Settings / preferences ---
  theme: document.documentElement.getAttribute('data-theme') || lsGet(LS_THEME, 'dark'),
  setTheme: (val) => set({ theme: val }),

  settings: lsGet(LS_SETTINGS, { gamification: true }),
  changeSetting: (k, v) =>
    set((s) => {
      const next = { ...s.settings, [k]: v };
      lsSet(LS_SETTINGS, next);
      return { settings: next };
    }),

  recordDrop: lsGet(LS_RECORD, 0),
  setRecordDrop: (val) => set({ recordDrop: val }),

  showTutorial: !lsGet(LS_TUTORIAL, false),
  setShowTutorial: (val) => set({ showTutorial: val }),

  hintDone: lsGet(LS_HINT, false),
  setHintDone: (val) => set({ hintDone: val }),

  // --- Ephemeral animation state ---
  totalReveal: false,
  setTotalReveal: (val) => set({ totalReveal: val }),
  footerEntering: false,
  setFooterEntering: (val) => set({ footerEntering: val }),
  anyFocused: false,
  setAnyFocused: (val) => set({ anyFocused: val }),

  // --- Bulk reset ---
  resetCounts: () =>
    set({
      cash: { ...EMPTY_CASH },
      coinRolls: { ...EMPTY_ROLLS },
      page: 1,
    }),

  // --- Reload from localStorage ---
  reloadFromStorage: () => {
    const s = loadAppState();
    set({
      cash: s.cash,
      targetInput: s.targetInput,
      billsMode: s.billsMode,
      coinsMode: s.coinsMode,
      coinRolls: s.coinRolls,
      page: s.page,
    });
  },
}));
