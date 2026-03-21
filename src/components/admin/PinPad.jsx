import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const handleStaffScroll = useCallback((e) => {
    const el = e.currentTarget;
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

  const handleSelectStaff = useCallback((s) => {
    setSelectedStaff(s);
    setStep('pin');
    setPin('');
    setError(null);
  }, []);

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

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Staff skeleton
  const renderStaffSkeleton = () => (
    <div className="pinpad-staff-list scrollable" style={{ gap: '10px' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="adm-sk adm-sk-row" style={{ animationDelay: `${i * .06}s` }} />
      ))}
    </div>
  );

  // PIN dots — only show filled dots, reserve min-height so nothing shifts
  const renderDots = () => (
    <div ref={dotsRef} className={`pin-dots${shaking ? ' shake' : ''}`}>
      {Array.from({ length: pin.length }, (_, i) => (
        <div key={i} className="pin-dot" />
      ))}
    </div>
  );

  return (
    <div className="pathway-page">
      <div className="pathway-container">
        <div className="pathway-brand">
          <div className="pathway-brand-icon">
            <img src="/favicon.svg" alt="Stakd" width="28" height="28" />
          </div>
          <span className="pathway-brand-name">stakd</span>
        </div>

        {/* Step 1: Select a user */}
        {step === 'select' && (
          <div className="pathway-card">
            {onBack && (
              <button className="pathway-back-btn" onClick={onBack}>
                <i className="fa-solid fa-arrow-left" />
                <span>Back</span>
              </button>
            )}
            <div className="pathway-card-header">
              <span className="pathway-eyebrow">{company.name}</span>
              <h1 className="pathway-title">{prompt || 'Select a manager to log in as'}</h1>
              <p className="pathway-subtitle">Tap your name below to continue.</p>
            </div>

            <div className="pinpad-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {staffLoading ? renderStaffSkeleton() : filteredStaff.length === 0 ? (
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
                    className="pinpad-staff-btn"
                    onClick={() => handleSelectStaff(s)}
                  >
                    <div className="pinpad-staff-avatar">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="pinpad-staff-info">
                      <span className="pinpad-staff-name">{s.name}</span>
                      <span className="pinpad-staff-role">{ROLE_LABELS[s.role] || s.role}</span>
                    </div>
                    <i className="fa-solid fa-arrow-right pinpad-staff-arrow" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter PIN */}
        {step === 'pin' && selectedStaff && (
          <div className="pathway-card">
            <button className="pathway-back-btn" onClick={handleBack}>
              <i className="fa-solid fa-arrow-left" />
              <span>Not {selectedStaff.name}?</span>
            </button>

            <div className="pathway-card-header">
              <span className="pathway-eyebrow">{company.name}</span>
              <h1 className="pathway-title">
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

            <div className="pinpad-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  className="pinpad-key"
                  onClick={() => handleDigit(String(d))}
                  disabled={loading}
                >
                  {d}
                </button>
              ))}
              <button
                className="pinpad-key pinpad-key-action"
                onClick={() => { setPin(''); setError(null); }}
                disabled={loading}
              >
                Clear
              </button>
              <button
                className="pinpad-key"
                onClick={() => handleDigit('0')}
                disabled={loading}
              >
                0
              </button>
              <button
                className="pinpad-key pinpad-key-action"
                onClick={handleBackspace}
                disabled={loading}
              >
                <i className="fa-solid fa-delete-left" />
              </button>
            </div>

            <button
              className="pathway-submit"
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
