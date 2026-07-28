import { getAppState } from "../state/app_state";
import type {
  BuildRequest,
  BuildResult,
  CheckRequest,
  ChangeRequest,
  CheckResult,
  ChangeResult,
  SkillsRequest,
  SkillsResult,
  ExportRequest,
  ExportPdfResult,
} from "../shared/types";
import { formatMonthToIsoDate, parseYear } from "../shared/date_format";

export default class BackendClient {
  private static instance: BackendClient;
  private readonly experienceCheckEndpoint: string;
  private readonly experienceChangeEndpoint: string;
  private readonly summaryCheckEndpoint: string;
  private readonly summaryChangeEndpoint: string;
  private readonly skillsEndpoint: string;
  private readonly buildEndpoint: string;
  private readonly exportEndpoint: string;

  private constructor() {
    this.experienceCheckEndpoint = "/api/experience/check";
    this.experienceChangeEndpoint = "/api/experience/change";
    this.summaryCheckEndpoint = "/api/summary/check";
    this.summaryChangeEndpoint = "/api/summary/change";
    this.skillsEndpoint = "/api/skills";
    this.buildEndpoint = "/api/build";
    this.exportEndpoint = "/api/export";
  }

  public static getInstance(): BackendClient {
    if (!BackendClient.instance) {
      BackendClient.instance = new BackendClient();
    }

    return BackendClient.instance;
  }

  private buildCheckRequest(
    text: string,
    companyId?: number,
    entryId?: number,
    isSummary = false,
  ): CheckRequest {
    const state = getAppState();
    const targetCompanyEntry =
      !isSummary && typeof companyId === "number"
        ? state.companyEntries.find((entry) => entry.companyId === companyId)
        : undefined;

    const targetRole = state.profile.targetRole.trim();
    const targetLevel = state.profile.targetLevel.trim();
    const previousCompany = targetCompanyEntry?.companyName.trim() ?? "";
    const previousCompanyPositionTitle = targetCompanyEntry?.positionTitle.trim() ?? "";

    const previousCompanyExperiencesContext = isSummary
      ? state.summaryEntries
          .filter((summaryEntry) => !summaryEntry.hidden)
          .map((summaryEntry) => ({
            entryId: summaryEntry.entryId,
            text: summaryEntry.text.trim(),
          }))
          .filter(
            (summaryEntry) =>
              summaryEntry.text.length > 0 && summaryEntry.entryId !== entryId,
          )
          .map((summaryEntry) => summaryEntry.text)
      : (targetCompanyEntry?.experiences ?? [])
          .filter((experience) => !experience.hidden && experience.entryId !== entryId)
          .map((experience) => experience.text.trim())
          .filter((experienceText) => experienceText.length > 0);

    return {
      text,
      targetRole,
      targetLevel,
      previousCompany,
      previousCompanyPositionTitle,
      previousCompanyExperiencesContext,
    };
  }

  private getExportFileName(response: Response): string {
    const disposition = response.headers.get("content-disposition") ?? "";
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (asciiMatch?.[1]) {
      return asciiMatch[1];
    }

    return "resume.pdf";
  }

  private async exportPdfFromRequest(requestBody: ExportRequest): Promise<ExportPdfResult> {
    const response = await fetch(this.exportEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Export failed: ${response.status}${errorText ? ` ${errorText}` : ""}`,
      );
    }

    return {
      bytes: await response.arrayBuffer(),
      fileName: this.getExportFileName(response),
      contentType: response.headers.get("content-type") || "application/pdf",
    };
  }

  private buildExportRequest(): ExportRequest {
    const state = getAppState();

    return {
      profile: {
        name: state.profile.name,
        email: state.profile.email,
        linkedin: state.profile.linkedIn,
        phone: state.profile.phone,
        targetRole: state.profile.targetRole,
        targetLevel: state.profile.targetLevel,
      },
      summary: state.summaryEntries
        .filter((entry) => !entry.hidden)
        .map((entry) => entry.text.trim())
        .filter((entry) => entry.length > 0),
      skills: state.skillsEntries
        .filter((entry) => !entry.hidden)
        .map((entry) => entry.text.trim())
        .filter((entry) => entry.length > 0),
      companyEntries: state.companyEntries
        .filter((company) => !company.hidden)
        .map((company) => ({
          name: company.companyName,
          position: company.positionTitle,
          summary: company.positionSummary,
          from: formatMonthToIsoDate(company.fromDate) ?? "0001-01-01T00:00:00.000Z",
          to: formatMonthToIsoDate(company.toDate),
          experience: company.experiences
            .filter((experience) => !experience.hidden)
            .map((experience) => experience.text),
        })),
      education: state.educationEntries
        .filter((education) => !education.hidden)
        .map((education) => ({
          name: education.name,
          title: education.title,
          from: parseYear(education.fromDate),
          to: parseYear(education.toDate),
        })),
      options: {
        omitAllCapsSectionTitles: false,
      },
    };
  }

  private buildSkillsRequest(listedSkillsOverride?: string[]): SkillsRequest {
    const state = getAppState();
    const listedSkills =
      listedSkillsOverride ??
      state.skillsEntries
        .filter((skill) => !skill.hidden)
        .map((skill) => skill.text.trim())
        .filter((skill) => skill.length > 0);

    return {
      targetRole: state.profile.targetRole.trim(),
      targetLevel: state.profile.targetLevel.trim(),
      listedSkills,
      previousExperience: state.companyEntries
        .filter((company) => !company.hidden)
        .map((company) => ({
          companyName: company.companyName.trim(),
          experience: company.experiences
            .filter((experience) => !experience.hidden)
            .map((experience) => experience.text.trim())
            .filter((text) => text.length > 0),
        }))
        .filter((company) => company.companyName.length > 0 || company.experience.length > 0),
    };
  }

  private buildBuildRequest(): BuildRequest {
    const state = getAppState();

    return {
      targetCompany: state.company.trim(),
      targetRole: state.profile.targetRole.trim(),
      targetJobRequirements: state.positionResponsibilities.trim(),
      summary: state.summaryEntries
        .filter((entry) => !entry.hidden)
        .map((entry) => entry.text.trim())
        .filter((entry) => entry.length > 0),
      listedSkills: state.skillsEntries
        .filter((skill) => !skill.hidden)
        .map((skill) => skill.text.trim())
        .filter((skill) => skill.length > 0),
      previousExperience: state.companyEntries
        .filter((company) => !company.hidden)
        .map((company) => ({
          companyName: company.companyName.trim(),
          experience: company.experiences
            .filter((experience) => !experience.hidden)
            .map((experience) => experience.text.trim())
            .filter((text) => text.length > 0),
        }))
        .filter((company) => company.companyName.length > 0 || company.experience.length > 0),
    };
  }

  public async exportPdf(): Promise<ExportPdfResult> {
    return this.exportPdfFromRequest(this.buildExportRequest());
  }

  public async exportPdfWithRequest(requestBody: ExportRequest): Promise<ExportPdfResult> {
    return this.exportPdfFromRequest(requestBody);
  }

  public async skills(listedSkillsOverride?: string[]): Promise<SkillsResult> {
    const requestBody = this.buildSkillsRequest(listedSkillsOverride);

    const response = await fetch(this.skillsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend skills failed: ${response.status} ${errorText}`);
    }

    const parsed = (await response.json()) as Partial<SkillsResult>;
    const safeRating = Math.min(10, Math.max(0, Number(parsed.rating ?? 0)));

    return {
      rating: Number.isFinite(safeRating) ? safeRating : 0,
      suggestedSkills: Array.isArray(parsed.suggestedSkills)
        ? parsed.suggestedSkills.map((skill) => String(skill).trim()).filter((skill) => skill.length > 0)
        : [],
      irrelevantSkills: Array.isArray(parsed.irrelevantSkills)
        ? parsed.irrelevantSkills.map((skill) => String(skill).trim()).filter((skill) => skill.length > 0)
        : [],
      reasoning: String(parsed.reasoning ?? "").trim(),
    };
  }

  public async build(): Promise<BuildResult> {
    const requestBody = this.buildBuildRequest();

    const response = await fetch(this.buildEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend build failed: ${response.status} ${errorText}`);
    }

    const parsed = (await response.json()) as Partial<BuildResult>;

    const summarySuggestions = Array.isArray(parsed.summarySuggestions)
      ? parsed.summarySuggestions
          .map((entry) => ({
            original: String(entry?.original ?? "").trim(),
            suggestion: String(entry?.suggestion ?? "").trim(),
          }))
          .filter((entry) => entry.original.length > 0 || entry.suggestion.length > 0)
      : [];

    const rawSkillsSuggestions =
      parsed.skillsSuggestions && typeof parsed.skillsSuggestions === "object"
        ? (parsed.skillsSuggestions as Partial<BuildResult["skillsSuggestions"]>)
        : ({} as Partial<BuildResult["skillsSuggestions"]>);

    const skillsSuggestions = {
      originalSkills: Array.isArray(rawSkillsSuggestions.originalSkills)
        ? rawSkillsSuggestions.originalSkills
          .map((skill: string) => String(skill).trim())
            .filter((skill) => skill.length > 0)
        : [],
      suggestedSkills: Array.isArray(rawSkillsSuggestions.suggestedSkills)
        ? rawSkillsSuggestions.suggestedSkills
          .map((skill: string) => String(skill).trim())
            .filter((skill) => skill.length > 0)
        : [],
    };

    const experienceSuggestions = Array.isArray(parsed.experienceSuggestions)
      ? parsed.experienceSuggestions.map((entry) => ({
          companyName: String(entry?.companyName ?? "").trim(),
          originalEntries: Array.isArray(entry?.originalEntries)
            ? entry.originalEntries
                .map((item) => String(item).trim())
                .filter((item) => item.length > 0)
            : [],
          suggestedEntries: Array.isArray(entry?.suggestedEntries)
            ? entry.suggestedEntries
                .map((item) => String(item).trim())
                .filter((item) => item.length > 0)
            : [],
        }))
      : [];

    const rawFeedback =
      parsed.feedback && typeof parsed.feedback === "object"
        ? (parsed.feedback as Partial<BuildResult["feedback"]>)
        : ({} as Partial<BuildResult["feedback"]>);

    const safeMatchRating = Math.min(10, Math.max(0, Number(rawFeedback.matchRating ?? 0)));

    const feedback = {
      matchRating: Number.isFinite(safeMatchRating) ? safeMatchRating : 0,
      feedbackPoints: Array.isArray(rawFeedback.feedbackPoints)
        ? rawFeedback.feedbackPoints
            .map((point: string) => String(point).trim())
            .filter((point) => point.length > 0)
        : [],
    };

    return {
      summarySuggestions,
      skillsSuggestions,
      experienceSuggestions,
      feedback,
    };
  }

  public async check(
    text: string,
    companyId?: number,
    entryId?: number,
    isSummary = false,
  ): Promise<CheckResult> {
    const requestBody = this.buildCheckRequest(text, companyId, entryId, isSummary);

    const response = await fetch(isSummary ? this.summaryCheckEndpoint : this.experienceCheckEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`${response.status} ${response.statusText}: ${errorText}`);
      throw new Error(`Backend check failed: ${response.status} ${errorText}`);
    }

    const parsed = (await response.json()) as Partial<CheckResult>;
    const safeRating = Math.min(10, Math.max(0, Number(parsed.rating ?? 0)));
    const safeRecRating = Math.min(10, Math.max(0, Number(parsed.recommendationRating ?? 0)));

    return {
      rating: Number.isFinite(safeRating) ? safeRating : 0,
      reasoning: String(parsed.reasoning ?? "").trim(),
      recommendation: String(parsed.recommendation ?? "").trim(),
      recommendationRating: Number.isFinite(safeRecRating) ? safeRecRating : 0,
    };
  }

  public async change(
    text: string,
    rating: number,
    previousRecommendation: string,
    previousRecommendationRating: number,
    companyId?: number,
    entryId?: number,
    isSummary = false,
  ): Promise<ChangeResult> {
    const requestBody: ChangeRequest = {
      ...this.buildCheckRequest(text, companyId, entryId, isSummary),
      originalRating: rating,
      oldRewrite: previousRecommendation,
      oldRewriteRating: previousRecommendationRating,
    };

    const response = await fetch(isSummary ? this.summaryChangeEndpoint : this.experienceChangeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend change failed: ${response.status} ${errorText}`);
    }

    const parsed = (await response.json()) as Partial<ChangeResult>;

    const safeRecRating = Math.min(
      10,
      Math.max(0, Number(parsed.recommendationRating ?? 0)),
    );

    return {
      recommendation: String(parsed.recommendation ?? "").trim(),
      reasoning: String(parsed.reasoning ?? "").trim(),
      recommendationRating: Number.isFinite(safeRecRating) ? safeRecRating : 0,
    };
  }
}
