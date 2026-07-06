import { useEffect, useRef } from "react";

type BuilderFieldProps = {
  name: string;
  selectedOption: "original" | "suggested";
  onSelectOption: (option: "original" | "suggested") => void;
  originalText: string;
  suggestionText: string;
  onSuggestionTextChange: (value: string) => void;
};

type AutoTextareaProps = {
  value: string;
  className: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
};

function AutoTextarea({ value, className, onChange, readOnly = false }: AutoTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    let frameId = 0;
    const resizeToContent = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    const scheduleResize = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        resizeToContent();
      });
    };

    scheduleResize();

    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined" && textarea.parentElement) {
      observer = new ResizeObserver(() => {
        scheduleResize();
      });
      observer.observe(textarea.parentElement);
    }

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      observer?.disconnect();
    };
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      readOnly={readOnly}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      className={className}
    />
  );
}

export default function BuilderField({
  name,
  selectedOption,
  onSelectOption,
  originalText,
  suggestionText,
  onSuggestionTextChange,
}: BuilderFieldProps) {
  const originalId = `${name}-original`;
  const suggestedId = `${name}-suggested`;

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Choose original or suggested text">
      <label htmlFor={originalId} className="flex cursor-pointer items-start gap-3">
        <input
          id={originalId}
          type="radio"
          name={name}
          checked={selectedOption === "original"}
          onChange={() => onSelectOption("original")}
          className="sr-only"
        />
        <span
          className={`mt-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
            selectedOption === "original"
              ? "border-green-600 bg-green-600 text-white"
              : "border-zinc-300 bg-white text-transparent"
          }`}
          aria-hidden="true"
        >
          ✓
        </span>
        <AutoTextarea
          value={originalText}
          readOnly
          className={`h-10 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none ${
            selectedOption === "original"
              ? "border-green-500 bg-green-50 text-zinc-900"
              : "border-zinc-300 bg-zinc-100 text-zinc-700"
          } resize-none overflow-hidden py-2`}
        />
      </label>

      <label htmlFor={suggestedId} className="flex cursor-pointer items-start gap-3">
        <input
          id={suggestedId}
          type="radio"
          name={name}
          checked={selectedOption === "suggested"}
          onChange={() => onSelectOption("suggested")}
          className="sr-only"
        />
        <span
          className={`mt-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
            selectedOption === "suggested"
              ? "border-green-600 bg-green-600 text-white"
              : "border-zinc-300 bg-white text-transparent"
          }`}
          aria-hidden="true"
        >
          ✓
        </span>
        <div className="relative min-w-0 flex-1">
          <AutoTextarea
            value={suggestionText}
            onChange={onSuggestionTextChange}
            className={`h-10 w-full rounded-md border px-3 pr-10 text-sm outline-none ${
              selectedOption === "suggested"
                ? "border-green-500 bg-green-50 text-zinc-900"
                : "border-zinc-300 bg-white text-zinc-900"
            } resize-none overflow-hidden py-2`}
          />
          <span
            className="pointer-events-none absolute bottom-2 right-2 inline-flex h-4 w-4 items-center justify-center text-zinc-400"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
        </div>
      </label>
    </div>
  );
}
