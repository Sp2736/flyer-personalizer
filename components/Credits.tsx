'use client';

import { useState, useEffect } from 'react';
import { apiFetch, CreditsResponse } from '@/lib/api';
import { Coins, RefreshCw } from 'lucide-react';

export function useCredits() {
  const [credits, setCredits] = useState<number>(5); // default fallback initial balance
  const [loading, setLoading] = useState<boolean>(false);

  const refreshCredits = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<CreditsResponse>('/credits');
      if (typeof res?.remaining === 'number') {
        setCredits(res.remaining);
      }
    } catch (err) {
      console.warn('GET /credits endpoint offline, using local credit state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCredits();
  }, []);

  return { credits, setCredits, refreshCredits, loading };
}

export function CreditBadge({ credits, loading, onRefresh }: { credits: number; loading?: boolean; onRefresh?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
      <Coins className="w-4 h-4 text-amber-400" />
      <span>{credits} {credits === 1 ? 'Credit' : 'Credits'} Available</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="hover:rotate-180 transition-transform p-0.5 text-amber-400"
          title="Refresh credits balance"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
