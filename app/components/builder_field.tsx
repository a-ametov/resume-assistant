import { useEffect, useRef } from "react";

type BuilderFieldProps = {
  name: string;
  selectedOption: "original" | "suggested";
  onSelectOption: (option: "original" | "suggested") => void;
  originalText: string;
  suggestionText: string;
};

type AutoReadOnlyTextareaProps = {
  value: string;
  className: string;
};

function AutoReadOnlyTextarea({ value, className }: AutoReadOnlyTextareaProps) {
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
      readOnly
      value={value}
      rows={1}
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
        <AutoReadOnlyTextarea
          value={originalText}
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
        <AutoReadOnlyTextarea
          value={suggestionText}
          className={`h-10 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none ${
            selectedOption === "suggested"
              ? "border-green-500 bg-green-50 text-zinc-900"
              : "border-zinc-300 bg-zinc-50 text-zinc-900"
          } resize-none overflow-hidden py-2`}
        />
      </label>
    </div>
  );
}
