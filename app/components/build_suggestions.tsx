"use client";

import { useEffect, useState } from "react";
import BackendClient from "../client/backend_client";
import { formatMonthToIsoDate, parseYear } from "../shared/date_format";
import type { BuildResult, ExportRequest } from "../shared/types";
import { serializeAppState } from "../state/app_state";
import BuilderField from "./builder_field";
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

const BUILD_RESULT_STORAGE_KEY = "resumeAssistant.buildSuggestions.result";
const SUMMARY_SELECTIONS_STORAGE_KEY = "resumeAssistant.buildSuggestions.summarySelections";
const EXPERIENCE_SELECTIONS_STORAGE_KEY = "resumeAssistant.buildSuggestions.experienceSelections";
const SKILLS_SELECTIONS_STORAGE_KEY = "resumeAssistant.buildSuggestions.skillsSelections";

function defaultSummarySelections(result: BuildResult): Record<number, "original" | "suggested"> {
  return result.summarySuggestions.reduce<Record<number, "original" | "suggested">>(
    (accumulator, _entry, index) => {
      accumulator[index] = "original";
      return accumulator;
    },
    {},
  );
}

function getExperiencePairs(company: BuildResult["experienceSuggestions"][number]): Array<{
  original: string;
  suggested: string;
}> {
  const totalEntries = Math.max(company.originalEntries.length, company.suggestedEntries.length);

  return Array.from({ length: totalEntries }, (_value, index) => ({
    original: company.originalEntries[index] ?? "",
    suggested: company.suggestedEntries[index] ?? "",
  })).filter((pair) => pair.original.length > 0 || pair.suggested.length > 0);
}

function defaultExperienceSelections(result: BuildResult): Record<string, "original" | "suggested"> {
  return result.experienceSuggestions.reduce<Record<string, "original" | "suggested">>(
    (accumulator, company, companyIndex) => {
      const pairs = getExperiencePairs(company);

      pairs.forEach((_pair, entryIndex) => {
        accumulator[`${companyIndex}-${entryIndex}`] = "original";
      });

      return accumulator;
    },
    {},
  );
}

function defaultSuggestedSkillSelections(result: BuildResult): Record<number, boolean> {
  return result.skillsSuggestions.suggestedSkills.reduce<Record<number, boolean>>(
    (accumulator, _skill, index) => {
      accumulator[index] = false;
      return accumulator;
    },
    {},
  );
}

function appendUniqueSkills(existing: string[], suggested: string[]): string[] {
  const seen = new Set(existing.map((skill) => skill.toLowerCase()));
  const merged = [...existing];

  for (const skill of suggested) {
    const normalized = skill.toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    merged.push(skill);
  }

  return merged;
}

function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase();
}

export default function BuildSuggestions() {
  const backendClient = BackendClient.getInstance();
  const { appState, markSavedClean, loadSerializedAppState } = useResumeGlobalState();
  const [isBuilding, setIsBuilding] = useState(false);
  const [isBuildingResume, setIsBuildingResume] = useState(false);
  const [isFeedbackCollapsed, setIsFeedbackCollapsed] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [selectedSummaryOptions, setSelectedSummaryOptions] = useState<
    Record<number, "original" | "suggested">
  >({});
  const [selectedExperienceOptions, setSelectedExperienceOptions] = useState<
    Record<string, "original" | "suggested">
  >({});
  const [selectedSuggestedSkills, setSelectedSuggestedSkills] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(BUILD_RESULT_STORAGE_KEY);
      if (!cached) {
        return;
      }

      const parsed = JSON.parse(cached) as BuildResult;
      setBuildResult(parsed);

      // Try to load each selection independently
      const cachedSummary = window.localStorage.getItem(SUMMARY_SELECTIONS_STORAGE_KEY);
      try {
        setSelectedSummaryOptions(
          cachedSummary ? JSON.parse(cachedSummary) : defaultSummarySelections(parsed),
        );
      } catch {
        setSelectedSummaryOptions(defaultSummarySelections(parsed));
        window.localStorage.removeItem(SUMMARY_SELECTIONS_STORAGE_KEY);
      }

      const cachedExperience = window.localStorage.getItem(EXPERIENCE_SELECTIONS_STORAGE_KEY);
      try {
        setSelectedExperienceOptions(
          cachedExperience ? JSON.parse(cachedExperience) : defaultExperienceSelections(parsed),
        );
      } catch {
        setSelectedExperienceOptions(defaultExperienceSelections(parsed));
        window.localStorage.removeItem(EXPERIENCE_SELECTIONS_STORAGE_KEY);
      }

      const cachedSkills = window.localStorage.getItem(SKILLS_SELECTIONS_STORAGE_KEY);
      try {
        setSelectedSuggestedSkills(
          cachedSkills ? JSON.parse(cachedSkills) : defaultSuggestedSkillSelections(parsed),
        );
      } catch {
        setSelectedSuggestedSkills(defaultSuggestedSkillSelections(parsed));
        window.localStorage.removeItem(SKILLS_SELECTIONS_STORAGE_KEY);
      }
    } catch {
      window.localStorage.removeItem(BUILD_RESULT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!buildResult) {
      return;
    }

    window.localStorage.setItem(BUILD_RESULT_STORAGE_KEY, JSON.stringify(buildResult));
  }, [buildResult]);

  useEffect(() => {
    window.localStorage.setItem(
      SUMMARY_SELECTIONS_STORAGE_KEY,
      JSON.stringify(selectedSummaryOptions),
    );
  }, [selectedSummaryOptions]);

  useEffect(() => {
    window.localStorage.setItem(
      EXPERIENCE_SELECTIONS_STORAGE_KEY,
      JSON.stringify(selectedExperienceOptions),
    );
  }, [selectedExperienceOptions]);

  useEffect(() => {
    window.localStorage.setItem(
      SKILLS_SELECTIONS_STORAGE_KEY,
      JSON.stringify(selectedSuggestedSkills),
    );
  }, [selectedSuggestedSkills]);

  const handleBuild = async () => {
    setBuildError("");
    setResumeError("");
    setIsBuilding(true);

    try {
      const result = await backendClient.build();
      setBuildResult(result);
      setSelectedSummaryOptions(defaultSummarySelections(result));
      setSelectedExperienceOptions(defaultExperienceSelections(result));
      setSelectedSuggestedSkills(defaultSuggestedSkillSelections(result));
    } catch (caughtError) {
      setBuildError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to build resume suggestions right now.",
      );
    } finally {
      setIsBuilding(false);
    }
  };

  const persistSelectedSkillsToAppState = async (selectedSkills: string[]) => {
    const existingSkillSet = new Set(
      appState.skillsEntries
        .filter((entry) => !entry.hidden)
        .map((entry) => entry.text.trim().toLowerCase())
        .filter((entry) => entry.length > 0),
    );

    const newSelectedSkills = selectedSkills.filter(
      (skill) => !existingSkillSet.has(skill.toLowerCase()),
    );

    if (newSelectedSkills.length === 0) {
      return;
    }

    const nextId = appState.skillsEntries.reduce((max, entry) => Math.max(max, entry.entryId), 0) + 1;

    const updatedAppState = {
      ...appState,
      skillsEntries: [
        ...appState.skillsEntries,
        ...newSelectedSkills.map((skill, index) => ({
          entryId: nextId - newSelectedSkills.length + index,
          text: skill,
          hidden: false,
        })),
      ],
    };

    const serializedUpdatedState = serializeAppState(updatedAppState);

    // Rehydrate immediately so Skills UI reflects selected suggestions without waiting for a full refresh.
    loadSerializedAppState(serializedUpdatedState);

    const saveResponse = await fetch("/api/storage/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serializedUpdatedState),
    });

    if (!saveResponse.ok) {
      const message = await saveResponse.text();
      throw new Error(message || `Unable to save state (${saveResponse.status}).`);
    }

    markSavedClean();
  };

  const handleBuildResume = async () => {
    if (!buildResult) {
      return;
    }

    setResumeError("");
    setIsBuildingResume(true);

    try {
      const selectedSummary = buildResult.summarySuggestions
        .map((entry, index) => {
          const option = selectedSummaryOptions[index] ?? "original";
          return option === "suggested" ? entry.suggestion : entry.original;
        })
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      const originalSkillsFromResult = buildResult.skillsSuggestions.originalSkills
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      const selectedSuggestedSkillsList = buildResult.skillsSuggestions.suggestedSkills
        .filter((_skill, index) => selectedSuggestedSkills[index] ?? false)
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      const mergedSkills = appendUniqueSkills(originalSkillsFromResult, selectedSuggestedSkillsList);

      const visibleCompanies = appState.companyEntries.filter((company) => !company.hidden);
      const suggestedCompanyByName = new Map(
        buildResult.experienceSuggestions.map((company) => [
          normalizeCompanyName(company.companyName),
          company,
        ]),
      );

      const selectedCompanyEntries = visibleCompanies.map((company) => {
        const suggestedCompany = suggestedCompanyByName.get(normalizeCompanyName(company.companyName));
        const matchedCompanyIndex = buildResult.experienceSuggestions.findIndex(
          (entry) => normalizeCompanyName(entry.companyName) === normalizeCompanyName(company.companyName),
        );

        if (!suggestedCompany) {
          return {
            name: company.companyName,
            position: company.positionTitle,
            summary: company.positionSummary,
            from: formatMonthToIsoDate(company.fromDate) ?? "0001-01-01T00:00:00.000Z",
            to: formatMonthToIsoDate(company.toDate),
            experience: company.experiences
              .filter((entry) => !entry.hidden)
              .map((entry) => entry.text.trim())
              .filter((entry) => entry.length > 0),
          };
        }

        const selectedExperience = getExperiencePairs(suggestedCompany)
          .map((pair, entryIndex) => {
            const option =
              matchedCompanyIndex >= 0
                ? (selectedExperienceOptions[`${matchedCompanyIndex}-${entryIndex}`] ?? "original")
                : "original";
            return option === "suggested" ? pair.suggested : pair.original;
          })
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);

        return {
          name: company.companyName,
          position: company.positionTitle,
          summary: company.positionSummary,
          from: formatMonthToIsoDate(company.fromDate) ?? "0001-01-01T00:00:00.000Z",
          to: formatMonthToIsoDate(company.toDate),
          experience: selectedExperience,
        };
      });

      const requestBody: ExportRequest = {
        profile: {
          name: appState.profile.name,
          email: appState.profile.email,
          linkedin: appState.profile.linkedIn,
          phone: appState.profile.phone,
          targetRole: appState.profile.targetRole,
          targetLevel: appState.profile.targetLevel,
        },
        summary: selectedSummary,
        skills: mergedSkills,
        companyEntries: selectedCompanyEntries,
        education: appState.educationEntries
          .filter((education) => !education.hidden)
          .map((education) => ({
            name: education.name,
            title: education.title,
            from: parseYear(education.fromDate),
            to: parseYear(education.toDate),
          })),
      };

      void persistSelectedSkillsToAppState(selectedSuggestedSkillsList).catch((error) => {
        console.error("Failed to persist selected suggested skills", error);
      });

      const result = await backendClient.exportPdfWithRequest(requestBody);
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
      setResumeError(
        caughtError instanceof Error ? caughtError.message : "Unable to build resume.",
      );
    } finally {
      setIsBuildingResume(false);
    }
  };

  const feedback = buildResult?.feedback ?? { matchRating: 0, feedbackPoints: [] };
  const feedbackRatingColorClass =
    feedback.matchRating < 5
      ? "bg-red-100 text-red-700 border-red-200"
      : feedback.matchRating <= 7
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : feedback.matchRating <= 9
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-sm font-medium text-zinc-800">Build Resume Suggestions</p>

        {buildError ? (
          <p className="mt-2 text-sm text-red-600" role="status" aria-live="polite">
            {buildError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleBuild}
          disabled={isBuilding}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          {isBuilding ? "Building..." : "Build Resume Suggestions"}
        </button>

        {buildResult ? (
          <div className="mt-3 space-y-3 text-sm text-zinc-800">
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <p className="truncate whitespace-nowrap text-sm text-zinc-700">Feedback</p>
                    <span
                      className={`inline-flex h-7 min-w-16 items-center justify-center rounded-md border px-2 text-sm font-medium ${feedbackRatingColorClass}`}
                    >
                      {`${feedback.matchRating}/10`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFeedbackCollapsed((previous) => !previous)}
                  className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200"
                  aria-expanded={!isFeedbackCollapsed}
                >
                  {isFeedbackCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>

              {!isFeedbackCollapsed ? (
                <div className="mt-3 space-y-2">
                  {feedback.feedbackPoints.length > 0 ? (
                    feedback.feedbackPoints.map((point, index) => (
                      <textarea
                        key={`feedback-point-${index}`}
                        readOnly
                        value={point}
                        rows={Math.max(2, Math.ceil(point.length / 90))}
                        className="min-w-0 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none resize-none"
                      />
                    ))
                  ) : (
                    <p className="text-zinc-600">No feedback points returned.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div>
              <p className="font-medium">Summary Suggestions</p>
              {buildResult.summarySuggestions.length > 0 ? (
                <div className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
                  {buildResult.summarySuggestions.map((entry, index) => (
                    <div key={`summary-${index}`} className="p-3">
                      <BuilderField
                        name={`summary-suggestion-${index}`}
                        selectedOption={selectedSummaryOptions[index] ?? "original"}
                        onSelectOption={(option) =>
                          setSelectedSummaryOptions((previous) => ({
                            ...previous,
                            [index]: option,
                          }))
                        }
                        originalText={entry.original}
                        suggestionText={entry.suggestion}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-zinc-600">No summary suggestions returned.</p>
              )}
            </div>

            <div>
              <p className="font-medium">Skills Suggestions</p>
              <p className="mt-1">Original Skills:</p>
              {buildResult.skillsSuggestions.originalSkills.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {buildResult.skillsSuggestions.originalSkills.map((skill, index) => (
                    <div
                      key={`original-skill-${index}`}
                      className="inline-flex min-h-9 items-center rounded-md border border-zinc-300 bg-white px-2 py-1 text-left text-sm text-zinc-700"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-zinc-600">No original skills returned.</p>
              )}

              <p className="mt-2">Suggested Skills:</p>
              {buildResult.skillsSuggestions.suggestedSkills.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {buildResult.skillsSuggestions.suggestedSkills.map((skill, index) => (
                    <button
                      key={`suggested-skill-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedSuggestedSkills((previous) => ({
                          ...previous,
                          [index]: !(previous[index] ?? false),
                        }))
                      }
                      className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-2 py-1 text-left text-sm transition ${
                        selectedSuggestedSkills[index] ?? false
                          ? "border-green-500 bg-green-50 text-zinc-900"
                          : "border-zinc-300 bg-white text-zinc-700"
                      }`}
                      aria-pressed={selectedSuggestedSkills[index] ?? false}
                    >
                      <span
                        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                          selectedSuggestedSkills[index] ?? false
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-zinc-300 bg-white text-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span>{skill}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-zinc-600">No suggested skills returned.</p>
              )}
            </div>

            <div>
              <p className="font-medium">Experience Suggestions</p>
              {buildResult.experienceSuggestions.length > 0 ? (
                <div className="mt-2 space-y-3">
                  {buildResult.experienceSuggestions.map((company, companyIndex) => (
                    <div
                      key={`company-${companyIndex}`}
                      className="rounded-md border border-zinc-200 bg-white p-3"
                    >
                      <p className="text-base font-semibold text-zinc-900">{company.companyName}</p>

                      {getExperiencePairs(company).length > 0 ? (
                        <div className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-zinc-50">
                          {getExperiencePairs(company).map((pair, entryIndex) => (
                            <div key={`experience-field-${companyIndex}-${entryIndex}`} className="p-3">
                              <BuilderField
                                name={`experience-suggestion-${companyIndex}-${entryIndex}`}
                                selectedOption={
                                  selectedExperienceOptions[`${companyIndex}-${entryIndex}`] ?? "original"
                                }
                                onSelectOption={(option) =>
                                  setSelectedExperienceOptions((previous) => ({
                                    ...previous,
                                    [`${companyIndex}-${entryIndex}`]: option,
                                  }))
                                }
                                originalText={pair.original || "No original entry"}
                                suggestionText={pair.suggested || "No suggested entry"}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-zinc-600">No entries returned for this company.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-zinc-600">No experience suggestions returned.</p>
              )}
            </div>

            <div className="pt-1">
              {resumeError ? (
                <p className="mb-2 text-sm text-red-600" role="status" aria-live="polite">
                  {resumeError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleBuildResume}
                disabled={isBuildingResume}
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {isBuildingResume ? "Building Resume..." : "Build Resume"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
