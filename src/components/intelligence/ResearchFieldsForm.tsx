'use client';

import type { Lead } from "@/types/database";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import {
  CONTRACTOR_TYPES,
  ANNUAL_TURNOVERS,
  LINKEDIN_ACTIVITIES,
  CONTACT_METHODS,
  IRISH_COUNTIES,
} from "@/lib/leadScoring";

// The editable research draft — a subset of Lead the AM fills in.
export type ResearchDraft = Pick<
  Lead,
  | "contractor_type"
  | "jobs_per_week"
  | "annual_turnover"
  | "num_employees"
  | "county"
  | "uses_existing_software"
  | "existing_software_name"
  | "linkedin_url"
  | "linkedin_activity"
  | "preferred_contact_method"
  | "decision_maker_identified"
  | "decision_maker_name"
  | "decision_maker_linkedin"
>;

interface Props {
  value: ResearchDraft;
  onChange: (patch: Partial<ResearchDraft>) => void;
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const numOrNull = (raw: string): number | null => (raw === "" ? null : Number(raw));

export default function ResearchFieldsForm({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Select
        label="Contractor Type"
        placeholder="Select type…"
        options={toOptions(CONTRACTOR_TYPES)}
        value={value.contractor_type ?? ""}
        onChange={(e) => onChange({ contractor_type: (e.target.value || null) as ResearchDraft["contractor_type"] })}
      />

      <Input
        label="Jobs Per Week"
        type="number"
        min={0}
        placeholder="e.g. 12"
        value={value.jobs_per_week ?? ""}
        onChange={(e) => onChange({ jobs_per_week: numOrNull(e.target.value) })}
      />

      <Select
        label="Annual Turnover"
        placeholder="Select range…"
        options={toOptions(ANNUAL_TURNOVERS)}
        value={value.annual_turnover ?? ""}
        onChange={(e) => onChange({ annual_turnover: (e.target.value || null) as ResearchDraft["annual_turnover"] })}
      />

      <Input
        label="Number of Employees"
        type="number"
        min={0}
        placeholder="e.g. 24"
        value={value.num_employees ?? ""}
        onChange={(e) => onChange({ num_employees: numOrNull(e.target.value) })}
      />

      <Select
        label="County"
        placeholder="Select county…"
        options={toOptions(IRISH_COUNTIES)}
        value={value.county ?? ""}
        onChange={(e) => onChange({ county: e.target.value || null })}
      />

      <Select
        label="Preferred Contact Method"
        placeholder="Select method…"
        options={toOptions(CONTACT_METHODS)}
        value={value.preferred_contact_method ?? ""}
        onChange={(e) => onChange({ preferred_contact_method: (e.target.value || null) as ResearchDraft["preferred_contact_method"] })}
      />

      <Input
        label="LinkedIn URL"
        type="url"
        placeholder="https://linkedin.com/company/…"
        value={value.linkedin_url ?? ""}
        onChange={(e) => onChange({ linkedin_url: e.target.value || null })}
      />

      <Select
        label="LinkedIn Activity"
        placeholder="Select activity…"
        options={toOptions(LINKEDIN_ACTIVITIES)}
        value={value.linkedin_activity ?? ""}
        onChange={(e) => onChange({ linkedin_activity: (e.target.value || null) as ResearchDraft["linkedin_activity"] })}
      />

      {/* Uses existing software */}
      <div className="sm:col-span-2 flex flex-col gap-3 p-3.5 rounded-xl bg-white/50 border border-white/70">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Uses existing job-management software?</span>
          <Toggle
            checked={value.uses_existing_software ?? false}
            onChange={(c) => onChange({ uses_existing_software: c, ...(c ? {} : { existing_software_name: null }) })}
          />
        </div>
        {value.uses_existing_software && (
          <Input
            label="Which software?"
            placeholder="e.g. simPRO, Tradify, Joblogic…"
            value={value.existing_software_name ?? ""}
            onChange={(e) => onChange({ existing_software_name: e.target.value || null })}
          />
        )}
      </div>

      {/* Decision maker */}
      <div className="sm:col-span-2 flex flex-col gap-3 p-3.5 rounded-xl bg-white/50 border border-white/70">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Decision maker identified?</span>
          <Toggle
            checked={value.decision_maker_identified ?? false}
            onChange={(c) =>
              onChange({
                decision_maker_identified: c,
                ...(c ? {} : { decision_maker_name: null, decision_maker_linkedin: null }),
              })
            }
          />
        </div>
        {value.decision_maker_identified && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Decision Maker Name"
              placeholder="e.g. Mary O'Brien"
              value={value.decision_maker_name ?? ""}
              onChange={(e) => onChange({ decision_maker_name: e.target.value || null })}
            />
            <Input
              label="Decision Maker LinkedIn"
              type="url"
              placeholder="https://linkedin.com/in/…"
              value={value.decision_maker_linkedin ?? ""}
              onChange={(e) => onChange({ decision_maker_linkedin: e.target.value || null })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
