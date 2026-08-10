'use client';

import { useState, useEffect } from 'react';
import { apiFetch, CreditsResponse } from '@/lib/api';
import { Coins, RefreshCw } from 'lucide-react';

export function useCredits() {
  const [credits, setCreditsState] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);

  // Load initial from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flyer_credits');
    if (saved !== null) {
      setCreditsState(parseInt(saved, 10));
    }
  }, []);

  const setCredits = (value: number | ((prev: number) => number)) => {
    setCreditsState((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('flyer_credits', newValue.toString());
      return newValue;
    });
  };

  const refreshCredits = async () => {
    setLoading(true);
    // For this dummy frontend demo, we rely entirely on localStorage
    // instead of querying the backend which might reset the balance to 10.
    setTimeout(() => {
      const saved = localStorage.getItem('flyer_credits');
      if (saved !== null) {
        setCreditsState(parseInt(saved, 10));
      }
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    refreshCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { credits, setCredits, refreshCredits, loading };
}

export function CreditBadge({ credits, loading, onRefresh }: { credits: number; loading?: boolean; onRefresh?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold shadow-sm">
      <Coins className="w-4 h-4 text-amber-500" />
      <span>{credits} {credits === 1 ? 'Credit' : 'Credits'} Available</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="hover:rotate-180 transition-transform p-0.5 text-amber-500"
          title="Refresh credits balance"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
