'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { error: authError } = await supabase.auth.updateUser({
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        router.push('/login?reset=success');
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
          <p className="text-slate-500 text-sm mt-1">Set a new password</p>
        </div>

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
          {/* New Password */}
          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password (min. 8 characters)"
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

          {/* Confirm New Password */}
          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl bg-[#1B3A6B] text-white font-semibold hover:bg-[#152E55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating password…' : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{' '}
          <Link
            href="/login"
            className="text-[#1B3A6B] font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
