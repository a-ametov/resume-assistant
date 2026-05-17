"use client";

import { useEffect, useState } from "react";
import type { SerializedCompanyEntryState } from "../state/resume_position_state";
import CompanyEntry from "./company_entry";
import { useResumeGlobalState } from "./resume_global_state";

type CompanyItem = {
  id: number;
  initialData?: SerializedCompanyEntryState;
};

export default function CompanyEntries() {
  const {
    registerCompanyEntry,
    updateCompanyEntry,
    loadStateRevision,
    loadedSerializedPositionState,
  } = useResumeGlobalState();
  const [companyItems, setCompanyItems] = useState<CompanyItem[]>([{ id: 1 }]);
  const [hiddenCompanyIds, setHiddenCompanyIds] = useState<number[]>([]);

  useEffect(() => {
    if (!loadedSerializedPositionState) {
      return;
    }

    setCompanyItems(
      (loadedSerializedPositionState.companyEntries ?? []).map((company, index) => ({
        id: index + 1,
        initialData: company,
      })),
    );
    setHiddenCompanyIds([]);
  }, [loadStateRevision, loadedSerializedPositionState]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      companyItems.forEach((company) => {
        registerCompanyEntry(company.id);
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [companyItems, registerCompanyEntry]);

  const handleAddCompany = () => {
    setCompanyItems((prev) => {
      const nextId = prev.reduce((maxId, company) => Math.max(maxId, company.id), 0) + 1;
      return [...prev, { id: nextId }];
    });
  };

  const handleDeleteCompany = (companyId: number) => {
    setHiddenCompanyIds((prev) =>
      prev.includes(companyId) ? prev : [...prev, companyId],
    );
    updateCompanyEntry(companyId, { hidden: true });
  };

  const handleUndoHiddenCompany = () => {
    const companyId = hiddenCompanyIds[hiddenCompanyIds.length - 1];

    if (typeof companyId === "undefined") {
      return;
    }

    setHiddenCompanyIds((prev) => prev.slice(0, -1));
    updateCompanyEntry(companyId, { hidden: false });
  };

  const visibleCompanyItems = companyItems.filter(
    (company) => !hiddenCompanyIds.includes(company.id),
  );

  return (
    <section className="flex w-full flex-col gap-4">
      {visibleCompanyItems.map((company) => (
        <CompanyEntry
          key={`${loadStateRevision}-${company.id}-${company.initialData ? "loaded" : "empty"}`}
          companyId={company.id}
          initialData={company.initialData}
          onDelete={() => handleDeleteCompany(company.id)}
        />
      ))}

      <div className="flex justify-end gap-2">
        {hiddenCompanyIds.length > 0 ? (
          <button
            type="button"
            onClick={handleUndoHiddenCompany}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            Undo Delete Company
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleAddCompany}
          className="rounded-md border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
        >
          Add Company
        </button>
      </div>
    </section>
  );
}
