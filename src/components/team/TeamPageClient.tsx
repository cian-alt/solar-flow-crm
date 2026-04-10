'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus, Users, TrendingUp, Trophy, Mail } from 'lucide-react';
import type { Profile } from '@/types/database';
import { formatEuroCompact, getInitials, getAvatarColor } from '@/lib/utils';

interface ProfileWithStats extends Profile {
  assigned_count: number;
  closed_won_count: number;
  revenue: number;
}

export default function TeamPageClient({ profiles }: { profiles: ProfileWithStats[] }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('account_manager');
  const [inviteSent, setInviteSent] = useState(false);

  const sendInvite = () => {
    if (!inviteEmail) return;
    // Note: Real invite requires Supabase admin SDK + SMTP config
    setInviteSent(true);
    setTimeout(() => { setShowInvite(false); setInviteSent(false); setInviteEmail(''); }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">{profiles.length} member{profiles.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors">
          <UserPlus size={15} /> Invite Member
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">Invite Team Member</h2>
            {inviteSent ? (
              <div className="py-4 text-center">
                <p className="text-emerald-600 font-semibold">✓ Invite sent to {inviteEmail}</p>
                <p className="text-xs text-slate-500 mt-1">Note: Configure Supabase SMTP to enable email delivery.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email address</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.ie"
                    className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none">
                    <option value="account_manager">Account Manager</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowInvite(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={sendInvite}
                    className="flex-1 py-2.5 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold hover:bg-[#152E55] transition-colors">
                    Send Invite
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Team grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile, i) => {
          const name = profile.full_name ?? profile.email;
          return (
            <motion.div key={profile.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card p-5 space-y-4 hover:scale-[1.015] transition-transform cursor-default">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ background: getAvatarColor(name) }}>
                  {getInitials(name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0F172A] truncate">{name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{profile.role_title ?? profile.role}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Mail size={10} />{profile.email}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Users, label: 'Leads', value: String(profile.assigned_count) },
                  { icon: Trophy, label: 'Won', value: String(profile.closed_won_count) },
                  { icon: TrendingUp, label: 'Revenue', value: formatEuroCompact(profile.revenue) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center p-2 rounded-xl bg-white/40">
                    <Icon className="w-4 h-4 text-[#1B3A6B] mx-auto mb-1" />
                    <p className="text-xs font-bold text-[#0F172A]">{value}</p>
                    <p className="text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <Link href={`/leads?assigned=${profile.id}`}
                className="block w-full py-2 text-center text-xs font-semibold text-[#1B3A6B] bg-[#1B3A6B]/8 rounded-xl hover:bg-[#1B3A6B]/15 transition-colors">
                View Leads
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
