import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase.js';
import { hashPin, generateSalt, useAuthStore } from '../../store/useAuthStore.js';
import { CustomSelect } from './UIComponents.jsx';

const PERMISSIONS = [
  {
    key: 'can_view_dashboard',
    label: 'View manager dashboard',
    children: [
      { key: 'can_edit_users', label: 'Edit staff members' },
      { key: 'can_promote_managers', label: 'Promote / demote managers' },
    ],
  },
];

const ROLE_LABELS = { cashier: 'Crew Member', manager: 'Manager', owner: 'Owner' };

export function StaffPanel({ company, openAddRequest = 0, onOnboardingAddSuccess }) {
  const currentStaff = useAuthStore((s) => s.activeStaff || s.staff);
  const currentRole = currentStaff?.role || 'cashier';
  const currentPerms = currentStaff?.permissions || {};
  const canEdit = currentRole === 'owner' || currentPerms.can_edit_users;
  const canPromote = currentRole === 'owner' || currentPerms.can_promote_managers;
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Slide-over edit state
  const [editing, setEditing] = useState(null); // full staff object or null
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('cashier');
  const [editPin, setEditPin] = useState('');
  const [editPerms, setEditPerms] = useState({});
  const [editError, setEditError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('cashier');
  const [addError, setAddError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null); // staff object to confirm
  const [toggleError, setToggleError] = useState(null);
  const [showMyPinChange, setShowMyPinChange] = useState(false);
  const [myCurrentPin, setMyCurrentPin] = useState('');
  const [myPin, setMyPin] = useState('');
  const [myPinConfirm, setMyPinConfirm] = useState('');
  const [myPinError, setMyPinError] = useState(null);
  const [myPinSaving, setMyPinSaving] = useState(false);
  const addNameInputRef = useRef(null);
  const onboardingAddFlowRef = useRef(false);

  const companyId = company?.id;

  useEffect(() => {
    if (!companyId) return;
    const ctrl = { cancelled: false };
    loadStaff(ctrl);
    return () => { ctrl.cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    if (!openAddRequest || !canEdit) return undefined;

    onboardingAddFlowRef.current = true;
    setShowAdd(true);
    setAddError(null);
    setNewName('');
    setNewPin('');
    setNewRole('cashier');

    const raf = window.requestAnimationFrame(() => {
      addNameInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(raf);
  }, [canEdit, openAddRequest]);

  async function loadStaff(ctrl) {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('id, company_id, user_id, name, role, permissions, active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (ctrl && ctrl.cancelled) return;
    if (!error) setStaffList(data || []);
    setLoading(false);
  }

  async function handleAddStaff(e) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);

    try {
      if (newPin.length < 4) {
        throw new Error('PIN must be at least 4 digits.');
      }

      const salt = generateSalt();
      const pinHash = await hashPin(newPin, salt);
      const { error } = await supabase.from('staff').insert({
        company_id: company.id,
        name: newName.trim(),
        pin_hash: pinHash,
        pin_salt: salt,
        role: newRole,
      });

      if (error) throw error;

      setNewName('');
      setNewPin('');
      setNewRole('cashier');
      setShowAdd(false);
      await loadStaff({ cancelled: false });
      if (onboardingAddFlowRef.current) {
        onboardingAddFlowRef.current = false;
        onOnboardingAddSuccess?.();
      }
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  const handleToggleAddForm = useCallback(() => {
    onboardingAddFlowRef.current = false;
    setAddError(null);
    setShowAdd((open) => !open);
  }, []);

  const openEdit = useCallback((s) => {
    setEditing(s);
    setEditName(s.name);
    setEditRole(s.role);
    setEditPin('');
    setEditPerms(s.permissions || {});
    setEditError(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setEditError(null);
  }, []);

  const togglePerm = useCallback((key) => {
    setEditPerms((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  async function handleSaveEdit(e) {
    e.preventDefault();
    setEditError(null);
    setSaving(true);

    try {
      const updates = {
        name: editName.trim(),
        role: editRole,
        permissions: editPerms,
      };
      if (editPin.length > 0 && editPin.length < 4) {
        throw new Error('PIN must be at least 4 digits.');
      }

      const { error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', editing.id);

      if (error) throw error;

      // If PIN was changed, use server-side RPC
      if (editPin.length > 0) {
        const newSalt = generateSalt();
        const newPinHash = await hashPin(editPin, newSalt);
        const { data: pinResult, error: pinErr } = await supabase.rpc('change_pin', {
          p_staff_id: editing.id,
          p_current_pin_hash: '', // admin override — no current PIN needed
          p_new_pin_hash: newPinHash,
          p_new_pin_salt: newSalt,
        });
        if (pinErr) throw pinErr;
        if (pinResult && !pinResult.success) throw new Error(pinResult.error);
      }

      closeEdit();
      await loadStaff({ cancelled: false });
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(staffMember) {
    // If deactivating (currently active), require confirmation
    if (staffMember.active) {
      setConfirmDeactivate(staffMember);
      return;
    }
    await doToggleActive(staffMember);
  }

  async function doToggleActive(staffMember) {
    setToggleError(null);
    const { error } = await supabase
      .from('staff')
      .update({ active: !staffMember.active })
      .eq('id', staffMember.id);
    if (error) {
      setToggleError(error.message);
      return;
    }
    setConfirmDeactivate(null);
    await loadStaff({ cancelled: false });
  }

  // Self-service PIN change — requires current PIN, uses server-side RPC (M1 + C1)
  async function handleMyPinChange(e) {
    e.preventDefault();
    setMyPinError(null);
    if (myCurrentPin.length < 4) { setMyPinError('Enter your current PIN.'); return; }
    if (myPin.length < 4) { setMyPinError('New PIN must be at least 4 digits.'); return; }
    if (myPin !== myPinConfirm) { setMyPinError('PINs do not match.'); return; }
    setMyPinSaving(true);
    try {
      // Fetch current salt to hash the current PIN for verification
      const { data: currentSalt, error: saltErr } = await supabase.rpc('get_pin_salt', {
        p_staff_id: currentStaff.id,
      });
      if (saltErr) throw saltErr;
      if (!currentSalt) throw new Error('Could not retrieve PIN data.');

      const currentPinHash = await hashPin(myCurrentPin, currentSalt);
      const newSalt = generateSalt();
      const newPinHash = await hashPin(myPin, newSalt);

      const { data: result, error: rpcErr } = await supabase.rpc('change_pin', {
        p_staff_id: currentStaff.id,
        p_current_pin_hash: currentPinHash,
        p_new_pin_hash: newPinHash,
        p_new_pin_salt: newSalt,
      });
      if (rpcErr) throw rpcErr;
      if (!result || !result.success) throw new Error(result?.error || 'PIN change failed.');

      setShowMyPinChange(false);
      setMyCurrentPin('');
      setMyPin('');
      setMyPinConfirm('');
    } catch (err) {
      setMyPinError(err.message);
    } finally {
      setMyPinSaving(false);
    }
  }

  const activeStaff = staffList.filter((s) => s.active);
  const inactiveStaff = staffList.filter((s) => !s.active);

  const getInitials = (name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderStaffCard = (s) => (
    <div
      key={s.id}
      className={`admin-staff-card${s.active ? '' : ' inactive'}${editing?.id === s.id ? ' selected' : ''}`}
      onClick={() => openEdit(s)}
      role="button"
      tabIndex={0}
    >
      <div className="admin-staff-info">
        <div className="admin-staff-avatar">{getInitials(s.name)}</div>
        <div>
          <span className="admin-staff-name">{s.name}</span>
          <div><span className={`admin-role-tag ${s.role}`}>{ROLE_LABELS[s.role] || s.role}</span></div>
        </div>
      </div>
      <div className="admin-staff-actions" onClick={(e) => e.stopPropagation()}>
        {s.role !== 'owner' && s.id !== currentStaff?.id && canEdit && (
          <button
            className="admin-btn-sm"
            onClick={() => toggleActive(s)}
          >
            {s.active ? 'Deactivate' : 'Activate'}
          </button>
        )}
        {canEdit && <i className="fa-solid fa-chevron-right" style={{ color: 'var(--t2)', fontSize: 12 }} />}
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>Staff</h2>
        {canEdit && (
          <button
            className="admin-btn-sm"
            onClick={handleToggleAddForm}
          >
            <i className={`fa-solid ${showAdd ? 'fa-xmark' : 'fa-plus'}`} />
            {showAdd ? ' Cancel' : ' Add Staff'}
          </button>
        )}
      </div>

      {/* Self-service PIN change button */}
      {currentStaff && (
        <div style={{ marginBottom: 8 }}>
          <button
            className="admin-btn-sm"
            onClick={() => { setShowMyPinChange(!showMyPinChange); setMyPinError(null); setMyCurrentPin(''); setMyPin(''); setMyPinConfirm(''); }}
          >
            <i className={`fa-solid ${showMyPinChange ? 'fa-xmark' : 'fa-key'}`} />
            {showMyPinChange ? ' Cancel' : ' Change My PIN'}
          </button>
          {showMyPinChange && (
            <form onSubmit={handleMyPinChange} className="admin-add-form" style={{ marginTop: 8 }}>
              <label className="admin-field">
                <span>Current PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={myCurrentPin}
                  onChange={(e) => setMyCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  placeholder="••••"
                  minLength={4}
                  maxLength={8}
                />
              </label>
              <label className="admin-field">
                <span>New PIN (4+ digits)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={myPin}
                  onChange={(e) => setMyPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  placeholder="••••"
                  minLength={4}
                  maxLength={8}
                />
              </label>
              <label className="admin-field">
                <span>Confirm PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={myPinConfirm}
                  onChange={(e) => setMyPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  placeholder="••••"
                  minLength={4}
                  maxLength={8}
                />
              </label>
              {myPinError && <div className="admin-error">{myPinError}</div>}
              <button type="submit" className="admin-submit" disabled={myPinSaving}>
                {myPinSaving ? 'Saving...' : 'Update PIN'}
              </button>
            </form>
          )}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleAddStaff} className="admin-add-form">
          <label className="admin-field">
            <span>Name</span>
            <input
              ref={addNameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Jane Smith"
              maxLength={100}
              autoFocus
            />
          </label>
          <label className="admin-field">
            <span>PIN (4+ digits)</span>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              required
              placeholder="••••"
              minLength={4}
              maxLength={8}
            />
          </label>
          <label className="admin-field">
            <span>Role</span>
            <CustomSelect 
              value={newRole} 
              onChange={setNewRole}
              options={[
                { value: 'cashier', label: 'Crew Member' },
                { value: 'manager', label: 'Manager' }
              ]}
            />
          </label>
          {addError && <div className="admin-error">{addError}</div>}
          <button type="submit" className="admin-submit" disabled={adding}>
            {adding ? 'Adding...' : 'Add Staff Member'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="admin-loading-inline">
          <div className="admin-spinner" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="adm-sk adm-sk-row" style={{ animationDelay: `${i * .06}s` }} />
            ))}
          </div>
        </div>
      ) : staffList.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fa-solid fa-user-plus" />
          <p>No staff members yet. Add your first one above.</p>
        </div>
      ) : (
        <>
          <div className="admin-staff-section">
            <div className="admin-staff-section-title">
              Active ({activeStaff.length})
            </div>
            {activeStaff.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '12px' }}>
                <p>No active staff members.</p>
              </div>
            ) : (
              <div className="admin-staff-list">
                {activeStaff.map(renderStaffCard)}
              </div>
            )}
          </div>
          {inactiveStaff.length > 0 && (
            <div className="admin-staff-section">
              <div className="admin-staff-section-title deactivated">
                Deactivated ({inactiveStaff.length})
              </div>
              <div className="admin-staff-list">
                {inactiveStaff.map(renderStaffCard)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Deactivate confirmation */}
      {confirmDeactivate && createPortal(
        <div className="modal-backdrop" onClick={() => setConfirmDeactivate(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span className="modal-eyebrow">Confirm action</span>
              <br />
              Confirm Deactivation
            </div>
            <div className="modal-body">
              Are you sure you want to deactivate <strong>{confirmDeactivate.name}</strong>?<br />
              They will no longer be able to log in via PIN.
              {toggleError && <div className="admin-error" style={{ marginTop: 12 }}>{toggleError}</div>}
            </div>
            <div className="modal-actions">
              <button className="modal-btn danger" onClick={() => doToggleActive(confirmDeactivate)}>
                Deactivate
              </button>
              <button className="modal-btn cancel" onClick={() => setConfirmDeactivate(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit staff modal */}
      {canEdit && editing && createPortal(
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span className="modal-eyebrow">Staff profile</span>
              <br />
              Edit {editing.name}
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form-body">
              <label className="admin-field">
                <span>Name</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>

              {editing.role !== 'owner' && canPromote && (
                <label className="admin-field">
                  <span>Role</span>
                  <CustomSelect 
                    value={editRole} 
                    onChange={setEditRole}
                    options={[
                      { value: 'cashier', label: 'Crew Member' },
                      { value: 'manager', label: 'Manager' }
                    ]}
                  />
                </label>
              )}

              <label className="admin-field">
                <span>New PIN (leave blank to keep current)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••"
                  maxLength={8}
                />
              </label>

              {/* Permissions — only shown for managers/owners */}
              {(editRole === 'manager' || editing.role === 'owner') && (
                <div className="staff-drawer-perms">
                  <span className="admin-field-label">Permissions</span>
                  {PERMISSIONS.map((p) => (
                    <React.Fragment key={p.key}>
                      <label className="staff-perm-toggle">
                        <span>{p.label}</span>
                        <button
                          type="button"
                          className={`perm-switch${editPerms[p.key] ? ' on' : ''}`}
                          onClick={() => togglePerm(p.key)}
                          aria-pressed={!!editPerms[p.key]}
                        >
                          <span className="perm-switch-knob" />
                        </button>
                      </label>
                      {p.children && p.children.length > 0 && (
                        <div className="staff-perm-sub">
                          {p.children.map((child) => (
                            <label
                              key={child.key}
                              className={`staff-perm-toggle${!editPerms[p.key] ? ' disabled' : ''}`}
                            >
                              <span>{child.label}</span>
                              <button
                                type="button"
                                className={`perm-switch${editPerms[child.key] ? ' on' : ''}`}
                                onClick={() => editPerms[p.key] && togglePerm(child.key)}
                                aria-pressed={!!editPerms[child.key]}
                                disabled={!editPerms[p.key]}
                              >
                                <span className="perm-switch-knob" />
                              </button>
                            </label>
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {editError && <div className="admin-error">{editError}</div>}

              <div className="modal-actions">
                <button type="submit" className="modal-btn primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="modal-btn cancel" onClick={closeEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
