'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, File, Trash2, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import type { Document, DocumentType } from '@/types/database';
import toast from 'react-hot-toast';

interface Props { documents: Document[]; leadId: string; onDocsChange: (docs: Document[]) => void; }

const DOC_TYPES: DocumentType[] = ['proposal','contract','invoice','design','other'];
const DOC_ICONS: Record<DocumentType, React.ElementType> = {
  proposal: FileText, contract: FileText, invoice: FileText, design: File, other: File,
};
const DOC_COLORS: Record<DocumentType, string> = {
  proposal: '#1B3A6B', contract: '#059669', invoice: '#D97706', design: '#7C3AED', other: '#64748B',
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab({ documents, leadId, onDocsChange }: Props) {
  const [docType, setDocType] = useState<DocumentType>('proposal');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadFile = async (file: File) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const fileName = `${leadId}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from('documents').upload(fileName, file);

    if (storageError) {
      toast.error('Upload failed — ensure Supabase Storage bucket "documents" exists');
      setUploading(false); return;
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

    const { data, error } = await supabase.from('documents').insert({
      lead_id: leadId, uploaded_by: user.id, name: file.name,
      file_url: publicUrl, file_size: file.size,
      file_type: file.type, document_type: docType,
    }).select('*, uploader:profiles!uploaded_by(id,full_name,avatar_initials)').single();

    if (error) { toast.error('Failed to save document record'); setUploading(false); return; }

    await supabase.from('activities').insert({
      lead_id: leadId, user_id: user.id, type: 'document_uploaded',
      description: `Uploaded "${file.name}"`, metadata: { doc_type: docType },
    });

    onDocsChange([...documents, data as Document]);
    toast.success('Document uploaded');
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const deleteDoc = async (doc: Document) => {
    if (!confirm('Delete this document?')) return;
    await supabase.from('documents').delete().eq('id', doc.id);
    onDocsChange(documents.filter(d => d.id !== doc.id));
    toast.success('Document deleted');
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select value={docType} onChange={e => setDocType(e.target.value as DocumentType)}
            className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none">
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#1B3A6B]/40 hover:bg-[#1B3A6B]/3 transition-all"
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}>
          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">{uploading ? 'Uploading...' : 'Drop a file or click to upload'}</p>
          <p className="text-xs text-slate-400 mt-1">PDF, DOC, XLS, JPG, PNG</p>
          <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <File className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">No documents uploaded yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map(doc => {
            const Icon = DOC_ICONS[doc.document_type];
            const color = DOC_COLORS[doc.document_type];
            const uploader = doc.uploader as { full_name?: string } | undefined;
            return (
              <li key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/80 bg-white/60 group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: color + '15' }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{doc.document_type}</span>
                    {doc.file_size && <span className="text-[10px] text-slate-400">{formatBytes(doc.file_size)}</span>}
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(doc.created_at)}</span>
                    {uploader?.full_name && <span className="text-[10px] text-slate-400">by {uploader.full_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1B3A6B] transition-colors">
                    <Download size={14} />
                  </a>
                  <button onClick={() => deleteDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
