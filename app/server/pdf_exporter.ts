import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExportRequest } from "../shared/types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 48;
const BODY_SIZE = 11;
const HEADER_SIZE = 22;
const SECTION_SIZE = 14;
const LINE_HEIGHT = 15;

function compactLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => !(line.length === 0 && arr[index - 1]?.length === 0));
}

function toMonthYear(value: string | null): string {
  if (!value) {
    return "Present";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return value;
}

function wrapText(text: string, maxWidth: number, size: number, measure: (text: string, size: number) => number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let chunk = "";
    for (const ch of word) {
      const chunkNext = `${chunk}${ch}`;
      if (measure(chunkNext, size) > maxWidth && chunk.length > 0) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = chunkNext;
      }
    }
    current = chunk;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function buildResumeLines(request: ExportRequest): string[] {
  const lines: string[] = [];
  const profile = request.profile;

  if (profile.name.trim()) {
    lines.push(profile.name.trim());
  } else {
    lines.push("Resume");
  }

  const profileParts = [profile.email, profile.phone, profile.linkedin]
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (profileParts.length > 0) {
    lines.push(profileParts.join(" | "));
  }

  lines.push("");

  if (request.summary.length > 0) {
    lines.push("SUMMARY");
    request.summary.forEach((entry) => {
      const trimmed = entry.trim();
      if (trimmed.length > 0) {
        lines.push(`- ${trimmed}`);
      }
    });
    lines.push("");
  }

  if (request.skills.length > 0) {
    lines.push("SKILLS");
    lines.push(request.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0).join(" | "));
    lines.push("");
  }

  if (request.companyEntries.length > 0) {
    lines.push("EXPERIENCE");
    request.companyEntries.forEach((company) => {
      const companyName = company.name.trim();
      const position = company.position.trim();
      const dateRange = `${toMonthYear(company.from)} - ${toMonthYear(company.to)}`;

      if (companyName || position) {
        lines.push([companyName, position].filter((part) => part.length > 0).join(" | "));
      }

      lines.push(dateRange);

      const summary = company.summary.trim();
      if (summary.length > 0) {
        lines.push(summary);
      }

      company.experience
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .forEach((entry) => lines.push(`- ${entry}`));

      lines.push("");
    });
  }

  if (request.education.length > 0) {
    lines.push("EDUCATION");
    request.education.forEach((education) => {
      const titleLine = [education.name.trim(), education.title.trim()]
        .filter((part) => part.length > 0)
        .join(" | ");
      if (titleLine.length > 0) {
        lines.push(titleLine);
      }

      const from = Number.isFinite(education.from) ? education.from : 0;
      const to = Number.isFinite(education.to) ? education.to : 0;
      if (from > 0 || to > 0) {
        lines.push(`${from > 0 ? from : ""}${to > 0 ? ` - ${to}` : ""}`.trim());
      }

      lines.push("");
    });
  }

  return compactLines(lines);
}

export async function exportResumeToPdfBytes(request: ExportRequest): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;
  const maxWidth = PAGE_WIDTH - MARGIN_X * 2;

  const drawWrappedLine = (text: string, fontKind: "header" | "section" | "body") => {
    const font = fontKind === "body" ? bodyFont : boldFont;
    const size = fontKind === "header" ? HEADER_SIZE : fontKind === "section" ? SECTION_SIZE : BODY_SIZE;
    const wrapped = wrapText(text, maxWidth, size, (value, fontSize) => font.widthOfTextAtSize(value, fontSize));

    wrapped.forEach((line) => {
      if (cursorY < MARGIN_BOTTOM + LINE_HEIGHT) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursorY = PAGE_HEIGHT - MARGIN_TOP;
      }

      page.drawText(line, {
        x: MARGIN_X,
        y: cursorY,
        size,
        font,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorY -= LINE_HEIGHT + (fontKind === "header" ? 6 : 0);
    });
  };

  const lines = buildResumeLines(request);

  lines.forEach((line, index) => {
    if (index === 0) {
      drawWrappedLine(line, "header");
      return;
    }

    if (line.length === 0) {
      cursorY -= 6;
      return;
    }

    const isSectionHeading = ["SUMMARY", "SKILLS", "EXPERIENCE", "EDUCATION"].includes(line);
    drawWrappedLine(line, isSectionHeading ? "section" : "body");
  });

  return pdf.save();
}
