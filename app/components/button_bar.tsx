"use client";

import { useRef, useState } from "react";
import BackendClient from "../client/backend_client";
import { serializeAppState } from "../state/app_state";
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
  const { appState, loadSerializedAppState, isDirty, markSavedClean } = useResumeGlobalState();
  const backendClient = BackendClient.getInstance();
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [exportError, setExportError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingState, setIsExportingState] = useState(false);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSaveDisabled = isSaving || (!isDirty && !isOutOfSync);
  const isSaveActive = isDirty || isOutOfSync;

  const handleSave = async () => {
    setSaveError("");
    setIsSaving(true);

    try {
      const serialized = serializeAppState(appState);
      const response = await fetch("/api/storage/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serialized),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Unable to save state (${response.status}).`);
      }

      markSavedClean();
      setIsOutOfSync(false);
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "Unable to save state.";

      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportState = async () => {
    const pickerWindow = window as SaveFilePickerWindow;
    if (!pickerWindow.showSaveFilePicker) {
      setExportError("Save dialog is not supported in this browser.");
      return;
    }

    setExportError("");
    setIsExportingState(true);

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
      const serialized = serializeAppState(appState);
      await writable.write(`${JSON.stringify(serialized, null, 2)}\n`);
      await writable.close();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "Unable to export state file.";

      if (errorMessage.toLowerCase().includes("abort")) {
        return;
      }

      setExportError(errorMessage);
    } finally {
      setIsExportingState(false);
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
      const isValid = loadSerializedAppState(parsed);

      if (!isValid) {
        setLoadError("Invalid resume state file.");
      } else {
        setIsOutOfSync(true);
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
          disabled={isSaveDisabled}
          className={`relative inline-flex h-10 w-10 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 ${
            isSaveActive
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
          {isOutOfSync ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white text-red-600"
              aria-hidden="true"
            >
              <path d="M12 7v6" />
              <path d="M12 17h.01" />
            </svg>
          ) : !isDirty ? (
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
          title="Import"
          aria-label="Import"
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 12v6" />
            <path d="m9 15 3 3 3-3" />
          </svg>
        </button>
        <button
          type="button"
          title="Export"
          aria-label="Export"
          onClick={handleExportState}
          disabled={isExportingState}
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 18V12" />
            <path d="m9 15 3-3 3 3" />
          </svg>
        </button>
        <button
          type="button"
          title="Generate"
          aria-label="Generate"
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
