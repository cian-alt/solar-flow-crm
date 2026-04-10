'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, NotificationPreferences } from '@/types/database';
import { getInitials, getAvatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';

type Section = 'profile' | 'password' | 'notifications';

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
      setProfile(data);
      setLoading(false);
    });
  }, []);

  if (loading || !profile) return <div className="skeleton h-96 rounded-2xl" />;

  const SECTIONS: { id: Section; icon: React.ElementType; label: string }[] = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'password', icon: Lock, label: 'Password' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-xl font-semibold text-[#0F172A]">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Sidebar nav */}
        <div className="glass-card p-3 space-y-1 h-fit">
          {SECTIONS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${section === id ? 'bg-[#1B3A6B] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
        <div className="md:col-span-3">
          {section === 'profile' && <ProfileSection profile={profile} onUpdate={p => setProfile(p)} />}
          {section === 'password' && <PasswordSection />}
          {section === 'notifications' && <NotificationsSection profile={profile} onUpdate={p => setProfile(p)} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ profile, onUpdate }: { profile: Profile; onUpdate: (p: Profile) => void }) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [roleTitle, setRoleTitle] = useState(profile.role_title ?? '');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const save = async () => {
    setSaving(true);
    const initials = fullName.trim().split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const { data, error } = await supabase.from('profiles')
      .update({ full_name: fullName.trim() || null, role_title: roleTitle.trim() || null, avatar_initials: initials })
      .eq('id', profile.id).select().single<Profile>();
    if (error) { toast.error('Failed to save'); }
    else { toast.success('Profile updated'); if (data) onUpdate(data); }
    setSaving(false);
  };

  const name = fullName || profile.email;
  return (
    <div className="glass-card p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#0F172A]">Profile</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ background: getAvatarColor(name) }}>
          {getInitials(name)}
        </div>
        <div>
          <p className="text-sm font-medium text-[#0F172A]">{name}</p>
          <p className="text-xs text-slate-400">{profile.email}</p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{profile.role}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role Title</label>
          <input type="text" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. Account Manager"
            className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" />
        </div>
      </div>
      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function PasswordSection() {
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const save = async () => {
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPass !== confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message);
    else { toast.success('Password updated'); setNewPass(''); setConfirm(''); }
    setSaving(false);
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#0F172A]">Change Password</h2>
      <div className="space-y-4">
        {[
          { label: 'New Password', val: newPass, set: setNewPass },
          { label: 'Confirm New Password', val: confirm, set: setConfirm },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
            <input type="password" value={val} onChange={e => set(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors disabled:opacity-50">
        {saving ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  );
}

function NotificationsSection({ profile, onUpdate }: { profile: Profile; onUpdate: (p: Profile) => void }) {
  const prefs = profile.notification_preferences ?? { follow_up_due: true, stage_change: true, note_added: true, document_uploaded: true, task_due: true, stale_lead: true };
  const [preferences, setPreferences] = useState<NotificationPreferences>(prefs);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const toggle = (key: keyof NotificationPreferences) => {
    setPreferences(p => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('profiles')
      .update({ notification_preferences: preferences })
      .eq('id', profile.id).select().single<Profile>();
    if (error) toast.error('Failed to save');
    else { toast.success('Preferences saved'); if (data) onUpdate(data); }
    setSaving(false);
  };

  const LABELS: Record<keyof NotificationPreferences, string> = {
    follow_up_due: 'Follow-up reminders',
    stage_change: 'Stage changes',
    note_added: 'Notes added',
    document_uploaded: 'Documents uploaded',
    task_due: 'Task due reminders',
    stale_lead: 'Stale lead warnings',
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#0F172A]">Notification Preferences</h2>
      <div className="space-y-3">
        {(Object.keys(LABELS) as (keyof NotificationPreferences)[]).map(key => (
          <label key={key} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/40 cursor-pointer transition-colors">
            <span className="text-sm font-medium text-slate-700">{LABELS[key]}</span>
            <div onClick={() => toggle(key)}
              className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer flex-shrink-0 ${preferences[key] ? 'bg-[#1B3A6B]' : 'bg-slate-200'}`}
              style={{ height: 22, width: 40 }}>
              <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${preferences[key] ? 'translate-x-5' : 'translate-x-0.5'}`}
                style={{ width: 18, height: 18, top: 2, left: preferences[key] ? 18 : 2 }} />
            </div>
          </label>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
