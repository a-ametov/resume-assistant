"use client";

import { useEffect, useState } from "react";
import type { ExperienceEntryState } from "../state/app_state";
import ExperienceEntry from "./experience_entry";
import { useResumeGlobalState } from "./resume_global_state";

type ExperienceItem = {
  id: number;
  initialText: string;
};

const SUMMARY_COMPANY_ID = -1;

export default function Summary() {
  const {
    registerSummaryEntry,
    updateSummaryEntry,
    loadStateRevision,
    loadedSerializedAppState,
  } = useResumeGlobalState();
  const [experienceItems, setExperienceItems] = useState<ExperienceItem[]>(
    [{ id: 1, initialText: "" }],
  );
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [hiddenEntryIds, setHiddenEntryIds] = useState<number[]>([]);
  const [collapsedEntryIds, setCollapsedEntryIds] = useState<number[]>([]);
  const [entryStateById, setEntryStateById] = useState<
    Record<number, Partial<Omit<ExperienceEntryState, "entryId">>>
  >({});

  // Rehydrate from loaded state.
  useEffect(() => {
    if (!loadedSerializedAppState) {
      return;
    }

    const texts = loadedSerializedAppState.summary ?? [];

    const timeoutId = setTimeout(() => {
      setExperienceItems(
        texts.length > 0
          ? texts.map((text, index) => ({ id: index + 1, initialText: text }))
          : [{ id: 1, initialText: "" }],
      );
      setEntryStateById({});
      setHiddenEntryIds([]);
      setCollapsedEntryIds([]);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadStateRevision, loadedSerializedAppState]);

  // Debounced write to global state.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      experienceItems.forEach((item) => {
        registerSummaryEntry(item.id);
        updateSummaryEntry(item.id, {
          text: entryStateById[item.id]?.text ?? item.initialText,
          hidden: hiddenEntryIds.includes(item.id),
        });
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [experienceItems, entryStateById, hiddenEntryIds, registerSummaryEntry, updateSummaryEntry]);

  const handleAddExperience = () => {
    setExperienceItems((prev) => [...prev, { id: prev.length + 1, initialText: "" }]);
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
    setCollapsedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId],
    );
  };

  const visibleExperienceItems = experienceItems.filter(
    (entry) => !hiddenEntryIds.includes(entry.id),
  );

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
          Resume Summary
        </div>
        <button
          type="button"
          onClick={() => setIsSectionCollapsed((prev) => !prev)}
          className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
        >
          {isSectionCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!isSectionCollapsed && hiddenEntryIds.length > 0 ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleUndoHiddenExperiences}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Undo
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex w-full flex-col divide-y divide-zinc-200" hidden={isSectionCollapsed}>
        {visibleExperienceItems.map((entry, index) => (
          <div
            key={`${loadStateRevision}-${entry.id}-${entry.initialText ? "loaded" : "empty"}`}
            className={`w-full py-4 ${index === 0 ? "pt-0" : ""} ${
              index === visibleExperienceItems.length - 1 ? "pb-0" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ExperienceEntry
                  key={`${loadStateRevision}-${entry.id}-${entry.initialText ? "loaded" : "empty"}`}
                  companyId={SUMMARY_COMPANY_ID}
                  entryId={entry.id}
                  hidden={hiddenEntryIds.includes(entry.id)}
                  isCollapsed={collapsedEntryIds.includes(entry.id)}
                  isSummary={true}
                  initialText={entryStateById[entry.id]?.text ?? entry.initialText}
                  onStateChange={(statePatch) => {
                    setEntryStateById((prev) => ({
                      ...prev,
                      [entry.id]: {
                        ...prev[entry.id],
                        ...statePatch,
                      },
                    }));
                  }}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleHideExperience(entry.id)}
                  aria-label="Hide summary experience entry"
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
                      ? "Expand summary experience details"
                      : "Collapse summary experience details"
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

      <div className="mt-4 flex justify-end" hidden={isSectionCollapsed}>
        <button
          type="button"
          onClick={handleAddExperience}
          className="rounded-md border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
        >
          Add Experience
        </button>
      </div>
    </section>
  );
}
