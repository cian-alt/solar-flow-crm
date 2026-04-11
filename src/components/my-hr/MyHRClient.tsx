'use client';

import { useState } from 'react';
import { DollarSign, Calendar, Star } from 'lucide-react';
import type {
  Profile, EmployeeProfile, CommissionRecord,
  LeaveRequest, PayrollRecord, PerformanceReview,
} from '@/types/database';
import MyPayTab from './tabs/MyPayTab';
import MyLeaveTab from './tabs/MyLeaveTab';
import MyPerformanceTab from './tabs/MyPerformanceTab';

interface Props {
  profile: Profile | null;
  employeeProfile: EmployeeProfile | null;
  commissions: CommissionRecord[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  reviews: PerformanceReview[];
}

type Tab = 'pay' | 'leave' | 'performance';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'pay', label: 'My Pay', icon: DollarSign },
  { id: 'leave', label: 'My Leave', icon: Calendar },
  { id: 'performance', label: 'My Performance', icon: Star },
];

export default function MyHRClient({ profile, employeeProfile, commissions, leaveRequests, payrollRecords, reviews }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pay');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">My HR</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your personal employment information</p>
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

      {activeTab === 'pay' && (
        <MyPayTab
          profile={profile}
          employeeProfile={employeeProfile}
          commissions={commissions}
          payrollRecords={payrollRecords}
        />
      )}
      {activeTab === 'leave' && (
        <MyLeaveTab
          profile={profile}
          employeeProfile={employeeProfile}
          leaveRequests={leaveRequests}
        />
      )}
      {activeTab === 'performance' && (
        <MyPerformanceTab reviews={reviews} />
      )}
    </div>
  );
}
