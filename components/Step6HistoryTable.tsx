'use client';

import { useState, useEffect } from 'react';
import { apiFetch, HistoryItem } from '@/lib/api';
import { Search, Calendar, Filter, Download, ExternalLink, RefreshCw, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';

const DEMO_HISTORY: HistoryItem[] = [
  {
    id: 'gen_101',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    student_name: 'Alex Johnson',
    school_name: 'St. Xavier High School',
    theme_name: 'Cyberpunk Neon',
    paper_size: 'A4',
    student_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    preview_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    final_pdf_url: '#demo-pdf-1',
  },
  {
    id: 'gen_102',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    student_name: 'Sarah Connor',
    school_name: 'Horizon Academy',
    theme_name: 'Minimal Mono',
    paper_size: '12x18',
    student_photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    preview_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&auto=format&fit=crop&q=80',
    final_pdf_url: '#demo-pdf-2',
  },
];

export default function Step6HistoryTable() {
  const [history, setHistory] = useState<HistoryItem[]>(DEMO_HISTORY);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query (~300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch history items with query params
  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (selectedDate) params.append('date', selectedDate);
        if (selectedTheme) params.append('theme', selectedTheme);

        const data = await apiFetch<HistoryItem[]>(`/history?${params.toString()}`);
        if (Array.isArray(data)) {
          setHistory(data);
        } else {
          setHistory(DEMO_HISTORY);
        }
      } catch (err) {
        console.warn('GET /history endpoint unreached, using local fallback items:', err);
        // Local client-side filter fallback for testing
        let filtered = [...DEMO_HISTORY];
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (item) =>
              item.student_name.toLowerCase().includes(q) ||
              item.school_name.toLowerCase().includes(q)
          );
        }
        if (selectedTheme) {
          filtered = filtered.filter((item) => item.theme_name === selectedTheme);
        }
        setHistory(filtered);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [debouncedSearch, selectedDate, selectedTheme]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold font-heading text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            <span>Generation History</span>
          </h2>
          <p className="text-xs text-slate-500">View past generated stickers and download full-res PDFs without extra credit charges</p>
        </div>

        {/* Filter / Search Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or school..."
              className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Theme Filter */}
          <div className="relative">
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="">All Themes</option>
              <option value="Cyberpunk Neon">Cyberpunk Neon</option>
              <option value="Minimal Mono">Minimal Mono</option>
              <option value="Retro Wave">Retro Wave</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">School Name</th>
              <th className="py-3 px-4">Theme</th>
              <th className="py-3 px-4">Paper Size</th>
              <th className="py-3 px-4">Student Photo</th>
              <th className="py-3 px-4">PDF Preview</th>
              <th className="py-3 px-4 text-right">Download PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-400 mb-2" />
                  <span>Loading history records...</span>
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No generation history records found.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.student_name}</td>
                  <td className="py-3 px-4 text-slate-600">{item.school_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium">
                      {item.theme_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-amber-600">{item.paper_size}</td>
                  <td className="py-3 px-4">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                      <img src={item.student_photo_url} alt={item.student_name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <img src={item.preview_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {/* Direct link anchor — does NOT deduct additional credit */}
                    <a
                      href={item.final_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white text-[11px] font-medium transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
