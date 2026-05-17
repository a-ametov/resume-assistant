"use client";

import { useEffect, useId, useRef, useState } from "react";
import BackendClient from "../client/backend_client";
import type { ExperienceEntryState } from "../state/resume_position_state";

type ExperienceEntryProps = {
  companyId: number;
  entryId: number;
  hidden: boolean;
  isCollapsed: boolean;
  isSummary?: boolean;
  initialText?: string;
  onStateChange: (patch: Partial<Omit<ExperienceEntryState, "entryId">>) => void;
};

export default function ExperienceEntry({
  companyId,
  entryId,
  hidden,
  isCollapsed,
  isSummary = false,
  initialText = "",
  onStateChange,
}: ExperienceEntryProps) {
  const initialRecommendation = "Recommendation will appear here.";
  const backendClient = BackendClient.getInstance();
  const inputId = `${useId()}-${companyId}-${entryId}`;
  const [text, setText] = useState(initialText);
  const [rating, setRating] = useState<number | null>(null);
  const [recommendationRating, setRecommendationRating] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState(initialRecommendation);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const trimmedRecommendation = recommendation.trim();
  const hasRecommendation =
    trimmedRecommendation.length > 0 &&
    trimmedRecommendation !== initialRecommendation;
  const isBusy = isChecking || isUpdating;
  const onStateChangeRef = useRef(onStateChange);

  const commitStateNow = (patch: Partial<Omit<ExperienceEntryState, "entryId">> = {}) => {
    onStateChangeRef.current({
      text,
      rating,
      recommendation,
      error,
      isChecking,
      isUpdating,
      hidden,
      ...patch,
    });
  };

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onStateChangeRef.current({
        text,
        rating,
        recommendation,
        error,
        isChecking,
        isUpdating,
        hidden,
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [text, rating, recommendation, error, isChecking, isUpdating, hidden]);

  const recommendationClass = hasRecommendation
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-zinc-300 bg-zinc-50 text-zinc-700";

  const extractErrorDetails = (caughtError: unknown) => {
    const message = caughtError instanceof Error ? caughtError.message : "";
    const statusMatch = message.match(/\b(\d{3})\b/);
    const code = statusMatch?.[1] ?? "unknown";

    const afterCode = statusMatch
      ? message.slice((statusMatch.index ?? 0) + statusMatch[0].length).trim()
      : message.trim();

    let codeMessage = afterCode || "No additional details";

    try {
      const parsed = JSON.parse(afterCode) as {
        error?: { message?: string };
        message?: string;
      };

      codeMessage =
        parsed.error?.message?.trim() ||
        parsed.message?.trim() ||
        codeMessage;
    } catch {
      // Keep the plain string when payload is not JSON.
    }

    return { code, codeMessage };
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

  const recommendationRatingColorClass =
    recommendationRating === null
      ? "bg-zinc-100 text-zinc-600 border-zinc-300"
      : recommendationRating < 5
      ? "bg-red-100 text-red-700 border-red-200"
      : recommendationRating <= 7
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : recommendationRating <= 9
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-blue-100 text-blue-700 border-blue-200";

  const handleCheck = async () => {
    if (!trimmedText) {
      setError("Please enter text before checking.");
      return;
    }

    setError("");
    setIsChecking(true);

    try {
      const result = await backendClient.check(trimmedText, companyId, entryId, isSummary); 

      setRating(result.rating);
      setRecommendation(result.recommendation);
      setRecommendationRating(result.recommendationRating);
      setReasoning(result.reasoning);
      commitStateNow({
        rating: result.rating,
        recommendation: result.recommendation,
        error: "",
        isChecking: false,
      });
    } catch (caughtError) {
      const { code, codeMessage } = extractErrorDetails(caughtError);
      const nextError = `Unable to check text right now. (Code: ${code}, Message: ${codeMessage})`;
      setError(nextError);
      commitStateNow({
        error: nextError,
        isChecking: false,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!trimmedText) {
      setError("Please enter text before updating.");
      return;
    }

    if (!hasRecommendation) {
      setError("Run Check first to generate a rewrite.");
      return;
    }

    setError("");
    setIsUpdating(true);

    try {
      const result = await backendClient.change(
        trimmedText,
        rating ?? 0,
        recommendation,
        recommendationRating ?? 0,
        companyId,
        entryId,
        isSummary,
      );

      setRecommendation(result.recommendation);
      setRecommendationRating(result.recommendationRating);
      setReasoning(result.reasoning);
      commitStateNow({
        recommendation: result.recommendation,
        error: "",
        isUpdating: false,
      });
    } catch (caughtError) {
      const { code, codeMessage } = extractErrorDetails(caughtError);
      const nextError = `Unable to update recommendation right now. (Code: ${code}, Message: ${codeMessage})`;
      setError(nextError);
      commitStateNow({
        error: nextError,
        isUpdating: false,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-[88px] w-full items-stretch gap-3">
        <label className="sr-only" htmlFor={inputId}>
          Text input
        </label>
        <textarea
          id={inputId}
          placeholder="Enter your experience here..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-full w-full resize-none overflow-y-auto rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
        />
        <div className="flex h-full min-w-36 flex-col gap-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={!hasText || isBusy}
            className="h-10 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:border disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            {isChecking ? "Checking..." : "Check"}
          </button>
          <div
            className={`flex h-10 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold ${ratingColorClass}`}
          >
            {rating === null ? "Unrated" : `${rating}/10`}
          </div>
        </div>
      </div>

      {rating !== null && !isCollapsed ? (
        <>
          <div className="flex h-[88px] w-full items-stretch gap-3">
            <div
              className={`h-full w-full overflow-y-auto rounded-md border px-3 py-2 text-sm ${recommendationClass}`}
            >
              {recommendation}
            </div>
            <div className="flex h-full min-w-36 flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!hasText || !hasRecommendation || isBusy}
                  className="flex h-10 flex-1 items-center justify-center rounded-md border border-red-200 bg-red-100 px-2 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
                  aria-label="Regenerate recommendation"
                  title={isUpdating ? "Regenerating..." : "Regenerate"}
                >
                  {isUpdating ? (
                    <span className="text-xs">...</span>
                  ) : (
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
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setText(recommendation)}
                  disabled={!hasRecommendation || isBusy}
                  className="flex h-10 flex-1 items-center justify-center rounded-md border border-green-200 bg-green-100 px-2 py-2 text-sm font-medium text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
                  aria-label="Accept recommendation"
                  title="Accept"
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
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </button>
              </div>
              <div
                className={`flex h-10 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold ${recommendationRatingColorClass}`}
              >
                {recommendationRating === null
                  ? "Rec Unrated"
                  : `Rec ${recommendationRating}/10`}
              </div>
            </div>
          </div>
          <textarea
            readOnly
            value={reasoning}
            placeholder="Reasoning will appear here..."
            className="w-full min-h-[88px] resize-none rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 outline-none"
          />
        </>
      ) : null}
      {error ? (
        <p
          className="w-full max-w-full cursor-help overflow-hidden text-ellipsis whitespace-nowrap text-sm text-red-600"
          title={error}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}