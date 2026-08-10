'use client';

import React from 'react';
import { useApp } from './ClientLayout';
import { CreditBadge } from './Credits';
import { 
  LogOut, 
  History, 
  LayoutGrid, 
  FileImage,
  Ticket,
  Badge,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap: Record<string, React.ReactNode> = {
  'notebook_sticker': <FileImage className="w-4 h-4" />,
  'event_flyer': <Ticket className="w-4 h-4" />,
  'id_card': <Badge className="w-4 h-4" />
};

export default function Sidebar() {
  const { modules, activeModule, setActiveModule, signOut, credits, creditsLoading, refreshCredits } = useApp();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 fixed top-0 left-0 h-screen flex flex-col z-50">
      {/* Header / Logo */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <img src="/logo.jpg" alt="Logo" className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-sm" />
        <span className="font-heading font-bold text-lg text-slate-900 tracking-tight">
          Poster Gen
        </span>
      </div>

      {/* Navigation Modules */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Create
          </h3>
          <nav className="space-y-1">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                disabled={!mod.enabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeModule === mod.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                } ${!mod.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {iconMap[mod.id] || <LayoutGrid className="w-4 h-4" />}
                {mod.name}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Library
          </h3>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveModule('history')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeModule === 'history'
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </nav>
        </div>
      </div>

      {/* Footer / Credits / Sign Out */}
      <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
        <div className="flex justify-center w-full">
          <CreditBadge credits={credits} loading={creditsLoading} onRefresh={refreshCredits} />
        </div>
        
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-all shadow-sm active:scale-95"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
