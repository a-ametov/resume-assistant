"use client";

import { useEffect, useState } from "react";
import type { SerializedEducationEntryState } from "../state/app_state";
import { useResumeGlobalState } from "./resume_global_state";

export default function EducationEntry({
  educationId,
  initialData,
  onDelete,
}: {
  educationId: number;
  initialData?: SerializedEducationEntryState;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [fromDate, setFromDate] = useState(initialData?.fromDate ?? "");
  const [toDate, setToDate] = useState(initialData?.toDate ?? "");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { registerEducationEntry, updateEducationEntry } = useResumeGlobalState();

  const commitStateNow = () => {
    updateEducationEntry(educationId, {
      name,
      title,
      fromDate,
      toDate,
      isCollapsed,
    });
  };

  const formatMonth = (value: string) => {
    if (!value) {
      return "Not set";
    }

    const [year, month] = value.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthIndex = Number(month) - 1;
    return `${monthNames[monthIndex] ?? month} ${year}`;
  };

  const formatMonthWithFallback = (value: string, fallback: string) => {
    if (!value) {
      return fallback;
    }

    return formatMonth(value);
  };

  useEffect(() => {
    registerEducationEntry(educationId);
  }, [educationId, registerEducationEntry]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateEducationEntry(educationId, {
        name,
        title,
        fromDate,
        toDate,
        isCollapsed,
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [educationId, name, title, fromDate, toDate, isCollapsed, updateEducationEntry]);

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className={isCollapsed ? "flex items-center gap-3" : "hidden"}>
        <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="truncate whitespace-nowrap text-sm text-zinc-700">
            {name.trim() || "Education"} - {title.trim() || "Title"} ({formatMonthWithFallback(fromDate, "Unknown")} to {formatMonthWithFallback(toDate, "Current")})
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete?.()}
          aria-label="Delete education"
          className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
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
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            commitStateNow();
            setIsCollapsed((prev) => !prev);
          }}
          className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
        >
          Expand
        </button>
      </div>

      <div className={isCollapsed ? "hidden" : "block"}>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-800" htmlFor={`education-name-${educationId}`}>
                Name
              </label>
              <input
                id={`education-name-${educationId}`}
                type="text"
                placeholder="School name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-800" htmlFor={`education-title-${educationId}`}>
                Title
              </label>
              <input
                id={`education-title-${educationId}`}
                type="text"
                placeholder="Degree or program"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor={`education-from-date-${educationId}`}>
                  From (Month/Year)
                </label>
                <input
                  id={`education-from-date-${educationId}`}
                  type="month"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor={`education-to-date-${educationId}`}>
                  To (Month/Year)
                </label>
                <input
                  id={`education-to-date-${educationId}`}
                  type="month"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                />
              </div>
            </div>

            <div className="hidden flex-col items-stretch gap-9 pt-6 md:flex">
              <button
                type="button"
                onClick={() => {
                  commitStateNow();
                  setIsCollapsed(true);
                }}
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
              >
                Collapse
              </button>
              <button
                type="button"
                onClick={() => onDelete?.()}
                className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col items-end gap-2 md:hidden">
          <button
            type="button"
            onClick={() => {
              commitStateNow();
              setIsCollapsed(true);
            }}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={() => onDelete?.()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    </section>
  );
}
