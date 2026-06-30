import type { ApplicationContext, BuildResult } from "../shared/types";

export type BuildSelections = {
  selectedSummaryOptions: Record<number, "original" | "suggested">;
  selectedExperienceOptions: Record<string, "original" | "suggested">;
  selectedSuggestedSkills: Record<number, boolean>;
};

type StoredApplication = {
  key: string;
  applicationContext: ApplicationContext;
  result: BuildResult;
  selections: BuildSelections;
};

export default class BuildSuggestionsStorage {
  private static readonly STORAGE_KEY = "resumeAssistant.buildSuggestions.applications";
  private static readonly MAX_APPLICATIONS = 10;
  private static readonly LEGACY_BUILD_RESULT_STORAGE_KEY = "resumeAssistant.buildSuggestions.result";
  private static readonly LEGACY_SUMMARY_SELECTIONS_STORAGE_KEY = "resumeAssistant.buildSuggestions.summarySelections";
  private static readonly LEGACY_EXPERIENCE_SELECTIONS_STORAGE_KEY = "resumeAssistant.buildSuggestions.experienceSelections";
  private static readonly LEGACY_SKILLS_SELECTIONS_STORAGE_KEY = "resumeAssistant.buildSuggestions.skillsSelections";

  public static getApplications(): string[] {
    return this.readApplications().map((entry) => entry.key);
  }

  public static getApplication(key: string): StoredApplication | null {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      return null;
    }

    return this.readApplications().find((entry) => entry.key === normalizedKey) ?? null;
  }

  public static migrateLegacyStorage(key: string, applicationContext: ApplicationContext): void {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      return;
    }

    const legacyResultRaw = window.localStorage.getItem(this.LEGACY_BUILD_RESULT_STORAGE_KEY);
    if (!legacyResultRaw) {
      return;
    }

    try {
      const parsedResult = JSON.parse(legacyResultRaw) as BuildResult;

      const summarySelections = this.parseLegacySelection<Record<number, "original" | "suggested">>(
        this.LEGACY_SUMMARY_SELECTIONS_STORAGE_KEY,
        this.defaultSummarySelections(parsedResult),
      );
      const experienceSelections = this.parseLegacySelection<Record<string, "original" | "suggested">>(
        this.LEGACY_EXPERIENCE_SELECTIONS_STORAGE_KEY,
        this.defaultExperienceSelections(parsedResult),
      );
      const skillsSelections = this.parseLegacySelection<Record<number, boolean>>(
        this.LEGACY_SKILLS_SELECTIONS_STORAGE_KEY,
        this.defaultSuggestedSkillSelections(parsedResult),
      );

      this.setApplication(normalizedKey, applicationContext, parsedResult, {
        selectedSummaryOptions: summarySelections,
        selectedExperienceOptions: experienceSelections,
        selectedSuggestedSkills: skillsSelections,
      });
    } catch {
      // Ignore malformed legacy payload and clear keys below.
    }

    this.clearLegacyStorage();
  }

  public static setApplication(
    key: string,
    applicationContext: ApplicationContext,
    result: BuildResult,
    selections: BuildSelections,
  ): void {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      return;
    }

    const existing = this.readApplications().filter((entry) => entry.key !== normalizedKey);

    const next: StoredApplication[] = [
      {
        key: normalizedKey,
        applicationContext: this.normalizeApplicationContext(applicationContext),
        result,
        selections,
      },
      ...existing,
    ].slice(0, this.MAX_APPLICATIONS);

    this.writeApplications(next);
  }

  private static readApplications(): StoredApplication[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item): item is StoredApplication => {
          if (!item || typeof item !== "object") {
            return false;
          }

          const candidate = item as Partial<StoredApplication>;
          return (
            typeof candidate.key === "string" &&
            !!candidate.result &&
            typeof candidate.result === "object" &&
            !!candidate.selections &&
            typeof candidate.selections === "object"
          );
        })
        .map((item) => ({
          key: item.key,
          applicationContext: this.parseApplicationContext(item),
          result: item.result,
          selections: {
            selectedSummaryOptions: item.selections.selectedSummaryOptions ?? {},
            selectedExperienceOptions: item.selections.selectedExperienceOptions ?? {},
            selectedSuggestedSkills: item.selections.selectedSuggestedSkills ?? {},
          },
        }));
    } catch {
      return [];
    }
  }

  private static parseLegacySelection<T>(storageKey: string, fallback: T): T {
    if (typeof window === "undefined") {
      return fallback;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private static defaultSummarySelections(result: BuildResult): Record<number, "original" | "suggested"> {
    return result.summarySuggestions.reduce<Record<number, "original" | "suggested">>(
      (accumulator, _entry, index) => {
        accumulator[index] = "original";
        return accumulator;
      },
      {},
    );
  }

  private static defaultExperienceSelections(result: BuildResult): Record<string, "original" | "suggested"> {
    return result.experienceSuggestions.reduce<Record<string, "original" | "suggested">>(
      (accumulator, company, companyIndex) => {
        const entryCount = Math.max(company.originalEntries.length, company.suggestedEntries.length);

        for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
          accumulator[`${companyIndex}-${entryIndex}`] = "original";
        }

        return accumulator;
      },
      {},
    );
  }

  private static defaultSuggestedSkillSelections(result: BuildResult): Record<number, boolean> {
    return result.skillsSuggestions.suggestedSkills.reduce<Record<number, boolean>>(
      (accumulator, _skill, index) => {
        accumulator[index] = false;
        return accumulator;
      },
      {},
    );
  }

  private static clearLegacyStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(this.LEGACY_BUILD_RESULT_STORAGE_KEY);
    window.localStorage.removeItem(this.LEGACY_SUMMARY_SELECTIONS_STORAGE_KEY);
    window.localStorage.removeItem(this.LEGACY_EXPERIENCE_SELECTIONS_STORAGE_KEY);
    window.localStorage.removeItem(this.LEGACY_SKILLS_SELECTIONS_STORAGE_KEY);
  }

  private static normalizeApplicationContext(applicationContext: ApplicationContext): ApplicationContext {
    return {
      company: applicationContext.company.trim(),
      title: applicationContext.title.trim(),
      description: applicationContext.description,
    };
  }

  private static parseApplicationContext(item: Partial<StoredApplication>): ApplicationContext {
    if (item.applicationContext && typeof item.applicationContext === "object") {
      return {
        company: String(item.applicationContext.company ?? "").trim(),
        title: String(item.applicationContext.title ?? "").trim(),
        description: String(item.applicationContext.description ?? ""),
      };
    }

    const key = String(item.key ?? "");
    const separatorIndex = key.indexOf(" - ");

    if (separatorIndex < 0) {
      return { company: "", title: "", description: "" };
    }

    return {
      company: key.slice(0, separatorIndex).trim(),
      title: key.slice(separatorIndex + 3).trim(),
      description: "",
    };
  }

  private static writeApplications(applications: StoredApplication[]): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(applications));
  }
}
