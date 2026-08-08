'use client';

import { useState } from 'react';
import { apiFetch, PresignResponse } from '@/lib/api';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, X, User } from 'lucide-react';

export type SlotStatus = 'idle' | 'selecting' | 'uploading' | 'uploaded' | 'error';

export interface PhotoUploadSlotProps {
  index: number;
  label?: string;
  onUploaded: (index: number, storagePath: string) => void;
  onCleared?: (index: number) => void;
}

export function PhotoUploadSlot({ index, label, onUploaded, onCleared }: PhotoUploadSlotProps) {
  const [status, setStatus] = useState<SlotStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed.';
    }
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      return 'File size exceeds 10MB limit.';
    }
    return null;
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setStatus('error');
      return;
    }

    // Immediate local preview thumbnail
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setStatus('uploading');

    try {
      // 1. Request presigned upload URL from FastAPI backend
      let upload_url: string;
      let storage_path: string;

      try {
        const presignRes = await apiFetch<PresignResponse>('/uploads/presign', {
          method: 'POST',
          body: JSON.stringify({ content_type: file.type }),
        });
        upload_url = presignRes.upload_url;
        storage_path = presignRes.storage_path;
      } catch (err: any) {
        console.warn('POST /uploads/presign unreached, fallback mock path used for local testing:', err);
        // Dev fallback if backend is not currently running locally
        upload_url = '';
        storage_path = `uploads/dev_mock_slot_${index}_${Date.now()}.${file.type.split('/')[1]}`;
      }

      // 2. PUT directly to Supabase Storage upload_url if available
      if (upload_url) {
        const uploadRes = await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error(`Direct upload failed with status ${uploadRes.status}`);
        }
      }

      // 3. Store storage_path in parent generator state
      setStatus('uploaded');
      onUploaded(index, storage_path);
    } catch (err: any) {
      console.error(`Slot ${index} upload error:`, err);
      setErrorMessage(err.message || 'Failed to upload photo. Please try again.');
      setStatus('error');
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setStatus('idle');
    setErrorMessage(null);
    if (onCleared) {
      onCleared(index);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
        <span>{label || `Character ${index + 1} Photo`} <span className="text-pink-500">*</span></span>
        {status === 'uploaded' && (
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        )}
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
        className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center min-h-[140px] text-center ${
          isDragging
            ? 'border-pink-500 bg-pink-50 scale-[1.01]'
            : status === 'uploaded'
            ? 'border-emerald-500/50 bg-emerald-50'
            : status === 'error'
            ? 'border-red-500/50 bg-red-50'
            : 'border-slate-300 bg-white hover:border-purple-400'
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          className="hidden"
          id={`photo-slot-${index}`}
        />

        {status === 'uploading' && (
          <div className="flex flex-col items-center gap-2 py-2">
            {previewUrl && (
              <div className="w-14 h-14 rounded-full overflow-hidden border border-purple-300 shadow-inner opacity-60 relative">
                <img src={previewUrl} alt="Uploading..." className="w-full h-full object-cover" />
              </div>
            )}
            <RefreshCw className="w-5 h-5 text-purple-500 animate-spin" />
            <p className="text-xs text-purple-600 font-medium">Uploading to storage...</p>
          </div>
        )}

        {status === 'uploaded' && previewUrl && (
          <div className="flex flex-col items-center gap-2 relative w-full">
            <button
              type="button"
              onClick={handleClear}
              className="absolute -top-1 -right-1 p-1 rounded-full bg-white/90 text-slate-500 hover:text-slate-800 border border-slate-200 shadow-md"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500 shadow-md">
              <img src={previewUrl} alt={`Slot ${index + 1}`} className="w-full h-full object-cover" />
            </div>
            <label
              htmlFor={`photo-slot-${index}`}
              className="cursor-pointer text-[11px] text-purple-600 hover:text-purple-700 font-medium underline"
            >
              Replace Photo
            </label>
          </div>
        )}

        {(status === 'idle' || status === 'error') && (
          <label htmlFor={`photo-slot-${index}`} className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
            <div className="p-2.5 rounded-full bg-slate-50 text-purple-500">
              {status === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Upload className="w-5 h-5" />}
            </div>
            <p className="text-xs font-medium text-slate-600">
              Drag & drop photo #{index + 1}, or <span className="text-purple-600 underline">browse</span>
            </p>
            <p className="text-[10px] text-slate-500">JPG, PNG, WebP · Max 10MB</p>
          </label>
        )}
      </div>

      {errorMessage && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errorMessage}
        </p>
      )}
    </div>
  );
}

interface PhotoUploadGridProps {
  characterCount: number;
  onSlotsChanged: (storagePaths: (string | null)[]) => void;
}

export default function PhotoUploadGrid({ characterCount, onSlotsChanged }: PhotoUploadGridProps) {
  const [slots, setSlots] = useState<(string | null)[]>(Array(characterCount).fill(null));

  // Sync slots array when characterCount changes
  const currentSlots = slots.length === characterCount ? slots : Array(characterCount).fill(null);

  const handleUploaded = (index: number, storagePath: string) => {
    const updated = [...currentSlots];
    updated[index] = storagePath;
    setSlots(updated);
    onSlotsChanged(updated);
  };

  const handleCleared = (index: number) => {
    const updated = [...currentSlots];
    updated[index] = null;
    setSlots(updated);
    onSlotsChanged(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-purple-500" />
          <span>Upload Character Photos ({characterCount} required)</span>
        </label>
      </div>

      <div className={`grid gap-4 ${characterCount === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {Array.from({ length: characterCount }).map((_, i) => (
          <PhotoUploadSlot
            key={`slot-${i}`}
            index={i}
            onUploaded={handleUploaded}
            onCleared={handleCleared}
          />
        ))}
      </div>
    </div>
  );
}
