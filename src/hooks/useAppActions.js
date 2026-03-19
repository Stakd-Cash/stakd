import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useStore.js';
import { lsSet } from '../utils/storage.js';
import { applyTheme } from '../utils/theme.js';
import { haptic } from '../utils/haptics.js';
import { toCents, fromCents } from '../utils/money.js';
import { launchConfetti } from '../utils/confetti.js';
import { computeDrop } from '../utils/drop.js';
import { pushHistory } from '../utils/history.js';
import { LS_RECORD, LS_THEME, LS_TUTORIAL } from '../utils/constants.js';

/**
 * Extracted business-logic callbacks from App:
 *   - toggleTheme
 *   - goToResult (compute drop, push history, confetti, navigate)
 *   - goToCount
 *   - doReset (with undo snapshot)
 *   - modal open/close callbacks
 */
export function useAppActions({ navigateTo, showToast, dismissToast, totals }) {
  const cash = useAppStore((s) => s.cash);
  const billsMode = useAppStore((s) => s.billsMode);
  const coinRolls = useAppStore((s) => s.coinRolls);
  const settings = useAppStore((s) => s.settings);
  const recordDrop = useAppStore((s) => s.recordDrop);
  const theme = useAppStore((s) => s.theme);

  const setCash = useAppStore((s) => s.setCash);
  const setCoinRolls = useAppStore((s) => s.setCoinRolls);
  const setTheme = useAppStore((s) => s.setTheme);
  const setRecordDrop = useAppStore((s) => s.setRecordDrop);
  const setShowRecord = useAppStore((s) => s.setShowRecord);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const setFooterEntering = useAppStore((s) => s.setFooterEntering);
  const setShowHistory = useAppStore((s) => s.setShowHistory);
  const setShowSettings = useAppStore((s) => s.setShowSettings);
  const setShowAbout = useAppStore((s) => s.setShowAbout);
  const setShowChangelog = useAppStore((s) => s.setShowChangelog);
  const setShowResetConfirm = useAppStore((s) => s.setShowResetConfirm);
  const setShowTutorial = useAppStore((s) => s.setShowTutorial);
  const resetCounts = useAppStore((s) => s.resetCounts);

  const cachedDropRef = useRef([]);
  const undoSnapshotRef = useRef(null);
  const thmTm = useRef(null);

  // --- Theme toggle ---
  const [themeRotating, setThemeRotating] = useState(false);

  const toggleTheme = useCallback(() => {
    haptic('tap');
    setThemeRotating(true);
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    lsSet(LS_THEME, next);
    setTheme(next);
    clearTimeout(thmTm.current);
    thmTm.current = setTimeout(() => {
      html.classList.remove('thm');
      setThemeRotating(false);
    }, 400);
  }, [setTheme]);

  // --- Navigate to result (compute drop, history, confetti) ---
  const goToResult = useCallback(() => {
    const { totalCash, totalCents, dropAmount } = totals;
    const TARGET = Math.max(0, Number(useAppStore.getState().targetInput) || 0);

    if (totalCash <= 0) {
      haptic('warning');
      showToast('Add your drawer counts before calculating', 'error');
      return;
    }
    haptic('success');
    const currentCash = useAppStore.getState().cash;
    const currentBillsMode = useAppStore.getState().billsMode;
    const details = computeDrop(currentCash, currentBillsMode, dropAmount, TARGET);
    cachedDropRef.current = details;
    const dropped = details.reduce((s, i) => s + i.value, 0);
    const remaining = fromCents(totalCents - toCents(dropped));
    pushHistory({
      ts: Date.now(),
      totalCash,
      dropped,
      remaining,
      target: TARGET,
      dropDetails: details,
    });
    const CONFETTI_THRESHOLD = 5000;
    const currentSettings = useAppStore.getState().settings;
    const currentRecordDrop = useAppStore.getState().recordDrop;
    const isNewRecord =
      currentSettings.gamification && dropped > 0 && dropped > currentRecordDrop;
    const isBigDrop =
      currentSettings.gamification && toCents(dropped) >= CONFETTI_THRESHOLD;
    if (isNewRecord) {
      lsSet(LS_RECORD, dropped);
      setRecordDrop(dropped);
      setTimeout(() => {
        haptic('record');
        launchConfetti();
        setShowRecord(dropped);
      }, 400);
    } else if (isBigDrop) {
      setTimeout(() => {
        haptic('success');
        launchConfetti();
      }, 350);
    }
    setDrawerOpen(false);
    navigateTo(2, 'fwd');
  }, [totals, showToast, navigateTo, setRecordDrop, setShowRecord, setDrawerOpen]);

  // --- Navigate back to count ---
  const goToCount = useCallback(() => {
    haptic('tap');
    setFooterEntering(true);
    navigateTo(1, 'back');
  }, [navigateTo, setFooterEntering]);

  // --- Reset with undo ---
  const doReset = useCallback(() => {
    haptic('destruct');
    const state = useAppStore.getState();
    undoSnapshotRef.current = { cash: { ...state.cash }, coinRolls: { ...state.coinRolls } };
    resetCounts();
    setShowResetConfirm(false);
    showToast('Counts cleared', 'neutral', 5000, {
      label: 'Undo',
      onClick: () => {
        if (!undoSnapshotRef.current) return;
        setCash(undoSnapshotRef.current.cash);
        setCoinRolls(undoSnapshotRef.current.coinRolls);
        undoSnapshotRef.current = null;
        dismissToast();
        showToast('Counts restored', 'success');
      },
    });
  }, [resetCounts, setShowResetConfirm, showToast, dismissToast, setCash, setCoinRolls]);

  // --- Modal open/close callbacks (memoized) ---
  const openHistory = useCallback(() => { haptic('tap'); setShowHistory(true); }, [setShowHistory]);
  const closeHistory = useCallback(() => setShowHistory(false), [setShowHistory]);
  const openSettings = useCallback(() => { haptic('tap'); setShowSettings(true); }, [setShowSettings]);
  const closeSettings = useCallback(() => setShowSettings(false), [setShowSettings]);
  const openResetConfirm = useCallback(() => { haptic('tap'); setShowResetConfirm(true); }, [setShowResetConfirm]);
  const closeResetConfirm = useCallback(() => setShowResetConfirm(false), [setShowResetConfirm]);
  const openAbout = useCallback(() => setShowAbout(true), [setShowAbout]);
  const closeAbout = useCallback(() => setShowAbout(false), [setShowAbout]);
  const openChangelog = useCallback(() => setShowChangelog(true), [setShowChangelog]);
  const closeChangelog = useCallback(() => setShowChangelog(false), [setShowChangelog]);
  const dismissRecord = useCallback(() => setShowRecord(null), [setShowRecord]);

  const onRecordCleared = useCallback(() => {
    lsSet(LS_RECORD, 0);
    setRecordDrop(0);
  }, [setRecordDrop]);

  const onRecordRestored = useCallback((val) => {
    lsSet(LS_RECORD, val);
    setRecordDrop(val);
  }, [setRecordDrop]);

  const onReplayTutorial = useCallback(() => {
    lsSet(LS_TUTORIAL, false);
    setShowTutorial(true);
  }, [setShowTutorial]);

  const onTutorialDone = useCallback(() => {
    lsSet(LS_TUTORIAL, true);
    setShowTutorial(false);
  }, [setShowTutorial]);

  return {
    cachedDropRef,
    themeRotating,
    toggleTheme,
    goToResult,
    goToCount,
    doReset,
    theme,
    // Modal callbacks
    openHistory,
    closeHistory,
    openSettings,
    closeSettings,
    openResetConfirm,
    closeResetConfirm,
    openAbout,
    closeAbout,
    openChangelog,
    closeChangelog,
    dismissRecord,
    onRecordCleared,
    onRecordRestored,
    onReplayTutorial,
    onTutorialDone,
  };
}
