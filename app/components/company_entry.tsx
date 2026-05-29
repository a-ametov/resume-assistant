"use client";

import { useEffect, useState } from "react";
import type { SerializedCompanyEntryState } from "../state/app_state";
import ExperienceEntry from "./experience_entry";
import { useResumeGlobalState } from "./resume_global_state";

type ExperienceItem = {
  id: number;
  initialText: string;
};

export default function CompanyEntry({
  companyId,
  initialData,
  onDelete,
}: {
  companyId: number;
  initialData?: SerializedCompanyEntryState;
  onDelete?: () => void;
}) {
  const initialExperienceTexts = (initialData?.experiences ?? []).map((experience) => {
    if (typeof experience === "string") {
      return experience;
    }

    return experience.text ?? "";
  });

  const [companyName, setCompanyName] = useState(initialData?.companyName ?? "");
  const [positionTitle, setPositionTitle] = useState(initialData?.positionTitle ?? "");
  const [positionSummary, setPositionSummary] = useState(initialData?.positionSummary ?? "");
  const [fromDate, setFromDate] = useState(initialData?.fromDate ?? "");
  const [toDate, setToDate] = useState(initialData?.toDate ?? "");
  const [experienceItems, setExperienceItems] = useState<ExperienceItem[]>(
    initialData
      ? initialExperienceTexts.map((text, index) => ({
          id: index + 1,
          initialText: text,
        }))
      : [{ id: 1, initialText: "" }],
  );
  const [hiddenEntryIds, setHiddenEntryIds] = useState<number[]>([]);
  const [collapsedEntryIds, setCollapsedEntryIds] = useState<number[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    registerCompanyEntry,
    updateCompanyEntry,
    updateExperienceEntry,
    setExperienceHidden,
    loadStateRevision,
  } = useResumeGlobalState();

  const commitCompanyStateNow = () => {
    updateCompanyEntry(companyId, {
      companyName,
      positionTitle,
      positionSummary,
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

  const handleAddExperience = () => {
    setExperienceItems((prev) => [
      ...prev,
      { id: prev.length + 1, initialText: "" },
    ]);
  };

  const handleHideExperience = (entryId: number) => {
    setHiddenEntryIds((prev) =>
      prev.includes(entryId) ? prev : [...prev, entryId],
    );
  };

  const handleUndoHiddenExperiences = () => {
    setHiddenEntryIds((prev) => prev.slice(0, -1));
  };

  const handleToggleCollapsedExperience = (entryId: number) => {
    commitCompanyStateNow();
    setCollapsedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId],
    );
  };

  const visibleExperienceItems = experienceItems.filter(
    (entry) => !hiddenEntryIds.includes(entry.id),
  );

  useEffect(() => {
    registerCompanyEntry(companyId);
  }, [companyId, registerCompanyEntry]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateCompanyEntry(companyId, {
        companyName,
        positionTitle,
        positionSummary,
        fromDate,
        toDate,
        isCollapsed,
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    companyId,
    companyName,
    positionTitle,
    positionSummary,
    fromDate,
    toDate,
    isCollapsed,
    updateCompanyEntry,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      experienceItems.forEach((entry) => {
        setExperienceHidden(companyId, entry.id, hiddenEntryIds.includes(entry.id));
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [companyId, experienceItems, hiddenEntryIds, setExperienceHidden]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      experienceItems.forEach((entry) => {
        updateExperienceEntry(companyId, entry.id, {});
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [companyId, experienceItems, updateExperienceEntry]);

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div
        className={isCollapsed ? "flex items-center gap-3" : "hidden"}
      >
          <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="truncate whitespace-nowrap text-sm text-zinc-700">
              {companyName.trim() || "Company"} - {formatMonthWithFallback(fromDate, "Unknown")} to {formatMonthWithFallback(toDate, "Current")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete?.()}
            aria-label="Delete company"
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
              commitCompanyStateNow();
              setIsCollapsed((prev) => !prev);
            }}
            className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Expand
          </button>
      </div>

      <div className={isCollapsed ? "hidden" : "block"}>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="company-name">
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  placeholder="Company"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="position-title">
                  Position Title
                </label>
                <input
                  id="position-title"
                  type="text"
                  placeholder="Position title"
                  value={positionTitle}
                  onChange={(event) => setPositionTitle(event.target.value)}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="from-date">
                  From (Month/Year)
                </label>
                <input
                  id="from-date"
                  type="month"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="to-date">
                  To (Month/Year)
                </label>
                <input
                  id="to-date"
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
                  commitCompanyStateNow();
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

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm font-medium text-zinc-800" htmlFor="position-summary">
                Position Summary
              </label>
              <input
                id="position-summary"
                type="text"
                placeholder="Brief summary of this role"
                value={positionSummary}
                onChange={(event) => setPositionSummary(event.target.value)}
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col items-end gap-2 md:hidden">
            <button
              type="button"
              onClick={() => {
                commitCompanyStateNow();
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

          <hr className="mt-4 border-zinc-200" />

          <div className="mt-4 flex w-full flex-col divide-y divide-zinc-200">
            {visibleExperienceItems.map((entry, index) => (
              <div
                key={`${loadStateRevision}-${entry.id}`}
                className={`w-full py-4 ${
                  index === visibleExperienceItems.length - 1 ? "pb-0" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <ExperienceEntry
                      key={`${loadStateRevision}-${entry.id}`}
                      companyId={companyId}
                      entryId={entry.id}
                      hidden={hiddenEntryIds.includes(entry.id)}
                      isCollapsed={collapsedEntryIds.includes(entry.id)}
                      initialText={entry.initialText}
                      onStateChange={(statePatch) => {
                        updateExperienceEntry(companyId, entry.id, statePatch);
                      }}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleHideExperience(entry.id)}
                      aria-label="Hide experience entry"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
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
                      onClick={() => handleToggleCollapsedExperience(entry.id)}
                      aria-label={
                        collapsedEntryIds.includes(entry.id)
                          ? "Expand experience details"
                          : "Collapse experience details"
                      }
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
                        {collapsedEntryIds.includes(entry.id) ? (
                          <path d="m6 9 6 6 6-6" />
                        ) : (
                          <path d="m6 15 6-6 6 6" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {hiddenEntryIds.length > 0 ? (
              <button
                type="button"
                onClick={handleUndoHiddenExperiences}
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
              >
                Undo Delete Experience
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleAddExperience}
              className="rounded-md border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
            >
              Add Experience
            </button>
          </div>
      </div>
    </section>
  );
}
