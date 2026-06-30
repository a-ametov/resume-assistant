"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BuildSuggestionsStorage, { type BuildSelections } from "../client/build_suggestions_storage";
import type { BuildResult } from "../shared/types";
import ApplicationContext from "./application_context";
import BuildSuggestions from "./build_suggestions";
import { useResumeGlobalState } from "./resume_global_state";

function buildApplicationKey(company: string, position: string): string {
  const normalizedCompany = company.trim();
  const normalizedPosition = position.trim();

  if (normalizedCompany.length === 0 && normalizedPosition.length === 0) {
    return "";
  }

  return `${normalizedCompany} - ${normalizedPosition}`;
}

export default function ApplicationBuilder() {
  const {
    appState,
    setCompany,
    setPositionTitle,
    setPositionResponsibilities,
  } = useResumeGlobalState();
  const applicationKey = buildApplicationKey(appState.company, appState.positionTitle);
  const applicationContext = useMemo(
    () => ({
      company: appState.company,
      title: appState.positionTitle,
      description: appState.positionResponsibilities,
    }),
    [appState.company, appState.positionTitle, appState.positionResponsibilities],
  );

  const [cachedResult, setCachedResult] = useState<BuildResult | null>(null);
  const [cachedSelections, setCachedSelections] = useState<BuildSelections | null>(null);
  const [historyKeys, setHistoryKeys] = useState<string[]>([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const lastHydratedApplicationKeyRef = useRef<string>("");
  const otherApplicationsCount = historyKeys.filter((key) => key !== applicationKey).length;
  const otherApplicationsLabel =
    otherApplicationsCount === 1
      ? "1 other application"
      : `${otherApplicationsCount} other applications`;

  const refreshHistory = () => {
    setHistoryKeys(BuildSuggestionsStorage.getApplications());
  };

  useEffect(() => {
    refreshHistory();

    if (!applicationKey) {
      setCachedResult(null);
      setCachedSelections(null);
      lastHydratedApplicationKeyRef.current = "";
      return;
    }

    // Only hydrate from storage when switching applications.
    if (lastHydratedApplicationKeyRef.current === applicationKey) {
      return;
    }

    BuildSuggestionsStorage.migrateLegacyStorage(applicationKey, applicationContext);

    const cachedApplication = BuildSuggestionsStorage.getApplication(applicationKey);
    if (!cachedApplication) {
      setCachedResult(null);
      setCachedSelections(null);
      lastHydratedApplicationKeyRef.current = applicationKey;
      return;
    }

    setCachedResult(cachedApplication.result);
    setCachedSelections(cachedApplication.selections);
    lastHydratedApplicationKeyRef.current = applicationKey;
  }, [applicationKey, applicationContext]);

  const handlePersist = (result: BuildResult, selections: BuildSelections) => {
    if (!applicationKey) {
      return;
    }

    setCachedResult(result);
    setCachedSelections(selections);
    BuildSuggestionsStorage.setApplication(applicationKey, applicationContext, result, selections);
    refreshHistory();
  };

  const handleSelectHistoryItem = (key: string) => {
    const cachedApplication = BuildSuggestionsStorage.getApplication(key);
    if (!cachedApplication) {
      return;
    }

    setCompany(cachedApplication.applicationContext.company);
    setPositionTitle(cachedApplication.applicationContext.title);
    setPositionResponsibilities(cachedApplication.applicationContext.description);
    setCachedResult(cachedApplication.result);
    setCachedSelections(cachedApplication.selections);
  };

  const handleCreateNewApplication = () => {
    setCompany("");
    setPositionTitle("");
    setPositionResponsibilities("");
    setCachedResult(null);
    setCachedSelections(null);
  };

  return (
    <>
      <div className="flex w-full items-stretch gap-4">
        <div className={`${isHistoryCollapsed ? "min-w-0 flex-1" : "w-1/2"}`}>
          <ApplicationContext />
        </div>

        <section
          className={`${isHistoryCollapsed ? "w-[164px]" : "w-1/2"} self-stretch shrink-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-800">History</p>
            <button
              type="button"
              onClick={() => setIsHistoryCollapsed((previous) => !previous)}
              className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-1.5 text-[11px] font-medium text-zinc-800 transition hover:bg-zinc-200"
            >
              {isHistoryCollapsed ? "Expand" : "Collapse"}
            </button>
            </div>

            <button
              type="button"
              onClick={handleCreateNewApplication}
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-md border border-blue-300 bg-blue-100 px-3 text-sm font-medium text-blue-800 transition hover:bg-blue-200"
            >
              New Application
            </button>

            {isHistoryCollapsed ? (
              <p className="mt-2 text-center text-[11px] text-zinc-500">
                {otherApplicationsLabel}
              </p>
            ) : null}

            {!isHistoryCollapsed ? (
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-2">
                  {historyKeys.length > 0 ? (
                    historyKeys.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectHistoryItem(key)}
                        className={`w-full rounded-md border px-2 py-2 text-left text-xs transition ${
                          applicationKey === key
                            ? "border-zinc-400 bg-zinc-200 text-zinc-900"
                            : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        {key}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500">No saved applications.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <BuildSuggestions
        applicationKey={applicationKey}
        initialBuildResult={cachedResult}
        initialSelections={cachedSelections}
        onPersist={handlePersist}
      />
    </>
  );
}
