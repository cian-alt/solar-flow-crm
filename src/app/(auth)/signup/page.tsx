'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function SunLogo() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="6" fill="#1B3A6B" />
      <line x1="16" y1="2" x2="16" y2="7" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="25" x2="16" y2="30" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="16" x2="7" y2="16" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="16" x2="30" y2="16" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="5.515" y1="5.515" x2="9.05" y2="9.05" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="22.95" y1="22.95" x2="26.485" y2="26.485" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="26.485" y1="5.515" x2="22.95" y2="9.05" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
      <line x1="9.05" y1="22.95" x2="5.515" y2="26.485" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: '24px',
          boxShadow: '0 8px 48px rgba(31,38,135,0.12)',
          padding: '48px',
        }}
      >
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <SunLogo />
          </div>
          <h1 className="text-2xl font-bold text-[#1B3A6B] tracking-tight">
            Solar Flow CRM
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        {/* Success state */}
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mb-4 text-4xl">&#9993;</div>
            <h2 className="text-lg font-semibold text-[#1B3A6B] mb-2">
              Account created!
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Please check your email{' '}
              <span className="font-medium text-slate-700">({email})</span> for
              a confirmation link.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-[#1B3A6B] font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 px-4 py-3 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Full Name */}
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Full name"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/40 focus:border-[#1B3A6B]/50 transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/40 focus:border-[#1B3A6B]/50 transition-all"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (min. 8 characters)"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/40 focus:border-[#1B3A6B]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/40 focus:border-[#1B3A6B]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-[#1B3A6B] text-white font-semibold hover:bg-[#152E55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[#1B3A6B] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
