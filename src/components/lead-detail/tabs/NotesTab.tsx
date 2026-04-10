'use client';

import { useState } from 'react';
import { Pin, Trash2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Note } from '@/types/database';
import toast from 'react-hot-toast';

interface Props {
  notes: Note[];
  leadId: string;
  onNotesChange: (notes: Note[]) => void;
}

export default function NotesTab({ notes, leadId, onNotesChange }: Props) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const addNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase.from('notes').insert({
      lead_id: leadId, author_id: user.id, content: content.trim(), is_pinned: false,
    }).select('*, author:profiles!author_id(id,full_name,avatar_initials)').single();

    if (error) { toast.error('Failed to add note'); setSaving(false); return; }

    // Log activity
    await supabase.from('activities').insert({
      lead_id: leadId, user_id: user.id, type: 'note_added',
      description: 'Added a note', metadata: {},
    });

    onNotesChange([data as Note, ...notes]);
    setContent('');
    toast.success('Note added');
    setSaving(false);
  };

  const togglePin = async (note: Note) => {
    const { error } = await supabase.from('notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id);
    if (error) return;
    onNotesChange(notes.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)));
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await supabase.from('notes').delete().eq('id', id);
    onNotesChange(notes.filter(n => n.id !== id));
    toast.success('Note deleted');
  };

  const pinned = notes.filter(n => n.is_pinned);
  const unpinned = notes.filter(n => !n.is_pinned);

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="bg-white/60 rounded-xl border border-white/80 p-3 space-y-2">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          className="w-full text-sm text-slate-700 placeholder-slate-400 bg-transparent resize-none focus:outline-none"
        />
        <div className="flex justify-end">
          <button onClick={addNote} disabled={saving || !content.trim()}
            className="px-4 py-1.5 text-sm font-semibold bg-[#1B3A6B] text-white rounded-lg hover:bg-[#152E55] transition-colors disabled:opacity-40">
            {saving ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-center">
          <FileText className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">No notes yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {[...pinned, ...unpinned].map(note => {
            const author = note.author as { full_name?: string; avatar_initials?: string } | undefined;
            const authorName = author?.full_name ?? 'Unknown';
            return (
              <li key={note.id} className={`bg-white/60 rounded-xl border p-4 group ${note.is_pinned ? 'border-amber-200 bg-amber-50/30' : 'border-white/80'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: getAvatarColor(authorName) }}>
                      {getInitials(authorName)}
                    </div>
                    <span className="text-xs font-medium text-slate-600">{authorName}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(note.created_at)}</span>
                    {note.is_pinned && <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">Pinned</span>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => togglePin(note)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors" title={note.is_pinned ? 'Unpin' : 'Pin'}>
                      <Pin size={13} />
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
