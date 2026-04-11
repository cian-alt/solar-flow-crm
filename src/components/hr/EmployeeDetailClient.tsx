'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, User, DollarSign, Calendar, Star, FileText } from 'lucide-react';
import type {
  Profile, EmployeeProfile, CommissionRecord,
  LeaveRequest, PayrollRecord, PerformanceReview,
} from '@/types/database';
import ProfileTab from './tabs/ProfileTab';
import CompensationTab from './tabs/CompensationTab';
import LeaveTab from './tabs/LeaveTab';
import PerformanceTab from './tabs/PerformanceTab';

interface Props {
  profile: Profile;
  employeeProfile: EmployeeProfile | null;
  commissions: CommissionRecord[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  reviews: PerformanceReview[];
}

type Tab = 'profile' | 'compensation' | 'leave' | 'performance' | 'documents';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'leave', label: 'Leave', icon: Calendar },
  { id: 'performance', label: 'Performance', icon: Star },
  { id: 'documents', label: 'Documents', icon: FileText },
];

export default function EmployeeDetailClient({
  profile, employeeProfile, commissions, leaveRequests, payrollRecords, reviews,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [ep, setEp] = useState<EmployeeProfile | null>(employeeProfile);

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link href="/hr" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1B3A6B] transition-colors">
        <ChevronLeft size={16} /> HR Management
      </Link>

      {/* Employee header */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: '#1B3A6B' }}>
          {profile.avatar_initials ?? profile.full_name?.charAt(0) ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#0F172A]">{profile.full_name ?? profile.email}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            {ep?.job_title && <span className="text-sm text-slate-500">{ep.job_title}</span>}
            {ep?.department && <span className="text-xs text-slate-400">· {ep.department}</span>}
            {ep?.employee_number && (
              <span className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{ep.employee_number}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'bg-[#1B3A6B] text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100/80'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <ProfileTab profile={profile} employeeProfile={ep} onSaved={setEp} />
      )}
      {activeTab === 'compensation' && (
        <CompensationTab
          profile={profile}
          employeeProfile={ep}
          commissions={commissions}
          payrollRecords={payrollRecords}
        />
      )}
      {activeTab === 'leave' && (
        <LeaveTab
          profile={profile}
          employeeProfile={ep}
          leaveRequests={leaveRequests}
        />
      )}
      {activeTab === 'performance' && (
        <PerformanceTab profile={profile} reviews={reviews} />
      )}
      {activeTab === 'documents' && (
        <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
          <FileText className="w-8 h-8 text-slate-300" />
          <p className="font-semibold text-slate-600">Documents</p>
          <p className="text-sm text-slate-400 max-w-sm">
            Employee documents (contracts, tax forms, sick notes) will appear here once uploaded via Supabase Storage.
          </p>
        </div>
      )}
    </div>
  );
}
