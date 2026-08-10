'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { IdCard, Eye, EyeOff, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginScreen({ onBypass }: { onBypass: () => void }) {
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ collegeId?: string; password?: string }>({});
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { collegeId?: string; password?: string } = {};

    if (!collegeId.trim()) errors.collegeId = 'College ID / Email is required';
    if (!password.trim()) errors.password = 'Password is required';
    else if (password.length < 4) errors.password = 'Password must be at least 4 characters';

    setLoginErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsVerifying(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: collegeId.trim(),
          password: password,
        });

        if (error) {
          setLoginErrors({ collegeId: error.message });
          setIsVerifying(false);
          return;
        }

        setIsVerifying(false);
        // AppLayout will catch the auth state change and re-render
      } catch (err: any) {
        setLoginErrors({ collegeId: err?.message || 'Login failed' });
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-blue-900/5">
          <div className="text-center mb-8">
            <img src="/logo.jpg" alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm mx-auto mb-5" />
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              Poster Generator
            </h1>
            <p className="text-sm text-slate-500 mt-2">Sign in with your credentials to continue</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* College ID */}
            <div>
              <label
                htmlFor="login-college-id"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                College ID / Email
              </label>
              <div className="relative">
                <IdCard className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-college-id"
                  name="loginCollegeId"
                  type="text"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value.toLowerCase())}
                  className={`w-full bg-slate-50 border ${loginErrors.collegeId ? 'border-red-500 animate-shake' : 'border-slate-200 focus:border-blue-500'
                    } rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                  placeholder="Enter your ID or Email"
                />
              </div>
              {loginErrors.collegeId && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {loginErrors.collegeId}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
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
                  className={`w-full bg-slate-50 border ${loginErrors.password ? 'border-red-500 animate-shake' : 'border-slate-200 focus:border-blue-500'
                    } rounded-xl pl-4 pr-11 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {loginErrors.password && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {loginErrors.password}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onBypass}
                className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
              >
                Bypass
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
