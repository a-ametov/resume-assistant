"use client";

import { useEffect, useMemo, useState } from "react";
import BackendClient from "../client/backend_client";
import { useResumeGlobalState } from "./resume_global_state";

type SkillItem = {
  id: number;
  initialText: string;
};

export default function Skills() {
  const backendClient = BackendClient.getInstance();
  const {
    registerSkillEntry,
    updateSkillEntry,
    loadStateRevision,
    loadedSerializedAppState,
  } = useResumeGlobalState();
  const [skillItems, setSkillItems] = useState<SkillItem[]>([{ id: 1, initialText: "" }]);
  const [skillTextById, setSkillTextById] = useState<Record<number, string>>({});
  const [hiddenSkillIds, setHiddenSkillIds] = useState<number[]>([]);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [irrelevantSkills, setIrrelevantSkills] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loadedSerializedAppState) {
      return;
    }

    const loadedSkills = loadedSerializedAppState.skills ?? [];

    const timeoutId = setTimeout(() => {
      setSkillItems(
        loadedSkills.length > 0
          ? loadedSkills.map((text, index) => ({ id: index + 1, initialText: text }))
          : [{ id: 1, initialText: "" }],
      );
      setSkillTextById({});
      setHiddenSkillIds([]);
      setRating(null);
      setSuggestedSkills([]);
      setIrrelevantSkills([]);
      setReasoning("");
      setError("");
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadStateRevision, loadedSerializedAppState]);

  const visibleSkillItems = useMemo(
    () => skillItems.filter((skillItem) => !hiddenSkillIds.includes(skillItem.id)),
    [skillItems, hiddenSkillIds],
  );

  const currentVisibleSkills = useMemo(
    () =>
      visibleSkillItems
        .map((skillItem) => (skillTextById[skillItem.id] ?? skillItem.initialText).trim())
        .filter((skillText) => skillText.length > 0),
    [visibleSkillItems, skillTextById],
  );

  const skillStatusById = useMemo(() => {
    if (rating === null) return new Map<number, "relevant" | "irrelevant">();
    const irrelevantLower = new Set(irrelevantSkills.map((s) => s.toLowerCase()));
    const statusMap = new Map<number, "relevant" | "irrelevant">();
    visibleSkillItems.forEach((item) => {
      const text = (skillTextById[item.id] ?? item.initialText).trim().toLowerCase();
      statusMap.set(item.id, irrelevantLower.has(text) ? "irrelevant" : "relevant");
    });
    return statusMap;
  }, [rating, irrelevantSkills, visibleSkillItems, skillTextById]);

  const phantomSuggestions = useMemo(() => {
    if (suggestedSkills.length === 0) return [];
    const visibleLower = new Set(currentVisibleSkills.map((s) => s.toLowerCase()));
    return suggestedSkills.filter((s) => !visibleLower.has(s.toLowerCase()));
  }, [suggestedSkills, currentVisibleSkills]);

  useEffect(() => {
    skillItems.forEach((skillItem) => {
      registerSkillEntry(skillItem.id);
      updateSkillEntry(skillItem.id, {
        text: skillTextById[skillItem.id] ?? skillItem.initialText,
        hidden: hiddenSkillIds.includes(skillItem.id),
      });
    });
  }, [skillItems, skillTextById, hiddenSkillIds, registerSkillEntry, updateSkillEntry]);

  const handleAddSkill = () => {
    setSkillItems((prev) => {
      const nextId = prev.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
      return [...prev, { id: nextId, initialText: "" }];
    });
  };

  const handleHideSkill = (skillId: number) => {
    setHiddenSkillIds((prev) => (prev.includes(skillId) ? prev : [...prev, skillId]));
  };

  const handleUndoHiddenSkill = () => {
    setHiddenSkillIds((prev) => prev.slice(0, -1));
  };

  const handleAcceptPhantom = (suggestion: string) => {
    setSkillItems((prev) => {
      const nextId = prev.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
      return [...prev, { id: nextId, initialText: suggestion }];
    });
  };

  const handleDismissPhantom = (suggestion: string) => {
    setSuggestedSkills((prev) => prev.filter((s) => s !== suggestion));
  };

  const handleCheckSkills = async () => {
    if (currentVisibleSkills.length === 0) {
      setError("Please add at least one skill before checking.");
      return;
    }

    setError("");
    setIsChecking(true);

    try {
      const result = await backendClient.skills(currentVisibleSkills);
      setRating(result.rating);
      setSuggestedSkills(result.suggestedSkills);
      setIrrelevantSkills(result.irrelevantSkills);
      setReasoning(result.reasoning);
    } catch (caughtError) {
      setReasoning("");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to check skills right now.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const ratingColorClass =
    rating === null
      ? "bg-zinc-100 text-zinc-600 border-zinc-300"
      : rating < 5
      ? "bg-red-100 text-red-700 border-red-200"
      : rating <= 7
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : rating <= 9
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-blue-100 text-blue-700 border-blue-200";

  const collapsedSummary =
    currentVisibleSkills.length > 0
      ? `${currentVisibleSkills.length} skills listed`
      : "No skills listed";

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="truncate whitespace-nowrap text-sm text-zinc-700">
            {isSectionCollapsed ? collapsedSummary : "Skills"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSectionCollapsed((prev) => !prev)}
          className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
        >
          {isSectionCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!isSectionCollapsed && hiddenSkillIds.length > 0 ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleUndoHiddenSkill}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Undo
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex w-full flex-col gap-2" hidden={isSectionCollapsed}>
        {visibleSkillItems.map((skillItem) => (
          <div key={`${loadStateRevision}-${skillItem.id}`} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Skill"
              value={skillTextById[skillItem.id] ?? skillItem.initialText}
              onChange={(event) => {
                const nextText = event.target.value;
                setSkillTextById((prev) => ({
                  ...prev,
                  [skillItem.id]: nextText,
                }));
              }}
              className={`h-10 flex-1 rounded-md border px-3 text-sm outline-none transition ${
                skillStatusById.get(skillItem.id) === "irrelevant"
                  ? "border-red-300 bg-red-50 text-red-900 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  : skillStatusById.get(skillItem.id) === "relevant"
                    ? "border-green-300 bg-green-50 text-green-900 focus:border-green-400 focus:ring-2 focus:ring-green-200"
                    : "border-zinc-300 text-zinc-900 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              }`}
            />
            <button
              type="button"
              onClick={() => handleHideSkill(skillItem.id)}
              aria-label="Hide skill"
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
          </div>
        ))}

        {phantomSuggestions.map((suggestion) => (
          <div key={`phantom-${suggestion}`} className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={suggestion}
              className="h-10 flex-1 rounded-md border border-blue-300 bg-blue-50 px-3 text-sm text-blue-900 outline-none"
            />
            <button
              type="button"
              onClick={() => handleAcceptPhantom(suggestion)}
              aria-label={`Add ${suggestion} to skills`}
              className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-300 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
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
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleDismissPhantom(suggestion)}
              aria-label={`Dismiss ${suggestion}`}
              className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
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
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {visibleSkillItems.length === 0 && phantomSuggestions.length === 0 ? (
          <p className="text-sm text-zinc-500">No visible skills. Use Undo or add a new skill.</p>
        ) : null}

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleAddSkill}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Add Skill
          </button>
        </div>

        <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-800">Skills Check</p>
            <span
              className={`inline-flex h-8 min-w-16 items-center justify-center rounded-md border px-2 text-sm font-medium ${ratingColorClass}`}
            >
              {rating === null ? "N/A" : `${rating}/10`}
            </span>
          </div>

          {error ? (
            <p className="mt-2 text-sm text-red-600" role="status" aria-live="polite">
              {error}
            </p>
          ) : null}

          {!error && reasoning.length > 0 ? (
            <p className="mt-2 text-sm text-zinc-700" role="status" aria-live="polite">
              {reasoning}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleCheckSkills}
            disabled={isChecking}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {isChecking ? "Checking..." : "Check Skills"}
          </button>
        </div>
      </div>
    </section>
  );
}
