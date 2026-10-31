import { useState } from "react";

import { reportsApi } from "../../../api/reports";
import { Button, Card, Cluster, Field, Text } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/apiError";
import styles from "./ReportUploadForm.module.css";

export const ALLOWED_REPORT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

export type AllowedReportMimeType = (typeof ALLOWED_REPORT_MIME_TYPES)[number];

export function isAllowedReportMimeType(mimeType: string): boolean {
  return (ALLOWED_REPORT_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

interface ReportUploadFormProps {
  onUploaded: () => Promise<void>;
  onError: (error: string | null) => void;
  onNotice: (notice: string | null) => void;
  onCancel?: () => void;
}

export function ReportUploadForm({
  onUploaded,
  onError,
  onNotice,
  onCancel,
}: ReportUploadFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    mimeType: string;
    contentBase64: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function processFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      onError("Selected file exceeds the 2 MB maximum size limit.");
      setSelectedFile(null);
      return;
    }

    const detectedMime = (file.type || "").toLowerCase();
    if (!isAllowedReportMimeType(detectedMime)) {
      onError(
        `Unsupported file type "${detectedMime || "unknown"}". Allowed document types: PDF, JPEG, PNG, WEBP, and TXT (max 2 MB).`,
      );
      setSelectedFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      setSelectedFile({
        fileName: file.name,
        mimeType: detectedMime,
        contentBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    onError(null);
    onNotice(null);
    if (!title.trim() || !selectedFile) {
      onError("Please enter a report title and choose a file to upload.");
      return;
    }
    if (!isAllowedReportMimeType(selectedFile.mimeType)) {
      onError(
        "Unsupported file format. Please select a valid document (PDF, JPEG, PNG, WEBP, TXT).",
      );
      return;
    }
    setUploading(true);
    try {
      await reportsApi.uploadReport({
        title: title.trim(),
        fileName: selectedFile.fileName,
        mimeType: selectedFile.mimeType,
        contentBase64: selectedFile.contentBase64,
        notes: notes.trim() || null,
      });
      setTitle("");
      setNotes("");
      setSelectedFile(null);
      onNotice("Medical report uploaded. Your treating doctors can now review it.");
      await onUploaded();
    } catch (caught) {
      onError(getErrorMessage(caught, "Could not upload medical report."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <h2>Upload a medical report</h2>
      <form onSubmit={handleUpload} className={styles.form}>
        <div className={styles.filtersRow}>
          <Field
            label="Report title"
            value={title}
            onChange={setTitle}
            placeholder="e.g. Complete Blood Count (CBC), Chest X-Ray"
            required
          />
          <Field
            label="Notes (optional)"
            value={notes}
            onChange={setNotes}
            placeholder="e.g. Fasting sample from Popular Diagnostic"
          />
        </div>

        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <svg className={styles.dropzoneIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className={styles.dropzonePrompt}>
            {selectedFile
              ? `Ready to upload: ${selectedFile.fileName}`
              : "Drag & drop your diagnostic report here, or choose below"}
          </span>
        </div>

        <label className={styles.fileLabel}>
          <span className={styles.fileLabelText}>
            Select file (Supported formats: PDF, JPEG, PNG, WEBP, TXT · max 2 MB)
          </span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain"
            onChange={handleFileChange}
            className={styles.fileInput}
            required={!selectedFile}
          />
        </label>

        {selectedFile && (
          <div className={styles.fileSelectedBadge}>
            <span>
              Selected: <strong>{selectedFile.fileName}</strong> ({selectedFile.mimeType})
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              Clear
            </Button>
          </div>
        )}

        <Text tone="muted" size="sm" className={styles.helpText}>
          Allowed file formats: <code>.pdf</code>, <code>.jpg</code>, <code>.png</code>,{" "}
          <code>.webp</code>, <code>.txt</code> (up to 2 MB)
        </Text>

        <Cluster gap={2} className={styles.actions}>
          <Button type="submit" disabled={uploading || !selectedFile}>
            {uploading ? "Uploading…" : "Upload report"}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={uploading}>
              Cancel
            </Button>
          )}
        </Cluster>
      </form>
    </Card>
  );
}
