"use client";

import { useResumeGlobalState } from "./resume_global_state";

function parseCodeAndMessage(input: string): { code: string; message: string } | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const statusPrefixMatch = trimmed.match(/^(\d{3})\s+([\s\S]+)$/);
  const prefixedCode = statusPrefixMatch?.[1] ?? "";
  const payload = (statusPrefixMatch?.[2] ?? trimmed).trim();

  try {
    const parsed = JSON.parse(payload) as unknown;
    const parsedResult = extractCodeAndMessage(parsed, prefixedCode);
    if (parsedResult) {
      return parsedResult;
    }
  } catch {
    // Continue to string-pattern parsing when payload is not direct JSON.
  }

  return extractCodeAndMessage(payload, prefixedCode);
}

function extractCodeAndMessage(value: unknown, fallbackCode = ""): { code: string; message: string } | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    // Handles strings like: "Gemini request failed: 400 {\"error\":{...}}"
    const nestedJsonMatch = normalized.match(/(\d{3})\s+(\{[\s\S]*\})$/);
    if (nestedJsonMatch) {
      const nestedCode = nestedJsonMatch[1];
      const nestedJsonPayload = nestedJsonMatch[2];
      try {
        const nestedParsed = JSON.parse(nestedJsonPayload) as unknown;
        const nestedResult = extractCodeAndMessage(nestedParsed, nestedCode);
        if (nestedResult) {
          return nestedResult;
        }
      } catch {
        // Fall through to plain text formatting.
      }
    }

    const prefixedMatch = normalized.match(/^(\d{3})\s*[:\-]?\s*(.+)$/);
    if (prefixedMatch) {
      return {
        code: prefixedMatch[1],
        message: prefixedMatch[2].trim(),
      };
    }

    if (fallbackCode) {
      return { code: fallbackCode, message: normalized };
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const code =
    typeof record.code === "number"
      ? String(record.code)
      : typeof record.code === "string"
        ? record.code
        : fallbackCode;

  if (typeof record.error === "string") {
    const fromErrorText = extractCodeAndMessage(record.error, code);
    if (fromErrorText) {
      return fromErrorText;
    }
  }

  if (record.error && typeof record.error === "object") {
    const fromNestedErrorObject = extractCodeAndMessage(record.error, code);
    if (fromNestedErrorObject) {
      return fromNestedErrorObject;
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return {
      code: code || "unknown",
      message: record.message.trim(),
    };
  }

  return null;
}

function formatGlobalErrorMessage(rawMessage: string): string {
  const parsed = parseCodeAndMessage(rawMessage);
  if (!parsed) {
    return rawMessage;
  }

  return `${parsed.code}: ${parsed.message}`;
}

export default function GlobalErrorStack() {
  const { globalErrors, clearGlobalError, clearAllGlobalErrors } = useResumeGlobalState();

  if (globalErrors.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-6xl flex-col gap-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearAllGlobalErrors}
            className="rounded-md border border-red-300 bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition hover:bg-red-200"
          >
            Clear all
          </button>
        </div>

        {globalErrors.map((error) => (
          <div
            key={error.id}
            className="global-error-toast flex items-start gap-3 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-900 shadow-lg"
            role="status"
            aria-live="polite"
          >
            <span className="mt-0.5 font-semibold" aria-hidden="true">
              !
            </span>
            <p className="min-w-0 flex-1 break-words">{formatGlobalErrorMessage(error.message)}</p>
            <button
              type="button"
              onClick={() => clearGlobalError(error.id)}
              className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 transition hover:bg-red-200"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
