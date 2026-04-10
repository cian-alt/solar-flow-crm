'use client';

import { useState } from 'react';
import { CheckSquare, Square, PartyPopper } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types/database';

interface MyTasksTodayProps {
  tasks: (Task & { lead?: { id: string; company_name: string } })[];
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-blue-50 text-blue-600',
};

export default function MyTasksToday({ tasks: initialTasks }: MyTasksTodayProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const supabase = createClient();

  const toggleComplete = async (taskId: string, currentCompleted: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: !currentCompleted, completed_at: !currentCompleted ? new Date().toISOString() : null }
          : t
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: !currentCompleted,
        completed_at: !currentCompleted ? new Date().toISOString() : null,
      })
      .eq('id', taskId);

    if (error) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: currentCompleted, completed_at: null } : t
        )
      );
    }
  };

  const pending = tasks.filter((t) => !t.completed);

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">My Tasks Today</h2>
          <p className="text-xs text-slate-400 mt-0.5">{pending.length} pending</p>
        </div>
        {pending.length === 0 && tasks.length > 0 && (
          <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">All done!</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <PartyPopper className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No tasks due today</p>
          <p className="text-xs text-slate-300">Enjoy the clear schedule!</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                task.completed
                  ? 'border-slate-100 bg-slate-50/50 opacity-60'
                  : 'border-white bg-white/60 hover:bg-white/80'
              }`}
            >
              <button
                onClick={() => toggleComplete(task.id, task.completed)}
                className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-[#1B3A6B] transition-colors"
                aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.completed ? (
                  <CheckSquare className="w-4 h-4 text-[#059669]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-[#0F172A]'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] ?? 'bg-slate-100 text-slate-500'}`}>
                    {task.priority}
                  </span>
                  {task.lead && (
                    <span className="text-[10px] text-slate-400 truncate">{task.lead.company_name}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
