'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
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
          <p className="text-slate-500 text-sm mt-1">Reset your password</p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mb-4 text-4xl">&#9993;</div>
            <h2 className="text-lg font-semibold text-[#1B3A6B] mb-2">
              Check your inbox
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Password reset email sent! Check your inbox for a link to reset
              your password.
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
            <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
              Enter the email address for your account and we&apos;ll send you a
              link to reset your password.
            </p>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-[#1B3A6B] text-white font-semibold hover:bg-[#152E55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send reset link'}
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
          </>
        )}
      </div>
    </motion.div>
  );
}
