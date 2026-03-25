import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useAnalytics(companyId, dateRange = 'month') {
  const [loading, setLoading] = useState(true);
  /** True while refetching after the first successful load (date range change, manual refresh). */
  const [refreshing, setRefreshing] = useState(false);
  const isFirstLoadRef = useRef(true);
  const [error, setError] = useState(null);
  /** Set when a background refresh (range change / refetch) fails; first-load errors use `error`. */
  const [refreshError, setRefreshError] = useState(null);
  const [analytics, setAnalytics] = useState({
    summary: {
      totalDrops: 0,
      totalAmount: 0,
      totalTarget: 0,
      variance: 0,
      variancePercent: 0,
      avgDropAmount: 0,
    },
    byStaff: [],
    byDay: [],
    alerts: [],
    topPerformers: [],
    lossPreventionFlags: [],
  });

  const calculateDateRange = useCallback(() => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return startDate.toISOString().split('T')[0];
  }, [dateRange]);

  const fetchAnalytics = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isFirstLoadRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    setRefreshError(null);

    try {
      const startDate = calculateDateRange();

      const { data: drops, error: dropsError } = await supabase
        .from('drops')
        .select(`
          id,
          amount_cents,
          target_cents,
          shift_date,
          created_at,
          staff:staff_id (
            id,
            name,
            role
          )
        `)
        .eq('company_id', companyId)
        .gte('shift_date', startDate)
        .order('created_at', { ascending: false });

      if (dropsError) throw dropsError;

      const totalDrops = drops.length;
      const totalAmount = drops.reduce((sum, d) => sum + d.amount_cents, 0);
      const totalTarget = drops.reduce((sum, d) => sum + d.target_cents, 0);
      const variance = totalAmount - totalTarget;
      const variancePercent = totalTarget > 0 ? (variance / totalTarget) * 100 : 0;
      const avgDropAmount = totalDrops > 0 ? totalAmount / totalDrops : 0;

      const staffMap = {};
      drops.forEach((drop) => {
        const staffId = drop.staff?.id;
        const staffName = drop.staff?.name || 'Unknown';
        
        if (!staffMap[staffId]) {
          staffMap[staffId] = {
            id: staffId,
            name: staffName,
            role: drop.staff?.role || 'cashier',
            totalDrops: 0,
            totalAmount: 0,
            totalTarget: 0,
            variance: 0,
            shortages: 0,
            overages: 0,
          };
        }
        
        const staff = staffMap[staffId];
        staff.totalDrops++;
        staff.totalAmount += drop.amount_cents;
        staff.totalTarget += drop.target_cents;
        
        const dropVariance = drop.amount_cents - drop.target_cents;
        staff.variance += dropVariance;
        
        if (dropVariance < -1000) staff.shortages++;
        if (dropVariance > 1000) staff.overages++;
      });

      const byStaff = Object.values(staffMap).sort((a, b) => b.totalAmount - a.totalAmount);

      const dayMap = {};
      drops.forEach((drop) => {
        const date = drop.shift_date;
        if (!dayMap[date]) {
          dayMap[date] = {
            date,
            totalDrops: 0,
            totalAmount: 0,
            totalTarget: 0,
            variance: 0,
          };
        }
        dayMap[date].totalDrops++;
        dayMap[date].totalAmount += drop.amount_cents;
        dayMap[date].totalTarget += drop.target_cents;
        dayMap[date].variance += (drop.amount_cents - drop.target_cents);
      });

      const byDay = Object.values(dayMap).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      const lossPreventionFlags = drops
        .filter((drop) => {
          const dropVariance = drop.amount_cents - drop.target_cents;
          return dropVariance < -6000;
        })
        .map((drop) => ({
          id: drop.id,
          staffName: drop.staff?.name || 'Unknown',
          amount: drop.amount_cents,
          target: drop.target_cents,
          variance: drop.amount_cents - drop.target_cents,
          date: drop.shift_date,
        }))
        .sort((a, b) => a.variance - b.variance)
        .slice(0, 10);

      const topPerformers = byStaff
        .filter((s) => s.totalDrops >= 3)
        .sort((a, b) => {
          const aAccuracy = Math.abs(a.variance / Math.max(1, a.totalTarget));
          const bAccuracy = Math.abs(b.variance / Math.max(1, b.totalTarget));
          return aAccuracy - bAccuracy;
        })
        .slice(0, 5);

      const alerts = [];
      
      if (variance < -10000) {
        alerts.push({
          type: 'warning',
          title: 'Significant Shortage Detected',
          message: `Total shortage of $${Math.abs(variance / 100).toFixed(2)} for this period`,
        });
      }

      if (lossPreventionFlags.length > 0) {
        alerts.push({
          type: 'alert',
          title: 'Loss Prevention Alert',
          message: `${lossPreventionFlags.length} drops with significant shortages (>$60)`,
        });
      }

      const recentShortageRate = drops.slice(0, 20).filter(d => 
        (d.amount_cents - d.target_cents) < -3000
      ).length / Math.min(20, drops.length);

      if (recentShortageRate > 0.3) {
        alerts.push({
          type: 'warning',
          title: 'Increasing Shortage Trend',
          message: `${(recentShortageRate * 100).toFixed(0)}% of recent drops show shortages`,
        });
      }

      setAnalytics({
        summary: {
          totalDrops,
          totalAmount,
          totalTarget,
          variance,
          variancePercent,
          avgDropAmount,
        },
        byStaff,
        byDay,
        alerts,
        topPerformers,
        lossPreventionFlags,
      });
      isFirstLoadRef.current = false;
    } catch (err) {
      console.error('Analytics fetch error:', err);
      if (isFirstLoadRef.current) {
        setError(err.message);
      } else {
        setRefreshError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, calculateDateRange]);

  useEffect(() => {
    isFirstLoadRef.current = true;
    setLoading(true);
    setRefreshing(false);
    setError(null);
    setRefreshError(null);
  }, [companyId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, refreshing, error, refreshError, refetch: fetchAnalytics };
}
