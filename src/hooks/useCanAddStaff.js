import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { getSeatLimitNotice } from '../lib/billing.js';

/**
 * Hook that checks whether the current company can add another staff member
 * based on its billing plan and seat limit.
 *
 * Returns:
 *   canAdd        — true if another seat is available
 *   seatLimitReached — true if the active staff count >= seat_limit (and not unlimited)
 *   staffCount    — current number of active staff
 *   seatLimit     — company's seat_limit value (-1 = unlimited)
 *   plan          — company's current plan key
 *   notice        — human-readable seat-limit message (null if seats available)
 *   loading       — true while the check is running
 *   refresh       — call to re-check seat availability
 */
export function useCanAddStaff(companyId, companyDefaults = {}) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState({
    staffCount: null,
    seatLimit: companyDefaults.seat_limit ?? 0,
    plan: companyDefaults.plan ?? 'none',
  });

  const refresh = useCallback(async () => {
    if (!companyId) return null;

    setLoading(true);
    const [staffResult, companyResult] = await Promise.all([
      supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('active', true),
      supabase
        .from('companies')
        .select('plan, seat_limit')
        .eq('id', companyId)
        .maybeSingle(),
    ]);
    setLoading(false);

    if (staffResult.error) throw staffResult.error;
    if (companyResult.error) throw companyResult.error;

    const next = {
      staffCount: staffResult.count ?? 0,
      seatLimit: companyResult.data?.seat_limit ?? companyDefaults.seat_limit ?? 0,
      plan: companyResult.data?.plan ?? companyDefaults.plan ?? 'none',
    };

    setSnapshot(next);
    return next;
  }, [companyId, companyDefaults.seat_limit, companyDefaults.plan]);

  const { staffCount, seatLimit, plan } = snapshot;

  // seat_limit = -1 means unlimited (Pro plan)
  const seatLimitReached =
    seatLimit !== -1 && staffCount !== null && staffCount >= seatLimit;

  const canAdd = !seatLimitReached;
  const notice = seatLimitReached ? getSeatLimitNotice(plan) : null;

  return {
    canAdd,
    seatLimitReached,
    staffCount,
    seatLimit,
    plan,
    notice,
    loading,
    refresh,
    setSnapshot,
  };
}
