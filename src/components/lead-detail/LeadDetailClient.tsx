'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { Lead, Note, Activity, Call, Task, Document, Profile, LeadStage } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatRelativeTime, formatEuro, STAGE_ORDER, getStagePillClass, calculateLeadScore } from '@/lib/utils';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge';
import ActivityTimeline from './tabs/ActivityTimeline';
import NotesTab from './tabs/NotesTab';
import CallsTab from './tabs/CallsTab';
import TasksTab from './tabs/TasksTab';
import DocumentsTab from './tabs/DocumentsTab';

type Tab = 'activity' | 'notes' | 'calls' | 'tasks' | 'documents';

interface Props {
  lead: Lead;
  notes: Note[];
  activities: Activity[];
  calls: Call[];
  tasks: Task[];
  documents: Document[];
  profiles: Profile[];
}

export default function LeadDetailClient({ lead: initialLead, notes: initialNotes, activities: initialActivities, calls: initialCalls, tasks: initialTasks, documents: initialDocuments, profiles }: Props) {
  const [lead, setLead] = useState(initialLead);
  const [notes, setNotes] = useState(initialNotes);
  const [activities, setActivities] = useState(initialActivities);
  const [calls, setCalls] = useState(initialCalls);
  const [tasks, setTasks] = useState(initialTasks);
  const [documents, setDocuments] = useState(initialDocuments);
  const [tab, setTab] = useState<Tab>('activity');
  const [confettiFired, setConfettiFired] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Confetti on Closed Won
  useEffect(() => {
    if (lead.stage === 'Closed Won' && !confettiFired) {
      setConfettiFired(true);
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.5 }, colors: ['#1B3A6B', '#059669', '#F59E0B'] });
      }, 300);
    }
  }, [lead.stage, confettiFired]);

  const updateLead = async (updates: Partial<Lead>) => {
    const prev = lead;
    setLead(l => ({ ...l, ...updates }));
    const { error } = await supabase.from('leads').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', lead.id);
    if (error) { setLead(prev); toast.error('Failed to save'); return; }

    // Log activity for stage change
    if (updates.stage && updates.stage !== prev.stage) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const act = await supabase.from('activities').insert({
          lead_id: lead.id, user_id: user.id, type: 'stage_change',
          description: `Stage changed from "${prev.stage}" to "${updates.stage}"`,
          metadata: { from: prev.stage, to: updates.stage },
        }).select('*, user:profiles!user_id(id,full_name,avatar_initials)').single();
        if (act.data) setActivities(a => [act.data, ...a]);
      }
      if (updates.stage === 'Closed Won') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.5 }, colors: ['#1B3A6B', '#059669', '#F59E0B'] });
      }
    }
  };

  const recalcScore = async () => {
    const score = calculateLeadScore({
      deal_value: lead.deal_value,
      stage: lead.stage,
      follow_up_date: lead.follow_up_date,
      has_calls: calls.length > 0,
      has_documents: documents.length > 0,
      has_notes: notes.length > 0,
    });
    await supabase.from('leads').update({ lead_score: score }).eq('id', lead.id);
    setLead(l => ({ ...l, lead_score: score }));
  };

  const deleteLead = async () => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    await supabase.from('leads').delete().eq('id', lead.id);
    toast.success('Lead deleted');
    router.push('/leads');
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'activity', label: 'Activity', count: activities.length },
    { id: 'notes', label: 'Notes', count: notes.length },
    { id: 'calls', label: 'Calls', count: calls.length },
    { id: 'tasks', label: 'Tasks', count: tasks.length },
    { id: 'documents', label: 'Documents', count: documents.length },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/leads" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1B3A6B] transition-colors">
          <ArrowLeft size={16} /> Back to Leads
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{lead.company_name}</span>
      </div>

      {/* Closed Won Banner */}
      {lead.stage === 'Closed Won' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-emerald-800">Closed Won!</p>
            <p className="text-sm text-emerald-700">Deal value: <strong>{formatEuro(lead.deal_value)}</strong></p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Header card */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">{lead.company_name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{lead.contact_name}</p>
              </div>
              <button onClick={deleteLead} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>

            {/* Stage selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Stage</label>
              <select
                value={lead.stage}
                onChange={e => updateLead({ stage: e.target.value as LeadStage })}
                className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 ${getStagePillClass(lead.stage)}`}
              >
                {STAGE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Assigned to */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned To</label>
              <select
                value={lead.assigned_to ?? ''}
                onChange={e => updateLead({ assigned_to: e.target.value || null })}
                className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
              >
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
              </select>
            </div>

            {/* Lead Score */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Lead Score</span>
              <LeadScoreBadge score={lead.lead_score} size="md" />
            </div>
          </div>

          {/* Contact Summary Bar */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Last Contact', value: formatRelativeTime(lead.last_contacted_at) },
                { label: 'Follow-up', value: lead.follow_up_date ? formatDate(lead.follow_up_date) : '—' },
                { label: 'Calls', value: String(calls.length) },
                { label: 'Notes', value: String(notes.length) },
                { label: 'Tasks', value: String(tasks.filter(t => !t.completed).length) + ' active' },
                { label: 'Documents', value: String(documents.length) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                  <p className="text-sm font-semibold text-[#0F172A] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Editable Fields */}
          <LeadFieldsPanel lead={lead} onUpdate={updateLead} />
        </div>

        {/* Right panel — tabs */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-white/60 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.id ? 'text-[#1B3A6B] border-[#1B3A6B]' : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {tab === 'activity' && <ActivityTimeline activities={activities} />}
                {tab === 'notes' && <NotesTab notes={notes} leadId={lead.id} onNotesChange={n => { setNotes(n); recalcScore(); }} />}
                {tab === 'calls' && <CallsTab calls={calls} leadId={lead.id} onCallsChange={c => { setCalls(c); recalcScore(); updateLead({ last_contacted_at: new Date().toISOString() }); }} />}
                {tab === 'tasks' && <TasksTab tasks={tasks} leadId={lead.id} profiles={profiles} onTasksChange={setTasks} />}
                {tab === 'documents' && <DocumentsTab documents={documents} leadId={lead.id} onDocsChange={d => { setDocuments(d); recalcScore(); }} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline editable lead fields panel
function LeadFieldsPanel({ lead, onUpdate }: { lead: Lead; onUpdate: (u: Partial<Lead>) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const startEdit = (key: string, currentVal: string | null | number) => {
    setEditing(key);
    setValues({ [key]: String(currentVal ?? '') });
  };

  const saveEdit = (key: string) => {
    const val = values[key];
    const update: Partial<Lead> = {};
    if (key === 'deal_value' || key === 'system_size_kw') {
      (update as Record<string, number | null>)[key] = val ? Number(val) : null;
    } else {
      (update as Record<string, string | null>)[key] = val || null;
    }
    onUpdate(update);
    setEditing(null);
  };

  const fields: { key: keyof Lead; label: string; type?: string }[] = [
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'address', label: 'Address' },
    { key: 'eircode', label: 'Eircode' },
    { key: 'deal_value', label: 'Deal Value (€)', type: 'number' },
    { key: 'system_size_kw', label: 'System Size (kW)', type: 'number' },
    { key: 'lead_source', label: 'Lead Source' },
    { key: 'follow_up_date', label: 'Follow-up Date', type: 'date' },
  ];

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Details</h3>
      {fields.map(({ key, label, type }) => {
        const val = lead[key];
        const isEditing = editing === key;
        return (
          <div key={key} className="flex items-center justify-between gap-3 py-1 group">
            <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  autoFocus
                  type={type ?? 'text'}
                  value={values[key] ?? ''}
                  onChange={e => setValues({ [key]: e.target.value })}
                  onBlur={() => saveEdit(key)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') setEditing(null); }}
                  className="flex-1 px-2 py-1 text-sm rounded-lg border border-[#1B3A6B]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
                />
              </div>
            ) : (
              <button
                onClick={() => startEdit(key, val as string | null)}
                className="flex-1 text-right text-sm text-[#0F172A] hover:text-[#1B3A6B] transition-colors truncate group-hover:underline decoration-dashed"
              >
                {val !== null && val !== undefined && val !== '' ? (
                  key === 'deal_value' ? formatEuro(Number(val)) :
                  key === 'follow_up_date' ? formatDate(String(val)) :
                  String(val)
                ) : <span className="text-slate-300 no-underline">—</span>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
