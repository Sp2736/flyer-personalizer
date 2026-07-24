'use client';

import { useState } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { IdCard, Eye, EyeOff, Sparkles, ArrowRight, Upload, CheckCircle2, RefreshCw, Download, Image as ImageIcon, AlertCircle, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submissionErrors, setSubmissionErrors] = useState<{ fullName?: string; collegeName?: string; phoneNumber?: string; photo?: string }>({});

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

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { fullName?: string; collegeName?: string; phoneNumber?: string; photo?: string } = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters';
    }
    if (!collegeName.trim()) {
      errors.collegeName = 'College Name is required';
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
      errors.phoneNumber = 'Enter a valid phone number';
    }
    if (!photoPreview) {
      errors.photo = 'Please upload a photo';
    }

    setSubmissionErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsGenerating(true);
      setTimeout(() => {
        setIsGenerating(false);
        setCurrentScreen('result');
        triggerConfetti();
      }, 1500);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatedBackground />

      {/* Top Header Navigation for Authenticated/Active Session */}
      {currentScreen !== 'login' && (
        <header className="sticky top-2 sm:top-4 z-50 w-full max-w-6xl mx-auto mb-6 px-4 sm:px-6 py-3 bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-md sm:rounded-lg shadow-xl flex items-center justify-between transition-all">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-cover border border-white/20 shadow-md" />
            <span className="font-heading font-bold text-base sm:text-lg text-white tracking-tight">
              Poster Generator
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all backdrop-blur-md active:scale-95 shadow-md"
          >
            <LogOut className="w-4 h-4 text-pink-400" />
            <span>Sign Out</span>
          </button>
        </header>
      )}

      <div className="z-10 w-full max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* SCREEN 1: LOGIN */}
          {currentScreen === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="max-w-md mx-auto w-full"
            >
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-md p-8 shadow-[0_8px_40px_rgba(124,58,237,0.2)]">
                <div className="text-center mb-8">
                  <img src="/logo.jpg" alt="Logo" className="w-16 h-16 rounded-md object-cover border border-white/20 shadow-xl mx-auto mb-4" />
                  <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-white via-slate-200 to-purple-200 bg-clip-text text-transparent">
                    Poster Generator
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">Sign in with your credentials to continue</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  {/* College ID */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                      College ID
                    </label>
                    <div className="relative">
                      <IdCard className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={collegeId}
                        onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                        suppressHydrationWarning
                        className={`w-full bg-white/5 border ${
                          loginErrors.collegeId ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-purple-500'
                        } rounded-md pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
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
                    <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        suppressHydrationWarning
                        className={`w-full bg-white/5 border ${
                          loginErrors.password ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-purple-500'
                        } rounded-md pl-4 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        suppressHydrationWarning
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-md text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.98]"
                    >
                      DEV BYPASS
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: SUBMISSION MODULE */}
          {currentScreen === 'submission' && (
            <motion.div
              key="submission"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Form Card */}
              <div className="lg:col-span-7 backdrop-blur-xl bg-white/5 border border-white/10 rounded-md p-6 md:p-8 shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold font-heading text-white">Create Your Poster</h2>
                    <p className="text-xs text-slate-400">Fill in your details and choose a studio template</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Step 1 of 2
                  </span>
                </div>

                <form onSubmit={handleGenerate} className="space-y-6">
                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                        Full Name <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`w-full bg-white/5 border ${
                          submissionErrors.fullName ? 'border-red-500' : 'border-white/10 focus:border-purple-500'
                        } rounded-md px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                      {submissionErrors.fullName && (
                        <p className="text-xs text-red-400 mt-1">{submissionErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                        College Name <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className={`w-full bg-white/5 border ${
                          submissionErrors.collegeName ? 'border-red-500' : 'border-white/10 focus:border-purple-500'
                        } rounded-md px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                      {submissionErrors.collegeName && (
                        <p className="text-xs text-red-400 mt-1">{submissionErrors.collegeName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Student ID <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-md px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                        Phone Number <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`w-full bg-white/5 border ${
                          submissionErrors.phoneNumber ? 'border-red-500' : 'border-white/10 focus:border-purple-500'
                        } rounded-md px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                      {submissionErrors.phoneNumber && (
                        <p className="text-xs text-red-400 mt-1">{submissionErrors.phoneNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Photo Dropzone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                      Upload Portrait Photo <span className="text-pink-500">*</span>
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) {
                          handlePhotoFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`relative border-2 border-dashed rounded-md p-6 text-center transition-all ${
                        isDragging
                          ? 'border-pink-500 bg-pink-500/10 scale-[1.01]'
                          : photoPreview
                          ? 'border-purple-500/50 bg-purple-500/5'
                          : 'border-white/15 bg-white/5 hover:border-purple-500/50'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        capture="environment"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoFile(e.target.files[0]);
                        }}
                        className="hidden"
                        id="photo-upload"
                      />

                      {photoPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-purple-500 shadow-lg">
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <label
                            htmlFor="photo-upload"
                            className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 underline font-medium"
                          >
                            Change Photo
                          </label>
                        </div>
                      ) : (
                        <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="p-3 rounded-full bg-white/5 text-purple-400">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium text-slate-200">
                            Drag & drop your photo, or <span className="text-purple-400 underline">browse</span>
                          </p>
                          <p className="text-xs text-slate-500">JPEG or PNG · Max 10MB</p>
                        </label>
                      )}
                    </div>
                    {photoError && <p className="text-xs text-red-400 mt-1.5">{photoError}</p>}
                    {submissionErrors.photo && !photoError && (
                      <p className="text-xs text-red-400 mt-1.5">{submissionErrors.photo}</p>
                    )}
                  </div>

                  {/* Template Picker */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-3">
                      Select Event Template
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedTemplate(tmpl)}
                          className={`relative rounded-md overflow-hidden border text-left transition-all ${
                            selectedTemplate?.id === tmpl.id
                              ? 'border-purple-500 ring-2 ring-purple-500/50 scale-[1.02]'
                              : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="aspect-video relative bg-slate-800">
                            <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-2 bg-slate-900/80">
                            <p className="text-xs font-semibold text-white truncate">{tmpl.name}</p>
                            <p className="text-[10px] text-slate-400">{tmpl.category}</p>
                          </div>
                          {selectedTemplate?.id === tmpl.id && (
                            <CheckCircle2 className="w-4 h-4 absolute top-2 right-2 text-purple-400 bg-slate-900 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 active:scale-[0.98] text-white font-medium py-3.5 rounded-md shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" /> Generating Your Poster...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" /> Generate Poster
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: Live Preview Card */}
              <div className="lg:col-span-5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-md p-6 shadow-[0_8px_40px_rgba(124,58,237,0.15)] flex flex-col items-center">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 self-start">
                  Live Preview Hint
                </h3>
                <div className="relative w-full aspect-[3/4] max-w-sm rounded-md overflow-hidden border border-white/15 shadow-2xl bg-slate-900 flex items-center justify-center">
                  {selectedTemplate && (
                    <img
                      src={selectedTemplate.thumbnailUrl}
                      alt={selectedTemplate.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center p-6 text-center">
                    {photoPreview ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-pink-500 mb-3 shadow-xl">
                        <img src={photoPreview} alt="User" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-3 text-slate-500">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <h4 className="font-heading font-bold text-lg text-white">
                      {fullName || 'Your Name Here'}
                    </h4>
                    {collegeName && <p className="text-xs text-slate-300 font-medium mt-0.5">{collegeName}</p>}
                    {studentId && <p className="text-xs text-purple-300 font-mono mt-0.5">{studentId}</p>}
                    {phoneNumber && <p className="text-xs text-slate-400 font-mono mt-0.5">{phoneNumber}</p>}
                    <span className="mt-4 text-[10px] text-slate-400 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                      {selectedTemplate?.name || 'Template Preview'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: RESULT VIEW */}
          {currentScreen === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-md p-8 shadow-[0_8px_40px_rgba(124,58,237,0.3)]">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold font-heading text-white">Poster Generated! 🎉</h2>
                <p className="text-xs text-slate-400 mt-1 mb-6">Your custom event poster is ready to download</p>

                {/* Final Poster Card */}
                <div className="relative aspect-[3/4] rounded-md overflow-hidden border-2 border-purple-500/50 shadow-2xl mb-6 bg-slate-900 flex flex-col items-center justify-center p-6">
                  {selectedTemplate && (
                    <img
                      src={selectedTemplate.thumbnailUrl}
                      alt="Template"
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  )}
                  <div className="relative z-10 text-center">
                    {photoPreview && (
                      <img
                        src={photoPreview}
                        alt="User"
                        className="w-28 h-28 rounded-full object-cover border-2 border-pink-500 mx-auto mb-3 shadow-xl"
                      />
                    )}
                    <h3 className="text-xl font-bold text-white font-heading">{fullName}</h3>
                    {collegeName && <p className="text-xs text-slate-200 font-medium">{collegeName}</p>}
                    {studentId && <p className="text-xs text-purple-300 font-mono">{studentId}</p>}
                    {phoneNumber && <p className="text-xs text-slate-400 font-mono">{phoneNumber}</p>}
                    <p className="text-[10px] text-amber-400 font-medium uppercase tracking-widest mt-2">
                      Official Attendee
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => alert('Downloading poster...')}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 active:scale-[0.98] text-white font-medium py-3.5 rounded-md shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" /> Download Poster
                  </button>
                  <button
                    onClick={() => setCurrentScreen('submission')}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-slate-300 text-sm font-medium transition-all"
                  >
                    Generate Another
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
