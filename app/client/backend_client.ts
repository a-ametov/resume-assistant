import { getPositionState } from "../state/resume_position_state";
import type { CheckRequest, ChangeRequest, CheckResult, ChangeResult, ExportRequest, ExportPdfResult } from "../shared/types";

export default class BackendClient {
  private static instance: BackendClient;
  private readonly experienceCheckEndpoint: string;
  private readonly experienceChangeEndpoint: string;
  private readonly summaryCheckEndpoint: string;
  private readonly summaryChangeEndpoint: string;
  private readonly exportEndpoint: string;

  private constructor() {
    this.experienceCheckEndpoint = "/api/experience/check";
    this.experienceChangeEndpoint = "/api/experience/change";
    this.summaryCheckEndpoint = "/api/summary/check";
    this.summaryChangeEndpoint = "/api/summary/change";
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
    const state = getPositionState();
    const targetCompanyEntry =
      !isSummary && typeof companyId === "number"
        ? state.companyEntries.find((entry) => entry.companyId === companyId)
        : undefined;

    const targetCompany = state.company.trim();
    const targetCompanyPositionTitle = state.positionTitle.trim();
    const targetCompanyPositionResponsibilities = state.positionResponsibilities.trim();
    const previousCompany = targetCompanyEntry?.companyName.trim() ?? "";
    const previousCompanyPositionTitle = targetCompanyEntry?.positionTitle.trim() ?? "";

    const previousCompanyExperiencesContext = isSummary
      ? state.summary
          .map((summaryText, index) => ({
            entryId: index + 1,
            text: summaryText.trim(),
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
      targetCompany,
      targetCompanyPositionTitle,
      targetCompanyPositionResponsibilities,
      previousCompany,
      previousCompanyPositionTitle,
      previousCompanyExperiencesContext,
    };
  }

  private formatMonthToIsoDate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const monthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
    if (!monthMatch) {
      return null;
    }

    const [, year, month] = monthMatch;
    return `${year}-${month}-01T00:00:00.000Z`;
  }

  private parseYear(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const year = Number(trimmed.split("-")[0]);
    return Number.isFinite(year) ? year : 0;
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

  private buildExportRequest(): ExportRequest {
    const state = getPositionState();

    return {
      profile: {
        name: state.profile.name,
        email: state.profile.email,
        linkedin: state.profile.linkedIn,
        phone: state.profile.phone,
      },
      summary: state.summary
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
      companyEntries: state.companyEntries
        .filter((company) => !company.hidden)
        .map((company) => ({
          name: company.companyName,
          position: company.positionTitle,
          summary: company.positionSummary,
          from: this.formatMonthToIsoDate(company.fromDate) ?? "0001-01-01T00:00:00.000Z",
          to: this.formatMonthToIsoDate(company.toDate),
          experience: company.experiences
            .filter((experience) => !experience.hidden)
            .map((experience) => experience.text),
        })),
      education: state.educationEntries
        .filter((education) => !education.hidden)
        .map((education) => ({
          name: education.name,
          title: education.title,
          from: this.parseYear(education.fromDate),
          to: this.parseYear(education.toDate),
        })),
    };
  }

  public async exportPdf(): Promise<ExportPdfResult> {
    const requestBody = this.buildExportRequest();
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
