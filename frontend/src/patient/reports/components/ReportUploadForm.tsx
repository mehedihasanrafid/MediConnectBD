import { useState } from "react";

import { reportsApi } from "../../../api/reports";
import { Button, Card, Field } from "../../../components/ui";
import { getErrorMessage } from "../../../shared/utils/apiError";

interface ReportUploadFormProps {
  onUploaded: () => Promise<void>;
  onError: (error: string | null) => void;
  onNotice: (notice: string | null) => void;
}

export function ReportUploadForm({
  onUploaded,
  onError,
  onNotice,
}: ReportUploadFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    mimeType: string;
    contentBase64: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onError("Selected file exceeds the 2 MB maximum size limit.");
      setSelectedFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      setSelectedFile({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    onError(null);
    onNotice(null);
    if (!title.trim() || !selectedFile) {
      onError("Please enter a report title and choose a file to upload.");
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
      <form onSubmit={handleUpload} className="page" style={{ marginTop: "0.5rem" }}>
        <div className="filters">
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
        <label className="field">
          <span>Select file (PDF, image, or text · max 2 MB)</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/*"
            onChange={handleFileChange}
            required
          />
        </label>
        <div className="row">
          <Button type="submit" disabled={uploading || !selectedFile}>
            {uploading ? "Uploading…" : "Upload report"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
