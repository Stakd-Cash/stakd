import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PathwayPage.css';
import './PinPad.css';
import { useAuthStore } from '../../store/useAuthStore.js';
import { supabase } from '../../lib/supabase.js';

const ROLE_LABELS = { cashier: 'Crew Member', manager: 'Manager', owner: 'Owner' };
const MAX_PIN = 8;

export function PinPad({ company, onSuccess, onBack, roleFilter, prompt }) {
  // Step: 'select' = pick a user, 'pin' = enter PIN
  const [step, setStep] = useState('select');
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { pinLoginFor } = useAuthStore();
  const dotsRef = useRef(null);
  const staffListRef = useRef(null);
  const touchGestureRef = useRef({ x: 0, y: 0, moved: false });

  const handleStaffScroll = useCallback((e) => {
    const el = e.currentTarget;
    const topFade = Math.min(el.scrollTop, 48);
    const bottomRemaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    const bottomFade = Math.min(bottomRemaining, 48);
    el.style.setProperty('--_top-fade', `${topFade}px`);
    el.style.setProperty('--_bottom-fade', `${bottomFade}px`);
  }, []);

  const syncStaffScrollState = useCallback(() => {
    const el = staffListRef.current;
    if (!el) return;
    const topFade = Math.min(el.scrollTop, 48);
    const bottomRemaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    const bottomFade = Math.min(bottomRemaining, 48);
    el.style.setProperty('--_top-fade', `${topFade}px`);
    el.style.setProperty('--_bottom-fade', `${bottomFade}px`);
  }, []);

  useEffect(() => {
    (async () => {
      setStaffLoading(true);
      let query = supabase
        .from('staff')
        .select('id, name, role')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name', { ascending: true });
      if (roleFilter && roleFilter.length > 0) {
        query = query.in('role', roleFilter);
      }
      const { data } = await query;
      setStaffList(data || []);
      setStaffLoading(false);
    })();
  }, [company.id, roleFilter]);

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (step !== 'select' || staffLoading) return;
    const frame = requestAnimationFrame(syncStaffScrollState);
    return () => cancelAnimationFrame(frame);
  }, [step, staffLoading, filteredStaff.length, syncStaffScrollState]);

  const handleSelectStaff = useCallback((s) => {
    setSelectedStaff(s);
    setStep('pin');
    setPin('');
    setError(null);
  }, []);

  const handleStaffTouchStart = useCallback((e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchGestureRef.current = { x: touch.clientX, y: touch.clientY, moved: false };
  }, []);

  const handleStaffTouchMove = useCallback((e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchGestureRef.current.x);
    const dy = Math.abs(touch.clientY - touchGestureRef.current.y);
    if (dx > 8 || dy > 8) {
      touchGestureRef.current.moved = true;
    }
  }, []);

  const handleStaffButtonClick = useCallback(
    (e, staffMember) => {
      if (touchGestureRef.current.moved) {
        touchGestureRef.current.moved = false;
        e.preventDefault();
        return;
      }
      handleSelectStaff(staffMember);
    },
    [handleSelectStaff]
  );

  const handleBack = useCallback(() => {
    setStep('select');
    setSelectedStaff(null);
    setPin('');
    setError(null);
  }, []);

  const handleDigit = useCallback((digit) => {
    setError(null);
    setPin((prev) => (prev.length >= MAX_PIN ? prev : prev + digit));
  }, []);

  const handleBackspace = useCallback(() => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    const result = await pinLoginFor(selectedStaff.id, pin);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPin('');
      triggerShake();
    } else if (result.success) {
      onSuccess(result.staff);
    }
  }, [pin, selectedStaff, pinLoginFor, onSuccess, triggerShake]);

  // Staff skeleton
  const renderStaffSkeleton = () => (
    <div className="pinpad-staff-list scrollable">
      {[0, 1, 2].map((i) => (
        <div key={i} className="adm-sk adm-sk-row" />
      ))}
    </div>
  );

  // PIN dots — only show filled dots, reserve min-height so nothing shifts
  const renderDots = () => (
    <div ref={dotsRef} className={`sk-pin-dots${shaking ? ' shake' : ''}`}>
      {Array.from({ length: pin.length }, (_, i) => (
        <div key={i} className="sk-pin-dot" />
      ))}
    </div>
  );

  return (
    <div
      className={`pathway-page sk-page-full stakd-pattern-bg pathway-page--pinpad pathway-page--${step}`}
    >
      <div className="sk-auth-container">
        <div className="sk-auth-logo">
          <img src="/src/stakd-logo-text.svg" alt="stakd" height="35" />
        </div>

        {/* Step 1: Select a user */}
        {step === 'select' && (
          <div className="sk-auth-card pathway-card--staff-select">
            {onBack && (
              <button type="button" className="sk-back-btn" onClick={onBack}>
                <i className="fa-solid fa-arrow-left" />
                <span>Back</span>
              </button>
            )}
            <div className="sk-auth-card-header">
              <span className="sk-company-label">{company.name}</span>
              <h1 className="sk-auth-heading">
                {prompt || 'Select a manager to log in as'}
              </h1>
              <p className="sk-auth-subtext">Tap your name below to continue.</p>
            </div>

            <div className="sk-search-input">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {staffLoading ? (
              renderStaffSkeleton()
            ) : filteredStaff.length === 0 ? (
              <div className="pinpad-empty">
                <i className="fa-solid fa-user-xmark" />
                <p>No staff members found.</p>
              </div>
            ) : (
              <div
                className="pinpad-staff-list scrollable"
                ref={staffListRef}
                onScroll={handleStaffScroll}
              >
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="sk-staff-row"
                    onTouchStart={handleStaffTouchStart}
                    onTouchMove={handleStaffTouchMove}
                    onClick={(e) => handleStaffButtonClick(e, s)}
                  >
                    <div className="sk-avatar">{s.name.charAt(0).toUpperCase()}</div>
                    <div className="sk-staff-row-body">
                      <span className="sk-staff-row-name">{s.name}</span>
                      <span className="sk-staff-row-role">
                        {ROLE_LABELS[s.role] || s.role}
                      </span>
                    </div>
                    <i className="fa-solid fa-arrow-right sk-staff-row-arrow" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter PIN */}
        {step === 'pin' && selectedStaff && (
          <div className="sk-auth-card">
            <button type="button" className="sk-back-btn" onClick={handleBack}>
              <i className="fa-solid fa-arrow-left" />
              <span>Not {selectedStaff.name}?</span>
            </button>

            <div className="sk-auth-card-header">
              <span className="sk-company-label">{company.name}</span>
              <h1 className="sk-auth-heading">
                Hi {selectedStaff.name.split(' ')[0]}, enter your PIN
              </h1>
            </div>

            {renderDots()}

            {error && (
              <div className="pinpad-error">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </div>
            )}

            <div className="sk-pin-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  type="button"
                  className="sk-pin-key"
                  onClick={() => handleDigit(String(d))}
                  disabled={loading}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                className="sk-pin-key sk-pin-key--action"
                onClick={() => {
                  setPin('');
                  setError(null);
                }}
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="button"
                className="sk-pin-key"
                onClick={() => handleDigit('0')}
                disabled={loading}
              >
                0
              </button>
              <button
                type="button"
                className="sk-pin-key sk-pin-key--action"
                onClick={handleBackspace}
                disabled={loading}
              >
                <i className="fa-solid fa-delete-left" />
              </button>
            </div>

            <button
              type="button"
              className="sk-btn sk-btn-primary sk-btn-lg pathway-submit"
              onClick={handleSubmit}
              disabled={loading || pin.length < 4}
            >
              {loading ? (
                <span className="pathway-loading-text">
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  Verifying...
                </span>
              ) : (
                <>
                  <span>Enter</span>
                  <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
