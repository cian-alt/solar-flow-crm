'use client';

import { useState } from 'react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Task, Profile, TaskPriority } from '@/types/database';
import toast from 'react-hot-toast';

interface Props { tasks: Task[]; leadId: string; profiles: Profile[]; onTasksChange: (tasks: Task[]) => void; }

const PRIORITY: Record<TaskPriority, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-slate-100 text-slate-500',
};

export default function TasksTab({ tasks, leadId, profiles, onTasksChange }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const addTask = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const assignee = assignedTo || user?.id;
    if (!assignee) { setSaving(false); return; }

    const { data, error } = await supabase.from('tasks').insert({
      lead_id: leadId, assigned_to: assignee, title: title.trim(),
      priority, due_date: dueDate || null, completed: false,
    }).select('*, assignee:profiles!assigned_to(id,full_name,avatar_initials)').single();

    if (error) { toast.error('Failed to add task'); setSaving(false); return; }

    onTasksChange([...tasks, data as Task]);
    setTitle(''); setPriority('medium'); setDueDate(''); setAssignedTo('');
    toast.success('Task added');
    setSaving(false);
  };

  const toggleComplete = async (task: Task) => {
    onTasksChange(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    await supabase.from('tasks').update({ completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="bg-white/60 rounded-xl border border-white/80 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-[#0F172A]">Add Task</h4>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..."
          className="w-full px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" />
        <div className="grid grid-cols-3 gap-2">
          <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
            className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none" />
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none">
            <option value="">Assign to me</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
          </select>
        </div>
        <button onClick={addTask} disabled={saving || !title.trim()}
          className="px-4 py-2 text-sm font-semibold bg-[#1B3A6B] text-white rounded-lg hover:bg-[#152E55] transition-colors disabled:opacity-40">
          {saving ? 'Adding...' : 'Add Task'}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <CheckSquare className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">No tasks yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map(task => {
            const overdue = task.due_date && task.due_date < today && !task.completed;
            return (
              <li key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border group transition-all ${task.completed ? 'border-slate-100 bg-slate-50/60 opacity-60' : 'border-white/80 bg-white/60'}`}>
                <button onClick={() => toggleComplete(task)} className="mt-0.5 text-slate-300 hover:text-[#1B3A6B] transition-colors">
                  {task.completed ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-[#0F172A]'}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${PRIORITY[task.priority]}`}>{task.priority}</span>
                    {task.due_date && (
                      <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        Due {formatDate(task.due_date)}{overdue ? ' · Overdue' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all">
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
