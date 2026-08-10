'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch, ModuleItem } from '@/lib/api';
import Sidebar from './Sidebar';
import LoginScreen from './LoginScreen';
import { useCredits } from './Credits';

interface AppContextType {
  isAuthenticated: boolean;
  activeModule: string;
  setActiveModule: (id: string) => void;
  modules: ModuleItem[];
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  refreshCredits: () => Promise<void>;
  creditsLoading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

const DEMO_MODULES: ModuleItem[] = [
  { id: 'notebook_sticker', name: 'Notebook Sticker', enabled: true },
  { id: 'event_flyer', name: 'Event Flyer', enabled: true },
  { id: 'id_card', name: 'ID Card / Badge', enabled: false },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeModule, setActiveModule] = useState<string>('notebook_sticker');
  const [modules, setModules] = useState<ModuleItem[]>(DEMO_MODULES);
  
  const { credits, setCredits, refreshCredits, loading: creditsLoading } = useCredits();

  useEffect(() => {
    async function initAuth() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setIsAuthenticated(true);
      }
      setIsInitializing(false);

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setIsAuthenticated(!!session?.user);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
    initAuth();
  }, []);

  useEffect(() => {
    async function fetchModules() {
      try {
        const data = await apiFetch<ModuleItem[]>('/modules');
        if (Array.isArray(data) && data.length > 0) {
          const enabledOnly = data.filter((m) => m.enabled);
          setModules(enabledOnly);
          // Only update active if not set or invalid
          if (enabledOnly.length > 0 && !enabledOnly.some((m) => m.id === activeModule) && activeModule !== 'history') {
            setActiveModule(enabledOnly[0].id);
          }
        }
      } catch (err) {
        console.warn('GET /modules failed, falling back to demo modules:', err);
      }
    }
    fetchModules();
  }, [activeModule]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setActiveModule('notebook_sticker');
  };

  const contextValue = {
    isAuthenticated,
    activeModule,
    setActiveModule,
    modules,
    credits,
    setCredits,
    refreshCredits,
    creditsLoading,
    signOut,
  };

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      {isAuthenticated ? (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen overflow-x-hidden relative">
            {children}
          </main>
        </div>
      ) : (
        <LoginScreen onBypass={() => setIsAuthenticated(true)} />
      )}
    </AppContext.Provider>
  );
}
