"use client";

import { useEffect, useState } from "react";
import type { SerializedEducationEntryState } from "../state/resume_position_state";
import EducationEntry from "./education_entry";
import { useResumeGlobalState } from "./resume_global_state";

type EducationItem = {
  id: number;
  initialData?: SerializedEducationEntryState;
};

export default function EducationEntries() {
  const {
    registerEducationEntry,
    updateEducationEntry,
    loadStateRevision,
    loadedSerializedPositionState,
  } = useResumeGlobalState();
  const [educationItems, setEducationItems] = useState<EducationItem[]>([{ id: 1 }]);
  const [hiddenEducationIds, setHiddenEducationIds] = useState<number[]>([]);

  useEffect(() => {
    if (!loadedSerializedPositionState) {
      return;
    }

    setEducationItems(
      (loadedSerializedPositionState.educationEntries ?? []).map((education, index) => ({
        id: index + 1,
        initialData: education,
      })),
    );
    setHiddenEducationIds([]);
  }, [loadStateRevision, loadedSerializedPositionState]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      educationItems.forEach((education) => {
        registerEducationEntry(education.id);
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [educationItems, registerEducationEntry]);

  const handleAddEducation = () => {
    setEducationItems((prev) => {
      const nextId = prev.reduce((maxId, education) => Math.max(maxId, education.id), 0) + 1;
      return [...prev, { id: nextId }];
    });
  };

  const handleDeleteEducation = (educationId: number) => {
    setHiddenEducationIds((prev) =>
      prev.includes(educationId) ? prev : [...prev, educationId],
    );
    updateEducationEntry(educationId, { hidden: true });
  };

  const handleUndoHiddenEducation = () => {
    const educationId = hiddenEducationIds[hiddenEducationIds.length - 1];

    if (typeof educationId === "undefined") {
      return;
    }

    setHiddenEducationIds((prev) => prev.slice(0, -1));
    updateEducationEntry(educationId, { hidden: false });
  };

  const visibleEducationItems = educationItems.filter(
    (education) => !hiddenEducationIds.includes(education.id),
  );

  return (
    <section className="flex w-full flex-col gap-4">
      {visibleEducationItems.map((education) => (
        <EducationEntry
          key={`${loadStateRevision}-${education.id}-${education.initialData ? "loaded" : "empty"}`}
          educationId={education.id}
          initialData={education.initialData}
          onDelete={() => handleDeleteEducation(education.id)}
        />
      ))}

      <div className="flex justify-end gap-2">
        {hiddenEducationIds.length > 0 ? (
          <button
            type="button"
            onClick={handleUndoHiddenEducation}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Undo Delete Education
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleAddEducation}
          className="rounded-md border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
        >
          Add Education
        </button>
      </div>
    </section>
  );
}
