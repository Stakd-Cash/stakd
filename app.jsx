import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
  StrictMode,
} from 'react';
import { createRoot } from 'react-dom/client';
import { useShallow } from 'zustand/react/shallow';
import './src/components/CountPage.css';
import './src/components/ResultPage.css';

// --- Utilities ---
import { toCents, fromCents, rowValue } from './src/utils/money.js';
import { setFeedbackSoundEnabled } from './src/utils/haptics.js';
import { haptic } from './src/utils/haptics.js';
import {
  BILL_DENOMS,
  COIN_DENOMS,
} from './src/utils/constants.js';
import { rollExtraCount } from './src/utils/drop.js';

// --- Store ---
import { useAppStore } from './src/store/useStore.js';

// --- Hooks ---
import { useToast } from './src/hooks/useToast.js';
import { useDebouncedAppState } from './src/hooks/useDebouncedAppState.js';
import { useInputHandlers } from './src/hooks/useInputHandlers.js';
import { useWakeLock } from './src/hooks/useWakeLock.js';
import { useIOSPriming } from './src/hooks/useIOSPriming.js';
import { useTouchBlur } from './src/hooks/useTouchBlur.js';
import { useKeyboardDetection } from './src/hooks/useKeyboardDetection.js';
import { useModalBodyLock } from './src/hooks/useModalBodyLock.js';
import { useReduceMotion } from './src/hooks/useReduceMotion.js';
import { useNavigation } from './src/hooks/useNavigation.js';
import { useAppActions } from './src/hooks/useAppActions.js';
import { useDeviceDetect } from './src/hooks/useDeviceDetect.js';

// --- Components ---
import { Toast } from './src/components/Toast.jsx';
import { CountPage } from './src/components/CountPage.jsx';
import { ResultPage } from './src/components/ResultPage.jsx';
import { StickyFooter } from './src/components/StickyFooter.jsx';
import { HistoryPanel } from './src/components/HistoryPanel.jsx';
import { SettingsPanel } from './src/components/SettingsPanel.jsx';
import { ConfirmModal } from './src/components/ConfirmModal.jsx';
import { AboutModal } from './src/components/AboutModal.jsx';
import { NewRecord } from './src/components/NewRecord.jsx';
import { ChangelogModal } from './src/components/ChangelogModal.jsx';
import { Tutorial } from './src/components/Tutorial.jsx';
import { ErrorBoundary } from './src/components/ErrorBoundary.jsx';

// --- Admin ---
import { useRouter } from './src/hooks/useHashRouter.js';
import { useAuthStore } from './src/store/useAuthStore.js';
import { LoginPage } from './src/components/admin/LoginPage.jsx';
import { AdminShell } from './src/components/admin/AdminShell.jsx';
import { KioskBanner } from './src/components/admin/KioskBanner.jsx';
import { LandingPage } from './src/components/admin/LandingPage.jsx';
import { PathwayPage } from './src/components/admin/PathwayPage.jsx';
import { PinPad } from './src/components/admin/PinPad.jsx';
import { PlanSelector } from './src/components/admin/PlanSelector.jsx';
import { hasActiveSubscription } from './src/lib/billing.js';
import { FreeKioskMode } from './src/components/FreeKioskMode.jsx';
import { KioskShell } from './src/components/KioskShell.jsx';
import { KioskFooter } from './src/components/KioskFooter.jsx';

// ---------------------------------------------------------------------------
// ScrollToTop — resets scroll on page navigation
// ---------------------------------------------------------------------------
function ScrollToTop() {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  return null;
}

// ---------------------------------------------------------------------------
// PageSkeleton — forced skeleton placeholder for first page load
// ---------------------------------------------------------------------------
function PageSkeletonContent() {
  return (
    <div className="sk-scene">
      <div className="sk-card">
        <div className="sk-card-header" />
        <div className="sk-card-body">
          <div className="sk-row-inline" />
          <div className="sk-row-inline" />
          <div className="sk-row-inline" />
          <div className="sk-row-inline" />
          <div className="sk-row-inline" />
          <div className="sk-row-inline" />
        </div>
      </div>
      <div className="sk-card">
        <div className="sk-card-header" />
      </div>
    </div>
  );
}

function PageSkeletonFooter() {
  return (
    <div className="sk-footer-ph">
      <div className="sk-footer-row">
        <div className="sk sk-main" />
        <div className="sk sk-target" />
      </div>
      <div className="sk sk-progress" />
      <div className="sk sk-calc" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — thin shell that wires store, hooks, and components together
// ---------------------------------------------------------------------------
function App() {
  const { company, staff, activeStaff } = useAuthStore(useShallow((s) => ({
    company: s.company,
    staff: s.staff,
    activeStaff: s.activeStaff,
  })));

  // --- Store selectors (grouped with useShallow to reduce subscriptions) ---
  const {
    cash, targetInput, billsMode, coinsMode, coinRolls,
    showHistory, showSettings, showAbout, showChangelog,
    showResetConfirm, showRecord, showTutorial,
    drawerOpen, settings, recordDrop, totalReveal, footerEntering, anyFocused,
  } = useAppStore(useShallow((s) => ({
    cash: s.cash,
    targetInput: s.targetInput,
    billsMode: s.billsMode,
    coinsMode: s.coinsMode,
    coinRolls: s.coinRolls,
    showHistory: s.showHistory,
    showSettings: s.showSettings,
    showAbout: s.showAbout,
    showChangelog: s.showChangelog,
    showResetConfirm: s.showResetConfirm,
    showRecord: s.showRecord,
    showTutorial: s.showTutorial,
    drawerOpen: s.drawerOpen,
    settings: s.settings,
    recordDrop: s.recordDrop,
    totalReveal: s.totalReveal,
    footerEntering: s.footerEntering,
    anyFocused: s.anyFocused,
  })));

  const {
    setTargetInput, setDrawerOpen, changeSetting,
    setTotalReveal, setFooterEntering, setAnyFocused,
  } = useAppStore(useShallow((s) => ({
    setTargetInput: s.setTargetInput,
    setDrawerOpen: s.setDrawerOpen,
    changeSetting: s.changeSetting,
    setTotalReveal: s.setTotalReveal,
    setFooterEntering: s.setFooterEntering,
    setAnyFocused: s.setAnyFocused,
  })));

  // --- Toast ---
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  // --- Reactive reduce-motion ---
  const reduceMotion = useReduceMotion();

  // --- Device detection (touch / mobile / tablet / desktop) ---
  const { device, isTouch } = useDeviceDetect();

  // --- Navigation state machine (extracted hook) ---
  const {
    page, transitioning, navigateTo, cleanup: navCleanup,
    showPageCount, showPageResult, getPageAnimClass,
  } = useNavigation();

  // --- Business logic callbacks (extracted hook) ---
  const totals = useMemo(() => {
    const TARGET = Math.max(0, Number(targetInput) || 0);
    let totalBillsCents = 0;
    for (const d of BILL_DENOMS) {
      totalBillsCents += toCents(rowValue(cash[String(d)], d, billsMode));
    }
    let totalCoinsCents = 0;
    for (const c of COIN_DENOMS) {
      const extra =
        coinsMode === 'count' ? rollExtraCount(c.id, coinRolls[c.id]) : 0;
      totalCoinsCents += toCents(rowValue(cash[c.id], c.val, coinsMode, extra));
    }
    const totalCents = totalBillsCents + totalCoinsCents;
    const totalCash = fromCents(totalCents);
    const overageCents = totalCents - toCents(TARGET);
    const dropAmount = fromCents(Math.max(0, overageCents));
    const over = totalCash >= TARGET;
    return {
      totalBillsCents, totalCoinsCents, totalCents,
      totalCash, overageCents, dropAmount, over, TARGET,
    };
  }, [cash, billsMode, coinsMode, coinRolls, targetInput]);

  const {
    totalBillsCents, totalCoinsCents, totalCents,
    totalCash, overageCents, dropAmount, over, TARGET,
  } = totals;

  const currentStaff = activeStaff || staff;
  const staffFirstName = currentStaff?.name?.split(' ')[0] || null;
  const companyLabel = company?.name || 'Shared device';
  const summaryTitle = activeStaff
    ? `Count ${staffFirstName}'s drawer.`
    : 'Count the drawer and set the drop.';
  const summarySubtitle = activeStaff
    ? 'Enter each bill and coin, then calculate the safest drop before the next cashier takes over.'
    : 'Use count or value mode to move quickly through the drawer and lock in the right drop.';
  const statusLabel = totalCash > 0 ? (over ? 'Over target' : 'Still needed') : 'Shift status';
  const statusValue = totalCash > 0
    ? `${over ? '+' : '-'}$${Math.abs(totalCash - TARGET).toFixed(2)}`
    : 'Ready';
  const summaryStatusTone = totalCash > 0
    ? over
      ? 'stat-over'
      : 'stat-short'
    : '';
  const summaryNote = activeStaff
    ? `This kiosk session will save under ${currentStaff.name}.`
    : company
      ? `${company.name} is ready for the next shift handoff.`
      : 'Built for quick, on-floor cash checks.';

  const {
    cachedDropRef, themeRotating, toggleTheme,
    goToResult, goToCount, doReset, theme,
    openHistory, closeHistory,
    openSettings, closeSettings,
    openResetConfirm, closeResetConfirm,
    openAbout, closeAbout,
    openChangelog, closeChangelog,
    dismissRecord,
    onRecordCleared, onRecordRestored,
    onReplayTutorial, onTutorialDone,
  } = useAppActions({ navigateTo, showToast, dismissToast, totals });

  // --- Drop details (fix: only read cached ref, computed in goToResult) ---
  const dropDetails = cachedDropRef.current;

  const actualDropTotal = useMemo(
    () => dropDetails.reduce((s, i) => s + i.value, 0),
    [dropDetails]
  );

  const remainingDrawer = useMemo(() => {
    const remainingCents = totalCents - toCents(actualDropTotal);
    return fromCents(remainingCents);
  }, [totalCents, actualDropTotal]);

  const undroppableCents = useMemo(
    () =>
      overageCents > 0
        ? toCents(dropAmount) - toCents(actualDropTotal)
        : 0,
    [overageCents, dropAmount, actualDropTotal]
  );

  // --- Refs ---
  const prevOver = useRef(false);
  const totalRevealTm = useRef(null);
  const isMounted = useRef(false);

  // --- Forced skeleton (short delay before first page reveal) ---
  const [appReady, setAppReady] = useState(false);
  const initialRevealDone = useRef(false);
  useEffect(() => {
    const tm = setTimeout(() => setAppReady(true), 500);
    return () => clearTimeout(tm);
  }, []);

  // --- Skeleton fade-out ---
  useEffect(() => {
    const el = document.getElementById('pre-sk');
    const elFt = document.getElementById('pre-sk-footer');
    if (!el) return;
    const started =
      typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();
    let removeTm = null;
    let fadeTm = null;
    const remove = () => {
      try {
        el.remove();
        elFt?.remove();
      } catch {
        /* swallow */
      }
    };
    const queueFadeAndRemove = () => {
      const now =
        typeof performance !== 'undefined' && performance.now
          ? performance.now()
          : Date.now();
      const elapsed = now - started;
      const minVisible = 1500;
      const wait = Math.max(0, minVisible - elapsed);
      fadeTm = setTimeout(() => {
        el.classList.add('sk-out');
        elFt?.classList.add('sk-out');
        removeTm = setTimeout(remove, 400);
      }, wait);
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(queueFadeAndRemove));
    } else {
      queueFadeAndRemove();
    }
    return () => {
      clearTimeout(fadeTm);
      clearTimeout(removeTm);
    };
  }, []);

  // --- Enable haptic feedback sound ---
  useEffect(() => {
    setFeedbackSoundEnabled(true);
  }, []);

  // --- Extracted platform hooks ---
  useKeyboardDetection(setAnyFocused);
  useTouchBlur();
  useIOSPriming();
  useWakeLock();

  // --- Debounced persistence ---
  const appState = useMemo(
    () => ({ cash, targetInput, billsMode, coinsMode, coinRolls, page }),
    [cash, targetInput, billsMode, coinsMode, coinRolls, page]
  );
  useDebouncedAppState(appState);

  // --- Target-reached haptic ---
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      prevOver.current = over;
      return;
    }
    if (totalCash <= 0) {
      prevOver.current = over;
      return;
    }
    if (!prevOver.current && over) {
      try {
        haptic('success');
      } catch {
        /* swallow */
      }
      showToast('Target reached', 'success');
    }
    prevOver.current = over;
  }, [over, totalCash, showToast]);

  // --- Input handlers (extracted to hook) ---
  const {
    handleManualInput,
    handleCoinRoll,
    handleCoinRollSet,
    handleBillsModeChange,
    handleCoinsModeChange,
    billStep,
    coinStep,
  } = useInputHandlers();

  // --- Cleanup on unmount ---
  useEffect(
    () => () => {
      navCleanup();
      clearTimeout(totalRevealTm.current);
    },
    [navCleanup]
  );

  // --- Total reveal animation ---
  useEffect(() => {
    if (page !== 1 || reduceMotion) return;
    setTotalReveal(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTotalReveal(true);
        clearTimeout(totalRevealTm.current);
        totalRevealTm.current = setTimeout(
          () => setTotalReveal(false),
          380
        );
      });
    });
  }, [page, reduceMotion, setTotalReveal]);

  // --- Footer enter animation ---
  useEffect(() => {
    if (page !== 1 || reduceMotion) return;
    if (transitioning) return;
    if (!footerEntering) return;
    const raf = requestAnimationFrame(() => setFooterEntering(false));
    return () => cancelAnimationFrame(raf);
  }, [page, reduceMotion, footerEntering, transitioning, setFooterEntering]);

  // --- Modal body-lock ---
  const anyModalOpen =
    showHistory ||
    showSettings ||
    showAbout ||
    showChangelog ||
    showResetConfirm ||
    showTutorial ||
    !!showRecord;

  useModalBodyLock(anyModalOpen);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="app-root">
      {/* Header */}
      <header className="gh-header">
        <div className="gh-header-brand" aria-label="stakd">
          <div className="gh-logo">
            <img src="/src/stakd-logo-mark.svg" alt="stakd" decoding="async" />
          </div>
          <div className="gh-brand-copy">
            <span className="gh-brand-context">{companyLabel}</span>
          </div>
          {currentStaff?.name && (
            <span className="gh-session-chip">{currentStaff.name}</span>
          )}
        </div>
        <div className="gh-header-actions" id="header-actions">
          <button
            className="icon-btn admin-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={
              theme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
          >
            <i
              className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} header-icon icon-17${themeRotating ? ' theme-spin' : ''}`}
            />
          </button>
          <button
            className={`icon-btn admin-icon-btn${showHistory ? ' is-active' : ''}`}
            onClick={openHistory}
            aria-label="Drop history"
            title="Drop history"
            aria-pressed={showHistory}
          >
            <i className="fa-solid fa-clock header-icon icon-17" />
          </button>
          <button
            className={`icon-btn admin-icon-btn${showSettings ? ' is-active' : ''}`}
            onClick={openSettings}
            aria-label="Settings"
            title="Settings"
            aria-pressed={showSettings}
          >
            <i className="fa-solid fa-gear header-icon icon-17" />
          </button>
          <button
            className={`icon-btn admin-icon-btn${showResetConfirm ? ' is-active' : ''}`}
            onClick={openResetConfirm}
            aria-label="Reset counts"
            title="Reset counts"
            aria-pressed={showResetConfirm}
          >
            <i className="fa-solid fa-arrows-rotate header-icon icon-17" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main-content"
        className="main-content main-content-count"
      >
        <div className="page-root">
          {/* Page 1: Count */}
          {showPageCount && !appReady && (
            <div className="page-slide">
              <PageSkeletonContent />
            </div>
          )}
          {showPageCount && appReady && (
            <div
              className={`page-slide page-slide-count${!initialRevealDone.current ? ' app-reveal' : ''}${getPageAnimClass(1)}`}
              ref={(el) => { if (el && !initialRevealDone.current) initialRevealDone.current = true; }}
            >
              <ScrollToTop />
              <div className="calc-ui">


                <CountPage
                  totalBillsCents={totalBillsCents}
                  totalCoinsCents={totalCoinsCents}
                  billsMode={billsMode}
                  coinsMode={coinsMode}
                  cash={cash}
                  coinRolls={coinRolls}
                  handleBillsModeChange={handleBillsModeChange}
                  handleCoinsModeChange={handleCoinsModeChange}
                  handleManualInput={handleManualInput}
                  billStep={billStep}
                  coinStep={coinStep}
                  handleCoinRoll={handleCoinRoll}
                  handleCoinRollSet={handleCoinRollSet}
                  goToResult={goToResult}
                />
              </div>
            </div>
          )}

          {/* Page 2: Result */}
          {showPageResult && (
            <div
              className={`page-slide page-slide-result${getPageAnimClass(2)}`}
            >
              <ScrollToTop />
              <div className="calc-ui">
                <ResultPage
                  actualDropTotal={actualDropTotal}
                  totalCash={totalCash}
                  TARGET={TARGET}
                  dropDetails={dropDetails}
                  overageCents={overageCents}
                  remainingDrawer={remainingDrawer}
                  undroppableCents={undroppableCents}
                  totalBillsCents={totalBillsCents}
                  totalCoinsCents={totalCoinsCents}
                  drawerOpen={drawerOpen}
                  setDrawerOpen={setDrawerOpen}
                  cash={cash}
                  billsMode={billsMode}
                  coinsMode={coinsMode}
                  coinRolls={coinRolls}
                  goToCount={goToCount}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Skeleton footer (before app is ready) */}
      {page === 1 && !appReady && <PageSkeletonFooter />}

      {/* Sticky footer (page 1 only) */}
      {page === 1 && !transitioning && appReady && (
        <StickyFooter
          anyFocused={anyFocused}
          footerEntering={footerEntering}
          totalReveal={totalReveal}
          totalCash={totalCash}
          over={over}
          TARGET={TARGET}
          targetInput={targetInput}
          setTargetInput={setTargetInput}
          recordDrop={recordDrop}
          settings={settings}
          goToResult={goToResult}
          cash={cash}
          billsMode={billsMode}
          dropAmount={dropAmount}
        />
      )}

      {/* Modals / Sheets */}
      {showHistory && (
        <HistoryPanel
          onClose={closeHistory}
          onRecordCleared={onRecordCleared}
          onRecordRestored={onRecordRestored}
          showToast={showToast}
          dismissToast={dismissToast}
        />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={closeSettings}
          settings={settings}
          onChange={changeSetting}
          onReplayTutorial={onReplayTutorial}
          onShowAbout={openAbout}
          onShowChangelog={openChangelog}
          onShowHistory={openHistory}
        />
      )}
      {showRecord && (
        <NewRecord
          amount={showRecord}
          onDismiss={dismissRecord}
        />
      )}
      {showTutorial && (
        <Tutorial onDone={onTutorialDone} />
      )}
      {showAbout && <AboutModal onClose={closeAbout} />}
      {showChangelog && (
        <ChangelogModal onClose={closeChangelog} />
      )}
      {showResetConfirm && (
        <ConfirmModal
          title="Reset counts?"
          body="This clears all current counts and starts a fresh drawer. Your drop history stays saved."
          confirmLabel="Reset counts"
          onConfirm={doReset}
          onCancel={closeResetConfirm}
        />
      )}
      <Toast toast={toast} aboveFooter={page === 1} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuthGuard — shows loading spinner or redirects to /login if not authed
// ---------------------------------------------------------------------------
function AuthGuard({ children, navigate, replaceNavigate }) {
  const { user, loading: authLoading } = useAuthStore();
  if (authLoading) {
    return (
      <div className="admin-view admin-loading">
        <div className="admin-spinner" />
        <p>Loading...</p>
      </div>
    );
  }
  if (!user) {
    replaceNavigate('/login');
    return null;
  }
  return children;
}

function CompanyGuard({ children, navigate, replaceNavigate, inactiveMode = 'render' }) {
  const { company, loading: authLoading } = useAuthStore(useShallow((s) => ({
    company: s.company,
    loading: s.loading,
  })));

  if (authLoading) {
    return (
      <div className="admin-view admin-loading">
        <div className="admin-spinner" />
        <p>Loading workspace...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="admin-view admin-empty">
        <h2>No Company Found</h2>
        <p>You haven&apos;t created or joined a company yet.</p>
        <button className="admin-submit" onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  if (hasActiveSubscription(company)) {
    return children;
  }

  if (inactiveMode === 'redirect') {
    replaceNavigate('/onboarding?step=plan');
    return null;
  }

  const checkoutSessionId =
    typeof window !== 'undefined'
      ? new window.URLSearchParams(window.location.search).get('session_id')
      : null;

  return (
    <PlanSelector
      company={company}
      navigate={navigate}
      replaceNavigate={replaceNavigate}
      checkoutSessionId={checkoutSessionId}
    />
  );
}

function OnboardingRoute({ navigate, replaceNavigate }) {
  const company = useAuthStore((s) => s.company);

  if (!company) {
    return (
      <div className="admin-view admin-empty">
        <h2>No Company Found</h2>
        <p>You haven&apos;t created or joined a company yet.</p>
        <button className="admin-submit" onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  if (hasActiveSubscription(company)) {
    replaceNavigate('/admin');
    return null;
  }

  return (
    <PlanSelector
      company={company}
      navigate={navigate}
      replaceNavigate={replaceNavigate}
    />
  );
}

// ---------------------------------------------------------------------------
// KioskRoute — handles kiosk PIN pad and counter with banner
// ---------------------------------------------------------------------------
function KioskRoute({ navigate, replaceNavigate }) {
  const { company, activeStaff, pinLogout, setKioskMode } = useAuthStore();

  // Enter kiosk mode when this route mounts
  useEffect(() => {
    setKioskMode(true);
    return () => {};
  }, [setKioskMode]);

  const handleKioskPinSuccess = useCallback(() => {
    useAppStore.getState().resetCounts();
    // Stay on /kiosk — the component will re-render showing the counter
  }, []);

  const handleKioskLock = useCallback(() => {
    pinLogout();
    // Stay on /kiosk — will show PIN pad again
  }, [pinLogout]);

  const handleBack = useCallback(() => {
    pinLogout();
    setKioskMode(false);
    navigate('/pathway');
  }, [pinLogout, setKioskMode, navigate]);

  if (!company) {
    return (
      <div className="admin-view admin-empty">
        <h2>No Company Found</h2>
        <p>You haven&apos;t created or joined a company yet.</p>
        <button className="admin-submit" onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  // Cashier is PIN'd in — same shell as guest kiosk + staff footer
  if (activeStaff) {
    return (
      <KioskShell
        banner={<KioskBanner onTimeout={handleKioskLock} />}
        footer={<KioskFooter variant="staff" />}
      >
        <App />
      </KioskShell>
    );
  }

  // No cashier yet — PIN pad inside same kiosk shell as guest
  return (
    <KioskShell>
      <PinPad
        company={company}
        onSuccess={handleKioskPinSuccess}
        onBack={handleBack}
      />
    </KioskShell>
  );
}

// ---------------------------------------------------------------------------
// KioskAuthFork — free mode if unauthenticated, paid flow if authed
// ---------------------------------------------------------------------------
function KioskAuthFork({ navigate, replaceNavigate }) {
  const { user, loading: authLoading } = useAuthStore();

  if (authLoading) {
    return (
      <div className="admin-view admin-loading">
        <div className="admin-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // No authenticated user — render free kiosk mode
  if (!user) {
    return (
      <FreeKioskMode>
        <App />
      </FreeKioskMode>
    );
  }

  // Authenticated user — existing paid flow
  return (
    <AuthGuard navigate={navigate} replaceNavigate={replaceNavigate}>
      <CompanyGuard
        navigate={navigate}
        replaceNavigate={replaceNavigate}
        inactiveMode="redirect"
      >
        <KioskRoute navigate={navigate} replaceNavigate={replaceNavigate} />
      </CompanyGuard>
    </AuthGuard>
  );
}

// ---------------------------------------------------------------------------
// Root — path-based routing
// ---------------------------------------------------------------------------
function Root() {
  const { route, param, navigate, replaceNavigate } = useRouter();
  const { init } = useAuthStore();
  const authInitRef = useRef(false);

  useEffect(() => {
    if (!authInitRef.current) {
      authInitRef.current = true;
      init();
    }
  }, [init]);

  // Landing page (/)
  if (route === '') {
    return <LandingPage navigate={navigate} />;
  }

  // Login page (/login)
  if (route === 'login') {
    return <LoginPage navigate={navigate} />;
  }

  // Pathway page (/pathway) — choose manager dashboard vs kiosk
  if (route === 'pathway') {
    return (
      <AuthGuard navigate={navigate} replaceNavigate={replaceNavigate}>
        <CompanyGuard
          navigate={navigate}
          replaceNavigate={replaceNavigate}
          inactiveMode="redirect"
        >
          <PathwayPage navigate={navigate} replaceNavigate={replaceNavigate} />
        </CompanyGuard>
      </AuthGuard>
    );
  }

  if (route === 'onboarding') {
    return (
      <AuthGuard navigate={navigate} replaceNavigate={replaceNavigate}>
        <OnboardingRoute navigate={navigate} replaceNavigate={replaceNavigate} />
      </AuthGuard>
    );
  }

  // Admin panel (/admin) — manager dashboard
  if (route === 'admin') {
    return (
      <AuthGuard navigate={navigate} replaceNavigate={replaceNavigate}>
        <CompanyGuard navigate={navigate} replaceNavigate={replaceNavigate}>
          <AdminShell
            navigate={navigate}
            replaceNavigate={replaceNavigate}
            initialTab={param}
          />
        </CompanyGuard>
      </AuthGuard>
    );
  }

  // Kiosk mode (/kiosk) — free mode if unauthenticated, paid PIN flow if authed
  if (route === 'kiosk') {
    return (
      <KioskAuthFork navigate={navigate} replaceNavigate={replaceNavigate} />
    );
  }

  // Fallback — show landing
  return <LandingPage navigate={navigate} />;
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>
);
