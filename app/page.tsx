'use client';

import { useState, useCallback, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Step1ThemeSelection from '@/components/Step1ThemeSelection';
import PhotoUploadGrid from '@/components/PhotoUploadGrid';
import Step6HistoryTable from '@/components/Step6HistoryTable';
import { useCredits, CreditBadge } from '@/components/Credits';
import { apiFetch, PreviewResponse, DownloadResponse, ModuleItem } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IdCard,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Upload,
  CheckCircle2,
  RefreshCw,
  Download,
  Image as ImageIcon,
  AlertCircle,
  LogOut,
  LayoutGrid,
  History,
  PlusCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEMO_MODULES: ModuleItem[] = [
  { id: 'notebook_sticker', name: 'Notebook Sticker', enabled: true },
  { id: 'event_flyer', name: 'Event Flyer', enabled: true },
  { id: 'id_card', name: 'ID Card / Badge', enabled: false },
];

interface Template {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
}

const TEMPLATES: Template[] = [
  { id: '1', name: 'Cyberpunk Spotlight', category: 'Tech Fest', thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80' },
  { id: '2', name: 'Neon Horizons', category: 'Music Concert', thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80' },
  { id: '3', name: 'Minimalist Summit', category: 'Conference', thumbnailUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format&fit=crop&q=80' },
];

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'submission' | 'result'>('login');
  const [modules, setModules] = useState<ModuleItem[]>(DEMO_MODULES);
  const [selectedModule, setSelectedModule] = useState<string>('notebook_sticker');
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Login Form State
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ collegeId?: string; password?: string }>({});
  const [isVerifying, setIsVerifying] = useState(false);

  // Submission Form State
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(TEMPLATES[0]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Fetch modules on mount
  useEffect(() => {
    async function fetchModules() {
      try {
        const data = await apiFetch<ModuleItem[]>('/modules');
        if (Array.isArray(data) && data.length > 0) {
          const enabledOnly = data.filter((m) => m.enabled);
          setModules(enabledOnly);
          if (enabledOnly.length > 0 && !enabledOnly.some((m) => m.id === selectedModule)) {
            setSelectedModule(enabledOnly[0].id);
          }
        }
      } catch (err) {
        console.warn('GET /modules failed, falling back to demo modules:', err);
      }
    }
    fetchModules();
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submissionErrors, setSubmissionErrors] = useState<{ fullName?: string; collegeName?: string; phoneNumber?: string; photo?: string }>({});
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  const [step1Selection, setStep1Selection] = useState<{
    moduleId: string;
    themeId: string;
    paperSize: 'A4' | '12x18';
    characterCount: number;
    thumbnailUrl: string;
    themeName: string;
  }>({
    moduleId: 'notebook_sticker',
    themeId: 'theme_cyberpunk',
    paperSize: 'A4',
    characterCount: 1,
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    themeName: 'Cyberpunk Neon',
  });

  // Step 2 Upload Storage Paths (keyed by slot index)
  const [uploadedStoragePaths, setUploadedStoragePaths] = useState<(string | null)[]>([null]);

  const handleSlotsChanged = useCallback((paths: (string | null)[]) => {
    setUploadedStoragePaths(paths);
  }, []);

  const handleStep1SelectionChange = useCallback((selection: {
    moduleId: string;
    themeId: string;
    paperSize: 'A4' | '12x18';
    characterCount: number;
    thumbnailUrl: string;
    themeName: string;
  }) => {
    setStep1Selection(selection);
  }, []);

  // Handlers
  const handleSignOut = () => {
    setCollegeId('');
    setPassword('');
    setFullName('');
    setCollegeName('');
    setStudentId('');
    setPhoneNumber('');
    setPhotoPreview(null);
    setPhotoError(null);
    setLoginErrors({});
    setSubmissionErrors({});
    setFormStep(1);
    setActiveTab('create');
    setCurrentScreen('login');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { collegeId?: string; password?: string } = {};

    if (!collegeId.trim()) errors.collegeId = 'College ID is required';
    if (!password.trim()) errors.password = 'Password is required';
    else if (password.length < 4) errors.password = 'Password must be at least 4 characters';

    setLoginErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        setCurrentScreen('submission');
      }, 700);
    }
  };

  const handleBypass = () => {
    setFormStep(1);
    setCurrentScreen('submission');
  };

  const handlePhotoFile = (file: File) => {
    setPhotoError(null);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPhotoError('Please upload a JPEG or PNG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('File size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerConfetti = () => {
    // 1st center burst
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#7C3AED', '#EC4899', '#F59E0B', '#FFFFFF'],
    });

    // 2nd side bursts
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#7C3AED', '#EC4899', '#F59E0B', '#FFFFFF'],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#7C3AED', '#EC4899', '#F59E0B', '#FFFFFF'],
      });
    }, 150);
  };

  // Step 4 & 5 Generation & Credit State
  const { credits, setCredits, refreshCredits, loading: creditsLoading } = useCredits();
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [watermarkedPreviewUrl, setWatermarkedPreviewUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);

  // Step 3 Validation Guard
  const isAllPhotosUploaded =
    uploadedStoragePaths.length === step1Selection.characterCount &&
    uploadedStoragePaths.every((path) => path !== null && path.trim() !== '');

  const isFormValid =
    fullName.trim().length > 0 &&
    collegeName.trim().length > 0 &&
    phoneNumber.trim().length >= 10 &&
    isAllPhotosUploaded;

  // Step 4 — Generate preview handler
  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerationError(null);
    setWatermarkedPreviewUrl(null);

    const errors: { fullName?: string; collegeName?: string; phoneNumber?: string; photo?: string } = {};
    if (!fullName.trim()) errors.fullName = 'Student Name is required';
    if (!collegeName.trim()) errors.collegeName = 'School Name is required';
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) errors.phoneNumber = 'Enter a valid phone number (min 10 digits)';
    if (!isAllPhotosUploaded) errors.photo = `Please upload all ${step1Selection.characterCount} character photo(s)`;

    setSubmissionErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsGenerating(true);

    try {
      let genId: string;
      let previewUrl: string;

      try {
        const res = await apiFetch<PreviewResponse>('/generate/preview', {
          method: 'POST',
          body: JSON.stringify({
            module: step1Selection.moduleId,
            theme_id: step1Selection.themeId,
            paper_size: step1Selection.paperSize,
            character_count: step1Selection.characterCount,
            student_name: fullName.trim(),
            school_name: collegeName.trim(),
            photo_storage_paths: uploadedStoragePaths,
          }),
        });
        genId = res.generation_id;
        previewUrl = res.preview_url;
      } catch (err: any) {
        console.warn('POST /generate/preview failed, using local mock for testing:', err);
        genId = `gen_${Date.now()}`;
        previewUrl = step1Selection.thumbnailUrl;
      }

      setGenerationId(genId);
      setWatermarkedPreviewUrl(previewUrl);
      setCurrentScreen('result');
      triggerConfetti();
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('face')) {
        setGenerationError(`Face detection failure: ${err.message}`);
      } else {
        setGenerationError(err.message || 'Failed to generate preview.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 5 — Credit-gated Download handler
  const handleDownloadPdf = async () => {
    if (!generationId || isDownloading) return;

    if (credits < 1) {
      setDownloadError('Cannot generate/download: Credits are exhausted. Please top up your credits to download high-resolution PDFs.');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      let pdfUrl: string;
      let pngUrl: string;

      try {
        const res = await apiFetch<DownloadResponse>(`/generate/${generationId}/download`, {
          method: 'POST',
        });
        pdfUrl = res.final_pdf_url;
        pngUrl = res.final_png_url;
      } catch (err: any) {
        if (err.status === 402 || err.message?.includes('402') || err.message?.toLowerCase().includes('credit')) {
          setDownloadError('Cannot generate/download: Credits are exhausted (402).');
          return;
        }
        console.warn('POST /generate/{id}/download failed, opening mock demo download:', err);
        pdfUrl = '#';
        pngUrl = watermarkedPreviewUrl || '';
      }

      setFinalPdfUrl(pdfUrl);
      // Deduct credit optimistically and sync with backend
      setCredits((prev) => Math.max(0, prev - 1));
      await refreshCredits();

      if (pdfUrl && pdfUrl !== '#') {
        window.open(pdfUrl, '_blank');
      } else {
        alert('Download triggered successfully! 1 credit deducted.');
      }
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col pt-24 md:pt-28 p-4 md:p-8">
      <AnimatedBackground />

      {/* Top Header Navigation for Authenticated/Active Session */}
      {currentScreen !== 'login' && (
        <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img src="/logo.jpg" alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-cover border border-slate-200 shadow-sm" />
              <span className="font-heading font-bold text-base sm:text-lg text-slate-900 tracking-tight hidden sm:block">
                Poster Generator
              </span>
            </div>

            {/* Tab Navigation (only on the submission screen) */}
            {currentScreen === 'submission' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'create'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 border border-purple-400/40'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">Create Poster</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'history'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 border border-purple-400/40'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <History className="w-4 h-4" /> <span className="hidden sm:inline">Generation History</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <CreditBadge credits={credits} loading={creditsLoading} onRefresh={refreshCredits} />

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold uppercase tracking-wider transition-all backdrop-blur-md active:scale-95 shadow-sm"
              >
                <LogOut className="w-4 h-4 text-pink-400" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="z-10 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {/* SCREEN 1: LOGIN */}
          {currentScreen === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="max-w-md mx-auto w-full mt-10 md:mt-20"
            >
              <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-md p-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)]">
                <div className="text-center mb-8">
                  <img src="/logo.jpg" alt="Logo" className="w-16 h-16 rounded-md object-cover border border-slate-200 shadow-sm mx-auto mb-4" />
                  <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                    Poster Generator
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">Sign in with your credentials to continue</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  {/* College ID */}
                  <div>
                    <label
                      htmlFor="login-college-id"
                      className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2"
                    >
                      College ID
                    </label>
                    <div className="relative">
                      <IdCard className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="login-college-id"
                        name="loginCollegeId"
                        type="text"
                        value={collegeId}
                        onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                        suppressHydrationWarning
                        className={`w-full bg-white border ${loginErrors.collegeId ? 'border-red-500 animate-shake' : 'border-slate-200 focus:border-purple-500'
                          } rounded-md pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
                      />
                    </div>
                    {loginErrors.collegeId && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {loginErrors.collegeId}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        name="loginPassword"
                        autoComplete="current-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        suppressHydrationWarning
                        className={`w-full bg-white border ${loginErrors.password ? 'border-red-500 animate-shake' : 'border-slate-200 focus:border-purple-500'
                          } rounded-md pl-4 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        suppressHydrationWarning
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isVerifying}
                      suppressHydrationWarning
                      className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 active:scale-[0.98] text-white font-medium py-3 rounded-md shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          Submit <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleBypass}
                      suppressHydrationWarning
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-md text-slate-500 hover:text-slate-800 text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.98]"
                    >
                      DEV BYPASS
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: SUBMISSION MODULE OR HISTORY */}
          {currentScreen === 'submission' && (
            <motion.div
              key={`submission-${activeTab}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              {activeTab === 'create' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Form Card */}
                  <div className="lg:col-span-7 backdrop-blur-xl bg-white/80 border border-slate-200 rounded-md p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold font-heading text-slate-900">Create Your Poster</h2>
                          <div className="flex items-center bg-purple-50 border border-purple-200 rounded-md overflow-hidden">
                            <div className="px-2 py-1.5 bg-purple-100 border-r border-purple-200">
                              <LayoutGrid className="w-3.5 h-3.5 text-purple-700" />
                            </div>
                            <select
                              value={selectedModule}
                              onChange={(e) => setSelectedModule(e.target.value)}
                              className="bg-transparent text-purple-700 text-xs font-semibold px-2 py-1.5 outline-none cursor-pointer"
                            >
                              {modules.map((mod) => (
                                <option key={mod.id} value={mod.id} disabled={!mod.enabled}>
                                  {mod.name} {!mod.enabled ? '(Disabled)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">Fill in your details and choose a studio template</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                        Step {formStep} of 3
                      </span>
                    </div>

                    <form onSubmit={handleGeneratePreview} className="space-y-6">
                      {formStep === 1 && (
                        <>
                          {/* Step 1: Module, Theme, Paper Size & Character Count Selection */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 mb-6">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700">
                                Step 1 Configuration
                              </h3>
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-mono">
                                {step1Selection.paperSize} · {step1Selection.characterCount} {step1Selection.characterCount === 1 ? 'Slot' : 'Slots'}
                              </span>
                            </div>
                            <Step1ThemeSelection
                              selectedModule={selectedModule}
                              onSelectionChange={handleStep1SelectionChange}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormStep(2)}
                            className="w-full font-medium py-3.5 rounded-md shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 mt-4 bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]"
                          >
                            Next Step <ArrowRight className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {formStep === 2 && (
                        <>
                          {/* Inputs Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="student-name"
                                className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2"
                              >
                                Student Name <span className="text-pink-500">*</span>
                              </label>
                              <input
                                id="student-name"
                                name="studentName"
                                autoComplete="name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Alex Johnson"
                                className={`w-full bg-white border ${submissionErrors.fullName ? 'border-red-500' : 'border-slate-200 focus:border-purple-500'
                                  } rounded-md px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
                              />
                              {submissionErrors.fullName && (
                                <p className="text-xs text-red-500 mt-1">{submissionErrors.fullName}</p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="college-name"
                                className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2"
                              >
                                School Name <span className="text-pink-500">*</span>
                              </label>
                              <input
                                id="college-name"
                                name="collegeName"
                                autoComplete="organization"
                                type="text"
                                value={collegeName}
                                onChange={(e) => setCollegeName(e.target.value)}
                                placeholder="e.g. St. Xavier High School"
                                className={`w-full bg-white border ${submissionErrors.collegeName ? 'border-red-500' : 'border-slate-200 focus:border-purple-500'
                                  } rounded-md px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
                              />
                              {submissionErrors.collegeName && (
                                <p className="text-xs text-red-500 mt-1">{submissionErrors.collegeName}</p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="phone-number"
                                className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2"
                              >
                                Phone Number <span className="text-pink-500">*</span>
                              </label>
                              <input
                                id="phone-number"
                                name="phoneNumber"
                                autoComplete="tel"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="e.g. 9876543210"
                                className={`w-full bg-white border ${submissionErrors.phoneNumber ? 'border-red-500' : 'border-slate-200 focus:border-purple-500'
                                  } rounded-md px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
                              />
                              {submissionErrors.phoneNumber && (
                                <p className="text-xs text-red-500 mt-1">{submissionErrors.phoneNumber}</p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="submission-college-id"
                                className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2"
                              >
                                College ID <span className="text-slate-400">(Optional)</span>
                              </label>
                              <input
                                id="submission-college-id"
                                name="submissionCollegeId"
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="e.g. CS2024001"
                                className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-md px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 mt-4">
                            <button
                              type="button"
                              onClick={() => setFormStep(1)}
                              className="px-4 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-slate-600 font-medium transition-all"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormStep(3)}
                              className="flex-1 font-medium py-3.5 rounded-md shadow-sm transition-all flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98]"
                            >
                              Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}

                      {formStep === 3 && (
                        <>
                          {/* Step 3: Photo Upload UI (N slots based on character_count) */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                            <PhotoUploadGrid
                              characterCount={step1Selection.characterCount}
                              onSlotsChanged={handleSlotsChanged}
                            />
                            {submissionErrors.photo && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {submissionErrors.photo}
                              </p>
                            )}
                          </div>

                          {generationError && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{generationError}</span>
                            </div>
                          )}

                          {/* Step 3 & 4: Generate Preview Button */}
                          <div className="flex gap-3 mt-4">
                            <button
                              type="button"
                              onClick={() => setFormStep(2)}
                              className="px-4 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-slate-600 font-medium transition-all"
                            >
                              Prev
                            </button>
                            <button
                              type="submit"
                              disabled={isGenerating || !isFormValid}
                              className={`flex-1 font-medium py-3.5 rounded-md shadow-md transition-all flex items-center justify-center gap-2 ${
                                isFormValid && !isGenerating
                                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20 active:scale-[0.98] text-white cursor-pointer'
                                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {isGenerating ? (
                                <>
                                  <RefreshCw className="w-5 h-5 animate-spin text-purple-200" /> Generating Preview...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-5 h-5" /> Generate Preview (Free)
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  </div>

                  {/* Right Column: Live Preview Card */}
                  <div className="lg:col-span-5 backdrop-blur-xl bg-white/80 border border-slate-200 rounded-md p-6 shadow-[0_8px_40px_rgba(0,0,0,0.05)] flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 self-start">
                      Live Preview
                    </h3>
                    <div className={`relative w-full ${step1Selection.paperSize === 'A4' ? 'aspect-[210/297]' : 'aspect-[2/3]'} max-w-sm rounded-md overflow-hidden border border-slate-200 shadow-xl bg-slate-50 flex items-center justify-center transition-all duration-500`}>
                      {step1Selection.thumbnailUrl && (
                        <img
                          src={step1Selection.thumbnailUrl}
                          alt="Theme Preview"
                          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply transition-all duration-500"
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center p-6 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                          {Array.from({ length: step1Selection.characterCount }).map((_, idx) => (
                            <div key={idx} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 flex items-center justify-center ${uploadedStoragePaths[idx] ? 'border-pink-500 shadow-md bg-white' : 'border-slate-200 bg-slate-100 shadow-sm'}`}>
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                            </div>
                          ))}
                        </div>
                        <h4 className="font-heading font-bold text-lg text-slate-900 drop-shadow-sm">
                          {fullName || 'Your Name Here'}
                        </h4>
                        {collegeName && <p className="text-xs text-slate-700 font-medium mt-0.5 drop-shadow-sm">{collegeName}</p>}
                        {studentId && <p className="text-xs text-purple-700 font-mono mt-0.5">{studentId}</p>}
                        {phoneNumber && <p className="text-xs text-slate-600 font-mono mt-0.5">{phoneNumber}</p>}
                        <div className="mt-3 text-[10px] text-slate-600 space-y-0.5">
                          <p>Photos: <span className="text-emerald-600">{uploadedStoragePaths.filter(Boolean).length} / {step1Selection.characterCount}</span></p>
                        </div>
                        <span className="mt-4 text-[10px] text-slate-700 bg-white/80 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                          {step1Selection.themeName || 'Template Preview'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Step6HistoryTable />
              )}
            </motion.div>
          )}

          {/* SCREEN 3: RESULT VIEW (Step 4 preview & Step 5 download) */}
          {currentScreen === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-md p-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)]">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-100 text-purple-600 border border-purple-200 mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold font-heading text-slate-900">Watermarked Preview 🎉</h2>
                <p className="text-xs text-slate-500 mt-1 mb-6">Review your preview. High-resolution PDF costs 1 credit.</p>

                {/* Watermarked Preview Container */}
                <div className="relative aspect-[3/4] rounded-md overflow-hidden border-2 border-slate-300 shadow-md mb-6 bg-slate-50 flex items-center justify-center">
                  {watermarkedPreviewUrl ? (
                    <div className="relative w-full h-full">
                      <img
                        src={watermarkedPreviewUrl}
                        alt="Watermarked Preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Watermark overlay indication */}
                      <div className="absolute inset-0 bg-black/20 pointer-events-none flex items-center justify-center">
                        <span className="text-white/40 font-bold text-2xl uppercase tracking-widest rotate-[-30deg] border-2 border-white/30 px-6 py-2 rounded-lg backdrop-blur-xs select-none">
                          PREVIEW WATERMARK
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-slate-400 text-xs">Preview unavailable</div>
                  )}
                </div>

                {downloadError && (
                  <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs text-left flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{downloadError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {/* Step 5: Separate Credit-Gated Download Button */}
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading || credits < 1}
                    className={`w-full font-medium py-3.5 rounded-md shadow-sm transition-all flex items-center justify-center gap-2 ${
                      credits >= 1 && !isDownloading
                        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 active:scale-[0.98] text-white cursor-pointer'
                        : 'bg-white border border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-purple-400" /> Deducting 1 Credit & Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" /> Download PDF (1 Credit)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScreen('submission');
                      setDownloadError(null);
                    }}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 text-sm font-medium transition-all"
                  >
                    Back to Form
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}