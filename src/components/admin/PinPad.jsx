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
    <div className="pin-staff-list scrollable" style={{ gap: '10px' }}>
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
    <div className="pin-pad-page">
      <div className="admin-pin-container">
        <div className="pin-pad-header">
          <img src="/favicon.png" alt="stakd" width="48" height="48" />
          <div className="pin-pad-title">
            <h2>{company.name}</h2>
            <span className="admin-slug-badge">{company.slug}</span>
          </div>
        </div>

        {/* Step 1: Select a user */}
        {step === 'select' && (
          <div className="pin-pad-card">
            {onBack && (
              <button className="pin-back-btn" onClick={onBack}>
                <i className="fa-solid fa-arrow-left" /> Back
              </button>
            )}
            <p className="pin-pad-prompt">{prompt || 'Select a manager to log in as'}</p>
            
            <div className="admin-search-bar" style={{ marginBottom: '16px', marginTop: '12px' }}>
              <i className="fa-solid fa-search" />
              <input 
                type="text" 
                placeholder="Search staff..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-settings-input"
                style={{ width: '100%', height: '44px', paddingLeft: '40px' }}
              />
            </div>

            {staffLoading ? renderStaffSkeleton() : filteredStaff.length === 0 ? (
              <div className="admin-empty-state">
                <i className="fa-solid fa-user-xmark" />
                <p>No staff members found.</p>
              </div>
            ) : (
              <div className="pin-staff-list scrollable">
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    className="pin-staff-btn"
                    onClick={() => handleSelectStaff(s)}
                  >
                    <span className="pin-staff-name">{s.name}</span>
                    <span className={`admin-role-tag ${s.role}`}>{ROLE_LABELS[s.role] || s.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter PIN */}
        {step === 'pin' && selectedStaff && (
          <div className="pin-pad-card">
            <button className="pin-back-btn" onClick={handleBack}>
              <i className="fa-solid fa-arrow-left" /> Not {selectedStaff.name}?
            </button>

            <p className="pin-pad-prompt">
              Hi {selectedStaff.name.split(' ')[0]}, enter your PIN
            </p>

            {renderDots()}

            {error && <div className="admin-error">{error}</div>}

            <div className="pin-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  className="pin-key"
                  onClick={() => handleDigit(String(d))}
                  disabled={loading}
                >
                  {d}
                </button>
              ))}
              <button
                className="pin-key pin-key-action"
                onClick={() => { setPin(''); setError(null); }}
                disabled={loading}
              >
                Clear
              </button>
              <button
                className="pin-key"
                onClick={() => handleDigit('0')}
                disabled={loading}
              >
                0
              </button>
              <button
                className="pin-key pin-key-action"
                onClick={handleBackspace}
                disabled={loading}
              >
                <i className="fa-solid fa-delete-left" />
              </button>
            </div>

            <button
              className="admin-submit pin-submit"
              onClick={handleSubmit}
              disabled={loading || pin.length < 4}
            >
              {loading ? (
                <><div className="admin-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Verifying...</>
              ) : (
                <><i className="fa-solid fa-lock" /> Enter</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
