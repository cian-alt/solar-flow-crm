'use client';

import { useState } from "react";
import { Upload, Download, Trash2, FileText, Eye, EyeOff } from "lucide-react";
import type { Onboarding, OnboardingDocument, OnboardingDocumentType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { uploadDocument } from "@/lib/storage";
import { cn, formatDate } from "@/lib/utils";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import toast from "react-hot-toast";

interface Props {
  onboarding: Onboarding;
  documents: OnboardingDocument[];
  onDocumentsChange: (d: OnboardingDocument[]) => void;
}

const DOC_TYPES: { value: OnboardingDocumentType; label: string }[] = [
  { value: "sla", label: "SLA" },
  { value: "welcome_pack", label: "Welcome Pack" },
  { value: "training_guide", label: "Training Guide" },
  { value: "setup_guide", label: "Setup Guide" },
  { value: "department_guide", label: "Department Guide" },
  { value: "other", label: "Other" },
];

export default function OnbDocumentsTab({ onboarding, documents, onDocumentsChange }: Props) {
  const supabase = createClient();
  const [docType, setDocType] = useState<OnboardingDocumentType>("welcome_pack");
  const [visible, setVisible] = useState(true);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const path = `onboarding/${onboarding.id}/${Date.now()}-${file.name}`;
    const up = await uploadDocument(supabase, file, path);
    if (up.error || !up.url) { toast.error(up.error ?? "Upload failed"); setUploading(false); return; }
    const { data, error } = await supabase.from("onboarding_documents").insert({
      onboarding_id: onboarding.id, document_type: docType, title: file.name, file_url: up.url, uploaded_by: user?.id ?? null, visible_to_client: visible,
    }).select("*, uploader:profiles!uploaded_by(id,full_name,avatar_initials)").single();
    setUploading(false);
    if (error || !data) { toast.error(error?.message.includes("does not exist") ? "Run the onboarding SQL migration first" : "Failed to save"); return; }
    onDocumentsChange([data as OnboardingDocument, ...documents]);
    toast.success("Document uploaded");
  };

  const toggleVisible = async (doc: OnboardingDocument) => {
    const v = !doc.visible_to_client;
    onDocumentsChange(documents.map((d) => (d.id === doc.id ? { ...d, visible_to_client: v } : d)));
    await supabase.from("onboarding_documents").update({ visible_to_client: v }).eq("id", doc.id);
  };

  const remove = async (doc: OnboardingDocument) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    onDocumentsChange(documents.filter((d) => d.id !== doc.id));
    await supabase.from("onboarding_documents").delete().eq("id", doc.id);
    toast.success("Document deleted");
  };

  return (
    <div className="space-y-4">
      <div className="glass-sm p-4 flex items-end gap-3 flex-wrap">
        <div className="w-40"><Select label="Document type" options={DOC_TYPES} value={docType} onChange={(e) => setDocType(e.target.value as OnboardingDocumentType)} /></div>
        <div className="flex items-center gap-2 pb-2.5">
          <Toggle checked={visible} onChange={setVisible} />
          <span className="text-sm text-slate-600">Visible to client</span>
        </div>
        <label className={cn("ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-[#152E55] transition-colors", uploading && "opacity-60 pointer-events-none")}>
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload Document"}
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Upload SLAs, welcome packs and guides for this client." />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-sm p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1B3A6B]/10 text-[#1B3A6B] flex items-center justify-center shrink-0"><FileText size={16} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0F172A] truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="default">{DOC_TYPES.find((t) => t.value === doc.document_type)?.label ?? doc.document_type}</Badge>
                  <span className="text-[11px] text-slate-400">{formatDate(doc.created_at)}</span>
                </div>
              </div>
              <button onClick={() => toggleVisible(doc)} title={doc.visible_to_client ? "Visible to client" : "Internal only"} className={cn("p-1.5 rounded-lg transition-colors", doc.visible_to_client ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100")}>
                {doc.visible_to_client ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#1B3A6B] transition-colors"><Download size={16} /></a>
              <button onClick={() => remove(doc)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
