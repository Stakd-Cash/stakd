import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

// --- Safe staff fields (never includes pin_hash or pin_salt) ---
const STAFF_SAFE_FIELDS = 'id, company_id, user_id, name, role, permissions, active, created_at';

function stripSensitiveFields(obj) {
  if (!obj) return obj;
  const { pin_hash, pin_salt, ...safe } = obj;
  return safe;
}

export const useAuthStore = create((set, get) => ({
  // Auth state
  session: null,
  user: null,
  loading: true,
  error: null,

  // Company & staff context (set after login)
  company: null,
  staff: null, // the auth account's own staff record
  activeStaff: null, // the currently PIN-identified staff member (cashier on shared device)

  // Initialize — call once on app mount
  _authSubscription: null,
  _loadingContext: false, // guard against concurrent loadCompanyContext
  init: async () => {
    // Unsubscribe previous listener if any (hot-reload safety)
    const prev = get()._authSubscription;
    if (prev) { prev.unsubscribe(); set({ _authSubscription: null }); }

    try {
      // Guest kiosk must not hang forever if getSession stalls (offline, blocked, or network issues).
      const SESSION_INIT_MS = 10000;
      const { data: { session } = { session: null } } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ data: { session: null } }),
            SESSION_INIT_MS
          );
        }),
      ]);
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        await get().loadCompanyContext();
      }
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }

    // Listen for auth changes (login, logout — NOT token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null });
      // Only reload company context on real sign-in/out, not token refreshes
      if (event === 'SIGNED_IN') {
        if (!get().company) {
          set({ loading: true });
          await get().loadCompanyContext();
          set({ loading: false });
        }
      } else if (event === 'SIGNED_OUT') {
        set({ company: null, staff: null, activeStaff: null, kioskMode: false, kioskLoginTime: null });
      }
    });
    set({ _authSubscription: subscription });
  },

  // Load the company and staff record for the current user (C2: uses safe fields only)
  loadCompanyContext: async () => {
    if (get()._loadingContext) return; // prevent concurrent calls
    const user = get().user;
    if (!user) return;
    set({ _loadingContext: true });

    // Check if user owns a company
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (company) {
      // Get their staff record (safe fields only — no pin_hash/pin_salt)
      const { data: staff } = await supabase
        .from('staff')
        .select(STAFF_SAFE_FIELDS)
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .maybeSingle();

      set({ company, staff: stripSensitiveFields(staff), _loadingContext: false });
      return;
    }

    // Check if user is staff at any company
    const { data: staffRecord } = await supabase
      .from('staff')
      .select(STAFF_SAFE_FIELDS + ', companies(*)')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (staffRecord) {
      const { companies, ...staffOnly } = staffRecord;
      set({ company: companies, staff: stripSensitiveFields(staffOnly) });
    }
    set({ _loadingContext: false });
  },

  // Sign up a new owner + create their company
  signUp: async (email, password, companyName, companySlug, ownerPin) => {
    set({ loading: true, error: null });
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpErr) throw signUpErr;

      // If there's no session, user must confirm their email first
      if (!data.session) {
        set({ loading: false });
        return { needsConfirmation: true };
      }
      const user = data.user;

      // Target architecture (not implemented): defer companies/staff inserts until
      // checkout.session.completed — keep signup fields in sessionStorage or Stripe metadata,
      // webhook creates the row and marks active_subscription. Today we create the company
      // here so checkout sessions can reference companyId.
      const { data: company, error: compErr } = await supabase
        .from('companies')
        .insert({ name: companyName, slug: companySlug, owner_id: user.id })
        .select()
        .single();
      if (compErr) throw compErr;

      // Create owner staff record with the PIN they chose during signup
      const salt = generateSalt();
      const pinHash = await hashPin(ownerPin || '0000', salt);
      const { data: staff, error: staffErr } = await supabase
        .from('staff')
        .insert({
          company_id: company.id,
          user_id: user.id,
          name: email.split('@')[0],
          pin_hash: pinHash,
          pin_salt: salt,
          role: 'owner',
          permissions: {
            can_view_dashboard: true,
            can_edit_users: true,
            can_promote_managers: true,
          },
        })
        .select(STAFF_SAFE_FIELDS)
        .single();
      if (staffErr) throw staffErr;

      set({ company, staff: stripSensitiveFields(staff), loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { error: err.message };
    }
  },

  // Sign in existing user
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Set user immediately and load company context before returning
      set({ session: data.session, user: data.session?.user ?? null });
      await get().loadCompanyContext();
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { error: err.message };
    }
  },

  // PIN login — server-side verification via Supabase RPC (C1: never exposes hash to client)
  pinLoginFor: async (staffId, pin) => {
    try {
      // Step 1: fetch only the salt via server-side RPC (never returns the hash)
      const { data: salt, error: saltErr } = await supabase.rpc('get_pin_salt', {
        p_staff_id: staffId,
      });
      if (saltErr) return { error: saltErr.message };
      if (salt == null) return { error: 'Staff not found.' };

      // Step 2: hash the PIN client-side with the retrieved salt
      const pinHash = await hashPin(pin, salt);

      // Step 3: send the hash to the server for comparison (rate-limited server-side)
      const { data: result, error: rpcErr } = await supabase.rpc('verify_pin', {
        p_staff_id: staffId,
        p_pin_hash: pinHash,
      });
      if (rpcErr) return { error: rpcErr.message };
      if (!result || !result.success) {
        return { error: result?.error || 'Verification failed.' };
      }

      // Success — store only safe fields (no pin_hash/pin_salt)
      const safeStaff = {
        id: result.staff_id,
        name: result.name,
        role: result.role,
        permissions: result.permissions,
        company_id: result.company_id,
      };
      set({ activeStaff: safeStaff, kioskLoginTime: Date.now() });
      return { success: true, staff: safeStaff };
    } catch (err) {
      return { error: err.message || 'PIN verification failed.' };
    }
  },

  // Save a drop to Supabase (with offline queue fallback)
  saveDrop: async ({ amountCents, targetCents, dropDetails, note }) => {
    const { company, activeStaff, staff } = get();
    const currentStaff = activeStaff || staff;
    if (!company || !currentStaff) return { error: 'No staff session.' };

    const dropPayload = {
      id: crypto.randomUUID(), // idempotency: prevents duplicate inserts on retry
      company_id: company.id,
      staff_id: currentStaff.id,
      amount_cents: amountCents,
      target_cents: targetCents,
      drop_details: dropDetails,
      shift_date: new Date().toISOString().slice(0, 10),
      ...(note ? { note } : {}),
    };

    // If offline, queue for later sync
    if (!navigator.onLine) {
      queueOfflineDrop(dropPayload);
      return { success: true, queued: true };
    }

    const { data, error } = await supabase
      .from('drops')
      .insert(dropPayload)
      .select()
      .single();

    if (error) {
      // Network error — queue offline
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        queueOfflineDrop(dropPayload);
        return { success: true, queued: true };
      }
      return { error: error.message };
    }
    return { success: true, drop: data };
  },

  // Flush any queued offline drops
  syncOfflineDrops: async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return { synced: 0 };
    let synced = 0;
    const remaining = [];
    for (const drop of queue) {
      const { error } = await supabase.from('drops').insert(drop);
      if (error) {
        remaining.push(drop);
      } else {
        synced++;
      }
    }
    setOfflineQueue(remaining);
    return { synced, remaining: remaining.length };
  },

  // Get count of queued drops
  getOfflineQueueCount: () => getOfflineQueue().length,

  // PIN logout — clear the active cashier, return to PIN screen
  pinLogout: () => set({ activeStaff: null, kioskLoginTime: null }),

  // Kiosk session tracking
  kioskMode: false, // true when device is in kiosk (cashier PIN) mode
  setKioskMode: (val) => set({ kioskMode: val }),
  kioskLoginTime: null,

  // Delete company (owner only — cascades to staff, drops, audit_log via FK)
  deleteCompany: async () => {
    const { company, user } = get();
    if (!company || company.owner_id !== user?.id) return { error: 'Only the owner can delete this company.' };
    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) return { error: error.message };
    set({ company: null, staff: null, activeStaff: null, kioskMode: false, kioskLoginTime: null });
    return { success: true };
  },

  // Sign out (M4: clear offline queue on sign-out)
  signOut: async () => {
    clearOfflineQueue();
    await supabase.auth.signOut();
    set({ session: null, user: null, company: null, staff: null, activeStaff: null, kioskMode: false, kioskLoginTime: null });
  },

  clearError: () => set({ error: null }),
}));

// --- Utility: hash a PIN with HMAC-SHA256 + salt (M2: no hardcoded fallback) ---
async function hashPin(pin, salt) {
  if (!salt) throw new Error('PIN salt is required.');
  const encoder = new TextEncoder();
  const keyData = encoder.encode(salt);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(pin));
  const hashArray = Array.from(new Uint8Array(sig));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export { hashPin, generateSalt };

// --- Offline drop queue (localStorage) ---
const OFFLINE_QUEUE_KEY = 'stakd_offline_drops';

function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch { return []; }
}

function setOfflineQueue(queue) {
  try { localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

function queueOfflineDrop(payload) {
  const queue = getOfflineQueue();
  queue.push({ ...payload, _queuedAt: Date.now() });
  setOfflineQueue(queue);
}

function clearOfflineQueue() {
  try { localStorage.removeItem(OFFLINE_QUEUE_KEY); } catch {}
}

// Auto-sync when coming back online or returning to foreground
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAuthStore.getState().syncOfflineDrops();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      useAuthStore.getState().syncOfflineDrops();
    }
  });
}
