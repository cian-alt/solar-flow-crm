'use client';

import { useState } from "react";
import type { Lead, Profile, Onboarding, OnboardingPackage } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { createOnboarding, PACKAGE_META } from "@/lib/onboarding";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  profiles: Profile[];
  onCreated: (o: Onboarding) => void;
}

const PACKAGES: OnboardingPackage[] = ["Basic", "Pro", "Premium"];

export default function NewOnboardingModal({ isOpen, onClose, leads, profiles, onCreated }: Props) {
  const supabase = createClient();
  const [leadId, setLeadId] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pkg, setPkg] = useState<OnboardingPackage>("Pro");
  const [am, setAm] = useState("");
  const [saving, setSaving] = useState(false);

  const pickLead = (id: string) => {
    setLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setCompany(lead.company_name);
      setContact(lead.contact_name ?? "");
      setEmail(lead.email ?? "");
      setPhone(lead.phone ?? "");
      if (lead.assigned_to) setAm(lead.assigned_to);
      if (lead.recommended_onboarding) setPkg(lead.recommended_onboarding);
    }
  };

  const submit = async () => {
    if (!company.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    const res = await createOnboarding(supabase, {
      leadId: leadId || null,
      companyName: company.trim(),
      contactName: contact || null,
      email: email || null,
      phone: phone || null,
      pkg,
      assignedAm: am || null,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.includes("does not exist") ? "Run the onboarding SQL migration first" : res.error);
      return;
    }
    if (res.existed && res.onboarding) {
      toast("That lead already has an onboarding");
      onCreated(res.onboarding);
      onClose();
      return;
    }
    if (res.onboarding) {
      toast.success(`Onboarding created for ${res.onboarding.client_company_name}`);
      onCreated(res.onboarding);
      reset();
      onClose();
    }
  };

  const reset = () => {
    setLeadId(""); setCompany(""); setContact(""); setEmail(""); setPhone(""); setPkg("Pro"); setAm("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Onboarding" size="md">
      <div className="space-y-4">
        <Select
          label="Attach to lead (optional)"
          placeholder="Select a lead…"
          options={leads.map((l) => ({ value: l.id, label: l.company_name }))}
          value={leadId}
          onChange={(e) => pickLead(e.target.value)}
        />
        <Input label="Company Name *" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Solar Ltd" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Contact Name" value={contact} onChange={(e) => setContact(e.target.value)} />
          <Input label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input label="Contact Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Onboarding Package"
            options={PACKAGES.map((p) => ({ value: p, label: `${p} — ${PACKAGE_META[p].fee === 0 ? "Free" : "€" + PACKAGE_META[p].fee.toLocaleString("en-IE")}` }))}
            value={pkg}
            onChange={(e) => setPkg(e.target.value as OnboardingPackage)}
          />
          <Select
            label="Assigned AM"
            placeholder="Unassigned"
            options={profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.email }))}
            value={am}
            onChange={(e) => setAm(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">{PACKAGE_META[pkg].summary}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create Onboarding</Button>
        </div>
      </div>
    </Modal>
  );
}
