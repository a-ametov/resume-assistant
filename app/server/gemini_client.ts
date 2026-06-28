import { BuildRequest, BuildResult, CheckRequest, ChangeRequest, CheckResult, ChangeResult, SkillsRequest, SkillsResult } from "../shared/types";
import { createBuildPrompt, createCheckExperiencePrompt, createCheckSummaryPrompt, createChangeExperiencePrompt, createChangeSummaryPrompt, createSkillsPrompt } from "./prompts";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export default class GeminiClient {
  private static instance: GeminiClient;
  private readonly apiKey: string;
  private readonly model: string;

  private constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
    this.model = "gemini-flash-latest";
  }

  public static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient();
    }

    return GeminiClient.instance;
  }

  public async check(req: CheckRequest, isSummary: boolean): Promise<CheckResult> {
    const prompt = isSummary
      ? createCheckSummaryPrompt(req)
      : createCheckExperiencePrompt(req);

    const raw = await this.sendRequest(prompt);
    const parsed = this.parseJsonObject(raw) as Partial<CheckResult> | null;

    if (parsed && typeof parsed === "object") {
      parsed.rawValue = raw;

      const safeRating = Math.min(10, Math.max(0, Number(parsed.rating ?? 0)));
      const safeRecommendationRating = Math.min(
        10,
        Math.max(0, Number(parsed.recommendationRating ?? 0)),
      );

      parsed.rating = Number.isFinite(safeRating) ? safeRating : 0;
      parsed.reasoning = String(parsed.reasoning ?? "").trim();
      parsed.recommendation = String(parsed.recommendation ?? "").trim();
      parsed.recommendationRating = Number.isFinite(safeRecommendationRating)
        ? safeRecommendationRating
        : 0;

      return parsed as CheckResult;
    }

    throw new Error("Gemini check response could not be parsed.");
  }

  public async change(req: ChangeRequest, isSummary: boolean): Promise<ChangeResult> {
    const prompt = isSummary
      ? createChangeSummaryPrompt(req)
      : createChangeExperiencePrompt(req);

    const raw = await this.sendRequest(prompt);
    const parsed = this.parseJsonObject(raw) as Partial<ChangeResult> | null;

    if (parsed && typeof parsed === "object") {
      parsed.rawValue = raw;

      const safeRecommendationRating = Math.min(
        10,
        Math.max(0, Number(parsed.recommendationRating ?? 0)),
      );

      parsed.recommendation = String(parsed.recommendation ?? "").trim();
      parsed.reasoning = String(parsed.reasoning ?? "").trim();
      parsed.recommendationRating = Number.isFinite(safeRecommendationRating)
        ? safeRecommendationRating
        : 0;

      return parsed as ChangeResult;
    }

    throw new Error("Gemini change response could not be parsed.");
  }

  public async skills(req: SkillsRequest): Promise<SkillsResult> {
    const prompt = createSkillsPrompt(req);

    const raw = await this.sendRequest(prompt);
    const parsed = this.parseJsonObject(raw) as Partial<SkillsResult> | null;

    if (parsed && typeof parsed === "object") {
      const safeRating = Math.min(
        10,
        Math.max(0, Number(parsed.rating ?? 0)),
      );

      parsed.rating = Number.isFinite(safeRating) ? safeRating : 0;
      parsed.suggestedSkills = Array.isArray(parsed.suggestedSkills) ? parsed.suggestedSkills : [];
      parsed.irrelevantSkills = Array.isArray(parsed.irrelevantSkills) ? parsed.irrelevantSkills : [];
      parsed.reasoning = String(parsed.reasoning ?? "").trim();

      return parsed as SkillsResult;
    }

    throw new Error("Gemini skills response could not be parsed.");
  }

  public async build(req: BuildRequest): Promise<BuildResult> {
    const prompt = createBuildPrompt(req);

    const raw = await this.sendRequest(prompt);
    const parsed = this.parseJsonObject(raw) as Partial<BuildResult> | null;

    if (parsed && typeof parsed === "object") {
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

    throw new Error("Gemini build response could not be parsed.");
  }

  private async sendRequest(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }

  private parseJsonObject(text: string): unknown {
    const trimmed = text.trim();
    const withoutFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(withoutFence);
    } catch {
      const start = withoutFence.indexOf("{");
      const end = withoutFence.lastIndexOf("}");

      if (start >= 0 && end > start) {
        return JSON.parse(withoutFence.slice(start, end + 1));
      }

      throw new Error("Gemini response was not valid JSON.");
    }
  }
}
