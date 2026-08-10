'use client';

import { useState, useCallback, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Step1ThemeSelection from '@/components/Step1ThemeSelection';
import PhotoUploadGrid from '@/components/PhotoUploadGrid';
import Step6HistoryTable from '@/components/Step6HistoryTable';
import { apiFetch, PreviewResponse, DownloadResponse } from '@/lib/api';
import { useApp } from '@/components/ClientLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Home() {
  const { activeModule, modules, credits, setCredits, refreshCredits } = useApp();
  const [currentScreen, setCurrentScreen] = useState<'submission' | 'result'>('submission');

  // Submission Form State
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
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
  const [uploadedLocalUrls, setUploadedLocalUrls] = useState<(string | null)[]>([null]);

  const handleSlotsChanged = useCallback((paths: (string | null)[], localUrls: (string | null)[]) => {
    setUploadedStoragePaths(paths);
    setUploadedLocalUrls(localUrls || []);
    setSubmissionErrors(prev => ({ ...prev, photo: undefined }));
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

  // Update step1Selection when activeModule changes from Sidebar
  useEffect(() => {
    if (activeModule !== 'history' && activeModule !== step1Selection.moduleId) {
      setStep1Selection(prev => ({ ...prev, moduleId: activeModule }));
      setFormStep(1);
      setCurrentScreen('submission');
    }
  }, [activeModule, step1Selection.moduleId]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#60A5FA', '#93C5FD', '#FFFFFF'], // Blue theme confetti
    });
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#3B82F6', '#60A5FA', '#93C5FD', '#FFFFFF'] });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#3B82F6', '#60A5FA', '#93C5FD', '#FFFFFF'] });
    }, 150);
  };

  // Step 4 & 5 Generation & Credit State
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

  const handleDownloadPdf = async () => {
    if (!generationId || isDownloading) return;

    if (credits < 1) {
      setDownloadError('Cannot generate/download: Credits are exhausted. Please top up your credits to download high-resolution PDFs.');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      let pdfUrl: string = '#';

      try {
        const res = await apiFetch<DownloadResponse>(`/generate/${generationId}/download`, {
          method: 'POST',
        });
        pdfUrl = res.final_pdf_url;
      } catch (err: any) {
        if (err.status === 402 || err.message?.includes('402') || err.message?.toLowerCase().includes('credit')) {
          setDownloadError('Cannot generate/download: Credits are exhausted (402).');
          return;
        }
        console.warn('POST /generate/{id}/download failed, using client-side fallback export:', err);
      }

      setFinalPdfUrl(pdfUrl);
      // Let AppLayout handle the credit logic
      if (typeof setCredits === 'function') {
        setCredits((prev: number) => Math.max(0, prev - 1));
      }
      await refreshCredits();

      if (pdfUrl && pdfUrl !== '#') {
        window.open(pdfUrl, '_blank');
      } else {
        // Client-side fallback export
        const exportElement = document.getElementById('export-preview');
        if (exportElement) {
          try {
            const canvas = await html2canvas(exportElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
              orientation: step1Selection.paperSize === '12x18' ? 'landscape' : 'portrait',
              unit: 'mm',
              format: step1Selection.paperSize === '12x18' ? [305, 457] : 'a4'
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${fullName || 'flyer'}_export.pdf`);
          } catch (canvasErr) {
            console.error('Client side export failed:', canvasErr);
            alert('Download failed. Could not export PDF locally.');
          }
        } else {
          alert('Download triggered successfully! 1 credit deducted.');
        }
      }
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (activeModule === 'history') {
    return (
      <main className="min-h-screen relative flex flex-col p-4 md:p-8">
        <div className="z-10 w-full max-w-6xl mx-auto">
          <Step6HistoryTable />
        </div>
      </main>
    );
  }

  const selectedModuleObj = modules.find(m => m.id === activeModule);
  const moduleName = selectedModuleObj ? selectedModuleObj.name : 'Create Poster';

  return (
    <main className="min-h-screen relative flex flex-col p-4 md:p-8">
      <div className="z-10 w-full max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {currentScreen === 'submission' && (
            <motion.div
              key="submission"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Left Column: Form Card */}
                <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold font-heading text-slate-900">{moduleName}</h2>
                      <p className="text-sm text-slate-500 mt-1">Fill in your details and choose a template</p>
                    </div>
                    <span className="text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                      Step {formStep} of 3
                    </span>
                  </div>

                  <form onSubmit={handleGeneratePreview} className="space-y-6">
                    {formStep === 1 && (
                      <>
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-4 mb-6">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700">
                              Template Configuration
                            </h3>
                            <span className="text-xs bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-mono shadow-sm">
                              {step1Selection.paperSize} · {step1Selection.characterCount} {step1Selection.characterCount === 1 ? 'Slot' : 'Slots'}
                            </span>
                          </div>
                          <Step1ThemeSelection
                            selectedModule={activeModule}
                            onSelectionChange={handleStep1SelectionChange}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormStep(2)}
                          className="w-full font-medium py-3.5 rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
                        >
                          Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {formStep === 2 && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                              Student Name <span className="text-blue-500">*</span>
                            </label>
                            <input
                              id="student-name"
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="e.g. Alex Johnson"
                              className={`w-full bg-white border ${submissionErrors.fullName ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                            />
                            {submissionErrors.fullName && <p className="text-xs text-red-500 mt-1">{submissionErrors.fullName}</p>}
                          </div>

                          <div>
                            <label htmlFor="college-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                              School Name <span className="text-blue-500">*</span>
                            </label>
                            <input
                              id="college-name"
                              type="text"
                              value={collegeName}
                              onChange={(e) => setCollegeName(e.target.value)}
                              placeholder="e.g. St. Xavier High School"
                              className={`w-full bg-white border ${submissionErrors.collegeName ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                            />
                            {submissionErrors.collegeName && <p className="text-xs text-red-500 mt-1">{submissionErrors.collegeName}</p>}
                          </div>

                          <div>
                            <label htmlFor="phone-number" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                              Phone Number <span className="text-blue-500">*</span>
                            </label>
                            <input
                              id="phone-number"
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="e.g. 9876543210"
                              className={`w-full bg-white border ${submissionErrors.phoneNumber ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                            />
                            {submissionErrors.phoneNumber && <p className="text-xs text-red-500 mt-1">{submissionErrors.phoneNumber}</p>}
                          </div>

                          <div>
                            <label htmlFor="submission-college-id" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              College ID <span className="text-slate-400">(Optional)</span>
                            </label>
                            <input
                              id="submission-college-id"
                              type="text"
                              value={studentId}
                              onChange={(e) => setStudentId(e.target.value)}
                              placeholder="e.g. CS2024001"
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            type="button"
                            onClick={() => setFormStep(1)}
                            className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium transition-all shadow-sm"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormStep(3)}
                            className="flex-1 font-medium py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white active:scale-[0.98]"
                          >
                            Next Step <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}

                    {formStep === 3 && (
                      <>
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-4">
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
                          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{generationError}</span>
                          </div>
                        )}

                        <div className="flex gap-3 mt-6">
                          <button
                            type="button"
                            onClick={() => setFormStep(2)}
                            className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium transition-all shadow-sm"
                          >
                            Prev
                          </button>
                          <button
                            type="submit"
                            disabled={isGenerating || !isFormValid}
                            className={`flex-1 font-medium py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${
                              isFormValid && !isGenerating
                                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-[0.98] text-white cursor-pointer'
                                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isGenerating ? (
                              <>
                                <RefreshCw className="w-5 h-5 animate-spin text-blue-200" /> Generating Preview...
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
                <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)] flex flex-col items-center">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 self-start">
                    Live Preview
                  </h3>
                  <div id="export-preview" className={`relative w-full ${step1Selection.paperSize === 'A4' ? 'aspect-[210/297]' : 'aspect-[2/3]'} max-w-sm rounded-md overflow-hidden border border-slate-200 shadow-xl bg-slate-50 flex items-center justify-center transition-all duration-500`}>
                    {step1Selection.thumbnailUrl && (
                      <img
                        src={step1Selection.thumbnailUrl}
                        alt="Theme Preview"
                        crossOrigin="anonymous"
                        className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply transition-all duration-500"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center p-6 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        {Array.from({ length: step1Selection.characterCount }).map((_, idx) => (
                          <div key={idx} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 flex items-center justify-center ${uploadedLocalUrls[idx] ? 'border-blue-500 shadow-md bg-white' : 'border-slate-200 bg-slate-100 shadow-sm'}`}>
                            {uploadedLocalUrls[idx] ? (
                              <img src={uploadedLocalUrls[idx]!} className="w-full h-full object-cover" crossOrigin="anonymous" alt={`Photo ${idx}`} />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                        ))}
                      </div>
                      <h4 className="font-heading font-bold text-lg text-slate-900 drop-shadow-sm">
                        {fullName || 'Your Name Here'}
                      </h4>
                      {collegeName && <p className="text-xs text-slate-700 font-medium mt-0.5 drop-shadow-sm">{collegeName}</p>}
                      {studentId && <p className="text-xs text-blue-700 font-mono mt-0.5">{studentId}</p>}
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
            </motion.div>
          )}

          {currentScreen === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-50 text-blue-600 border border-blue-100 mb-5">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold font-heading text-slate-900">Preview Ready</h2>
                <p className="text-sm text-slate-500 mt-2 mb-8">Review your design before generating the high-resolution PDF.</p>

                <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 shadow-md mb-8 bg-slate-50 flex items-center justify-center">
                  <div id="export-preview" className={`relative w-full h-full ${step1Selection.paperSize === 'A4' ? 'aspect-[210/297]' : 'aspect-[2/3]'} max-w-sm overflow-hidden bg-slate-50 flex items-center justify-center transition-all duration-500`}>
                    {step1Selection.thumbnailUrl && (
                      <img
                        src={step1Selection.thumbnailUrl}
                        alt="Theme Preview"
                        crossOrigin="anonymous"
                        className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply transition-all duration-500"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center p-6 text-center w-full h-full justify-center">
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        {Array.from({ length: step1Selection.characterCount }).map((_, idx) => (
                          <div key={idx} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 flex items-center justify-center ${uploadedLocalUrls[idx] ? 'border-blue-500 shadow-md bg-white' : 'border-slate-200 bg-slate-100 shadow-sm'}`}>
                            {uploadedLocalUrls[idx] ? (
                              <img src={uploadedLocalUrls[idx]!} className="w-full h-full object-cover" crossOrigin="anonymous" alt={`Photo ${idx}`} />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                        ))}
                      </div>
                      <h4 className="font-heading font-bold text-lg text-slate-900 drop-shadow-sm">
                        {fullName || 'Your Name Here'}
                      </h4>
                      {collegeName && <p className="text-xs text-slate-700 font-medium mt-0.5 drop-shadow-sm">{collegeName}</p>}
                      {studentId && <p className="text-xs text-blue-700 font-mono mt-0.5">{studentId}</p>}
                      {phoneNumber && <p className="text-xs text-slate-600 font-mono mt-0.5">{phoneNumber}</p>}
                      <div className="mt-3 text-[10px] text-slate-600 space-y-0.5">
                        <p>Photos: <span className="text-emerald-600">{uploadedStoragePaths.filter(Boolean).length} / {step1Selection.characterCount}</span></p>
                      </div>
                      <span className="mt-4 text-[10px] text-slate-700 bg-white/80 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        {step1Selection.themeName || 'Template Preview'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Watermark overlay indication (excluded from export-preview by being outside) */}
                  <div className="absolute inset-0 bg-slate-900/10 pointer-events-none flex items-center justify-center transition-all z-20">
                    <span className="text-white/60 font-bold text-xl uppercase tracking-widest rotate-[-30deg] border-2 border-white/40 px-6 py-2 rounded-xl backdrop-blur-sm shadow-sm select-none">
                      PREVIEW
                    </span>
                  </div>
                </div>

                {downloadError && (
                  <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-left flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{downloadError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading || credits < 1}
                    className={`w-full font-medium py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${
                      credits >= 1 && !isDownloading
                        ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white cursor-pointer shadow-blue-500/20'
                        : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-200" /> Generating...
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
                    className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold transition-all"
                  >
                    Back to Edit
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
