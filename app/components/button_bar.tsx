"use client";

import { useRef, useState } from "react";
import BackendClient from "../client/backend_client";
import { serializePositionState } from "../state/resume_position_state";
import { useResumeGlobalState } from "./resume_global_state";

type FileSystemWritableFileStreamLike = {
  write: (data: string | Blob | ArrayBuffer | Uint8Array) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandleLike = {
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandleLike>;
};

export default function ButtonBar() {
  const { positionState, loadSerializedPositionState, isDirty, markSavedClean } = useResumeGlobalState();
  const backendClient = BackendClient.getInstance();
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [exportError, setExportError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = async () => {
    const pickerWindow = window as SaveFilePickerWindow;
    if (!pickerWindow.showSaveFilePicker) {
      setSaveError("Save dialog is not supported in this browser.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      const fileHandle = await pickerWindow.showSaveFilePicker({
        suggestedName: "resume-state.json",
        types: [
          {
            description: "JSON Files",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      const serialized = serializePositionState(positionState);
      await writable.write(`${JSON.stringify(serialized, null, 2)}\n`);
      await writable.close();
      markSavedClean();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "Unable to save file.";

      if (errorMessage.toLowerCase().includes("abort")) {
        return;
      }

      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadClick = () => {
    setLoadError("");
    fileInputRef.current?.click();
  };

  const handleExport = async () => {
    setExportError("");
    setIsExporting(true);

    try {
      const result = await backendClient.exportPdf();
      const pickerWindow = window as SaveFilePickerWindow;
      const defaultName = result.fileName.toLowerCase().endsWith(".pdf")
        ? result.fileName
        : `${result.fileName}.pdf`;

      if (pickerWindow.showSaveFilePicker) {
        const fileHandle = await pickerWindow.showSaveFilePicker({
          suggestedName: defaultName,
          types: [
            {
              description: "PDF Files",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([result.bytes], { type: result.contentType }));
        await writable.close();
      } else {
        const customName = window.prompt("Save PDF as", defaultName);
        if (!customName) {
          return;
        }

        const chosenName = customName.toLowerCase().endsWith(".pdf")
          ? customName
          : `${customName}.pdf`;

        const pdfBlob = new Blob([result.bytes], { type: result.contentType });
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement("a");

        downloadLink.href = downloadUrl;
        downloadLink.download = chosenName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (caughtError) {
      setExportError(
        caughtError instanceof Error ? caughtError.message : "Unable to export resume.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    try {
      const text = await selectedFile.text();
      const parsed = JSON.parse(text) as unknown;
      const isValid = loadSerializedPositionState(parsed);

      if (!isValid) {
        setLoadError("Invalid resume state file.");
      }
    } catch {
      setLoadError("Invalid resume state file.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileSelected}
        />
        <button
          type="button"
          title="Save"
          aria-label="Save"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`relative inline-flex h-10 w-10 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 ${
            isDirty
              ? "border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              : "border-zinc-200 bg-zinc-50 text-zinc-400 hover:bg-zinc-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M4 4h14l2 2v14H4z" />
            <path d="M8 4v6h8V4" />
            <path d="M8 20v-6h8v6" />
          </svg>
          {!isDirty ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white text-green-600"
              aria-hidden="true"
            >
              <path d="m5 12 4 4 10-10" />
            </svg>
          ) : null}
        </button>
        <button
          type="button"
          title="Load"
          aria-label="Load"
          onClick={handleLoadClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 text-zinc-800 transition hover:bg-zinc-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            <path d="M12 3v13" />
            <path d="m8 13 4 4 4-4" />
          </svg>
        </button>
        <button
          type="button"
          title="Export"
          aria-label="Export"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 text-zinc-800 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <rect x="6" y="3" width="12" height="6" rx="1" />
            <rect x="7" y="14" width="10" height="7" rx="1" />
            <path d="M6 17H4a2 2 0 0 1-2-2v-3a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v3a2 2 0 0 1-2 2h-2" />
            <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
          </svg>
        </button>
        {saveError ? (
          <p className="text-sm text-red-600" role="status" aria-live="polite">
            {saveError}
          </p>
        ) : null}
        {loadError ? (
          <p className="text-sm text-red-600" role="status" aria-live="polite">
            {loadError}
          </p>
        ) : null}
        {exportError ? (
          <p className="text-sm text-red-600" role="status" aria-live="polite">
            {exportError}
          </p>
        ) : null}
      </div>
  );
}
