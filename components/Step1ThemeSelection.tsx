'use client';

import { useState, useEffect } from 'react';
import { apiFetch, ModuleItem, ThemeItem } from '@/lib/api';
import { motion } from 'framer-motion';
import { LayoutGrid, Palette, FileText, Users, AlertCircle, RefreshCw } from 'lucide-react';

export type PaperSize = 'A4' | '12x18';

export interface ThemeSelectionState {
  moduleId: string;
  themeId: string;
  paperSize: PaperSize;
  characterCount: number;
  thumbnailUrl: string;
  themeName: string;
}

interface Step1ThemeSelectionProps {
  onSelectionChange?: (state: ThemeSelectionState) => void;
}

// Fallback modules if backend GET /modules is not running
const DEMO_MODULES: ModuleItem[] = [
  { id: 'notebook_sticker', name: 'Notebook Sticker', enabled: true },
  { id: 'event_flyer', name: 'Event Flyer', enabled: true },
  { id: 'id_card', name: 'ID Card / Badge', enabled: false },
];

// Fallback themes if backend GET /themes is not running
const DEMO_THEMES: Record<string, ThemeItem[]> = {
  notebook_sticker: [
    {
      id: 'theme_cyberpunk',
      name: 'Cyberpunk Neon',
      module_id: 'notebook_sticker',
      preview_thumbnail_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'theme_minimal',
      name: 'Minimal Mono',
      module_id: 'notebook_sticker',
      preview_thumbnail_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'theme_retrowave',
      name: 'Retro Wave',
      module_id: 'notebook_sticker',
      preview_thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
  ],
  event_flyer: [
    {
      id: 'theme_fest_glow',
      name: 'Tech Fest Glow',
      module_id: 'event_flyer',
      preview_thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    },
  ],
};

export default function Step1ThemeSelection({ onSelectionChange }: Step1ThemeSelectionProps) {
  const [modules, setModules] = useState<ModuleItem[]>(DEMO_MODULES);
  const [selectedModule, setSelectedModule] = useState<string>('notebook_sticker');
  const [themes, setThemes] = useState<ThemeItem[]>(DEMO_THEMES['notebook_sticker'] || []);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('theme_cyberpunk');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [characterCount, setCharacterCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch modules on mount
  useEffect(() => {
    async function fetchModules() {
      try {
        setLoading(true);
        const data = await apiFetch<ModuleItem[]>('/modules');
        if (Array.isArray(data) && data.length > 0) {
          const enabledOnly = data.filter((m) => m.enabled);
          setModules(enabledOnly);
          if (enabledOnly.length > 0 && !enabledOnly.some((m) => m.id === selectedModule)) {
            setSelectedModule(enabledOnly[0].id);
          }
        }
      } catch (err) {
        // Fallback to local demo data if endpoint unavailable
        console.warn('GET /modules failed, falling back to demo modules:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchModules();
  }, []);

  // Fetch themes whenever selectedModule changes
  useEffect(() => {
    async function fetchThemes() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<ThemeItem[]>(`/themes?module=${selectedModule}`);
        if (Array.isArray(data) && data.length > 0) {
          setThemes(data);
          setSelectedThemeId(data[0].id);
        } else {
          setThemes(DEMO_THEMES[selectedModule] || []);
          if (DEMO_THEMES[selectedModule]?.[0]) {
            setSelectedThemeId(DEMO_THEMES[selectedModule][0].id);
          }
        }
      } catch (err) {
        console.warn(`GET /themes?module=${selectedModule} failed, falling back to demo themes:`, err);
        const fallback = DEMO_THEMES[selectedModule] || [];
        setThemes(fallback);
        if (fallback[0]) setSelectedThemeId(fallback[0].id);
      } finally {
        setLoading(false);
      }
    }
    fetchThemes();
  }, [selectedModule]);

  // Dynamically compute character count options based on paper size
  const maxChars = paperSize === 'A4' ? 2 : 4;
  const characterCountOptions = Array.from({ length: maxChars }, (_, i) => i + 1);

  // Re-clamp selected character count if paper size changes
  useEffect(() => {
    if (characterCount > maxChars) {
      setCharacterCount(maxChars);
    }
  }, [paperSize, maxChars, characterCount]);

  // Notify parent state when selections change
  const prevSelectionRef = useState<{
    moduleId?: string;
    themeId?: string;
    paperSize?: PaperSize;
    characterCount?: number;
  }>({})[0];

  useEffect(() => {
    if (
      prevSelectionRef.moduleId === selectedModule &&
      prevSelectionRef.themeId === selectedThemeId &&
      prevSelectionRef.paperSize === paperSize &&
      prevSelectionRef.characterCount === characterCount
    ) {
      return;
    }

    prevSelectionRef.moduleId = selectedModule;
    prevSelectionRef.themeId = selectedThemeId;
    prevSelectionRef.paperSize = paperSize;
    prevSelectionRef.characterCount = characterCount;

    const selectedTheme = themes.find((t) => t.id === selectedThemeId);
    if (onSelectionChange) {
      onSelectionChange({
        moduleId: selectedModule,
        themeId: selectedThemeId,
        paperSize,
        characterCount,
        thumbnailUrl: selectedTheme?.preview_thumbnail_url ?? '',
        themeName: selectedTheme?.name ?? '',
      });
    }
  }, [selectedModule, selectedThemeId, paperSize, characterCount, themes, onSelectionChange]);

  return (
    <div className="space-y-6">
      {/* 1. Module Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-purple-400" />
          <span>Select Module</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {modules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              disabled={!mod.enabled}
              onClick={() => setSelectedModule(mod.id)}
              className={`p-3 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${
                selectedModule === mod.id
                  ? 'border-purple-500 bg-purple-500/15 text-white shadow-md shadow-purple-500/10'
                  : mod.enabled
                  ? 'border-white/10 bg-white/5 text-slate-300 hover:border-purple-500/50 hover:bg-white/10'
                  : 'border-white/5 bg-white/2 text-slate-600 cursor-not-allowed opacity-50'
              }`}
            >
              <span>{mod.name}</span>
              {!mod.enabled && <span className="text-[10px] uppercase text-slate-500 font-bold">Disabled</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Theme Gallery Grid */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-400" />
          <span>Theme Gallery</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400 ml-auto" />}
        </label>
        {themes.length === 0 ? (
          <div className="p-4 border border-white/10 rounded-lg bg-white/5 text-slate-400 text-xs text-center">
            No themes available for this module.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themes.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`group relative cursor-pointer rounded-lg overflow-hidden border transition-all ${
                    isSelected
                      ? 'border-pink-500 ring-2 ring-pink-500/50 scale-[1.02]'
                      : 'border-white/10 hover:border-pink-500/50'
                  }`}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={theme.preview_thumbnail_url}
                      alt={theme.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
                    <span className="text-xs font-medium text-white truncate">{theme.name}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Paper Size & 4. Character Count Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Paper Size Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Paper Size</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['A4', '12x18'] as PaperSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPaperSize(size)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                  paperSize === size
                    ? 'border-amber-500 bg-amber-500/15 text-amber-200 shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-amber-500/40'
                }`}
              >
                {size === '12x18' ? '12 × 18 in' : 'A4'}
              </button>
            ))}
          </div>
        </div>

        {/* Character Count Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Characters / Photos</span>
            </span>
            <span className="text-[10px] text-slate-400 lowercase font-normal">(max {maxChars} for {paperSize})</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {characterCountOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCharacterCount(num)}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  characterCount === num
                    ? 'border-blue-500 bg-blue-500/15 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-blue-500/40'
                }`}
              >
                {num} {num === 1 ? 'Char' : 'Chars'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
