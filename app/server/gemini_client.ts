import { CheckRequest, ChangeRequest, CheckResult, ChangeResult } from "../shared/types";
import { createCheckExperiencePrompt, createCheckSummaryPrompt, createChangeExperiencePrompt, createChangeSummaryPrompt} from "./prompts";

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
