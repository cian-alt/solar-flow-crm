'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'Email not confirmed': 'Please confirm your email address before signing in.',
  'Too many requests': 'Too many attempts. Please wait a moment and try again.',
};

function getFriendlyError(message: string): string {
  return FRIENDLY_ERRORS[message] ?? message;
}

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
      {/* 8 rays */}
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(getFriendlyError(authError.message));
      } else {
        router.push('/dashboard');
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
          <p className="text-slate-500 text-sm mt-1">Welcome back</p>
        </div>

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
              placeholder="Password"
              autoComplete="current-password"
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

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-[#1B3A6B]/70 hover:text-[#1B3A6B] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl bg-[#1B3A6B] text-white font-semibold hover:bg-[#152E55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-[#1B3A6B] font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
