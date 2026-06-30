import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExportRequest } from "../shared/types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 48;
const BODY_SIZE = 10;
const SECTION_HEADING_SIZE = 11;
const HEADER_SIZE = 22;
const LINE_HEIGHT = 15;
const INLINE_DIVIDER = " \u00B7 ";
const SECTION_TOP_MARGIN = 8;
const SECTION_SEPARATOR_MARGIN = Math.round(LINE_HEIGHT / 2) + 10;
const EXPERIENCE_HEADER_PREFIX = "__EXP_HEADER__";
const EXPERIENCE_HEADER_SPLIT = "__EXP_SPLIT__";
const EXPERIENCE_SUMMARY_PREFIX = "__EXP_SUMMARY__";
const EXPERIENCE_BULLET_PREFIX = "__EXP_BULLET__";
const EXPERIENCE_BULLET_MARKER = "•";
const EXPERIENCE_ENTRY_GAP_MARKER = "__EXP_ENTRY_GAP__";
const EXPERIENCE_ENTRY_GAP = 8;
const EXPERIENCE_HEADER_SUMMARY_GAP_MARKER = "__EXP_HEADER_SUMMARY_GAP__";
const EXPERIENCE_HEADER_SUMMARY_GAP = Math.round(LINE_HEIGHT / 2);
const EDUCATION_NAME_PREFIX = "__EDU_NAME__";
const EDUCATION_DETAIL_PREFIX = "__EDU_DETAIL__";
const EDUCATION_DETAIL_SPLIT = "__EDU_DETAIL_SPLIT__";

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
    lines.push(profileParts.join(INLINE_DIVIDER));
  }

  lines.push("");

  if (request.summary.length > 0) {
    lines.push("SUMMARY");
    const summaryLine = request.summary
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(" ");
    if (summaryLine.length > 0) {
      lines.push(summaryLine);
    }
    lines.push("");
  }

  if (request.skills.length > 0) {
    lines.push("SKILLS");
    const skills = request.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0);
    for (let index = 0; index < skills.length; index += 5) {
      lines.push(skills.slice(index, index + 5).join(INLINE_DIVIDER));
    }
    lines.push("");
  }

  if (request.companyEntries.length > 0) {
    lines.push("EXPERIENCE");
    request.companyEntries.forEach((company, companyIndex) => {
      const companyName = company.name.trim();
      const position = company.position.trim();
      const dateRange = `${toMonthYear(company.from)} - ${toMonthYear(company.to)}`;

      if (companyName || position) {
        const companyWithDate = companyName ? `${companyName} (${dateRange})` : dateRange;
        lines.push(`${EXPERIENCE_HEADER_PREFIX}${companyWithDate}${EXPERIENCE_HEADER_SPLIT}${position}`);
      } else {
        lines.push(dateRange);
      }

      const summary = company.summary.trim();
      if (summary.length > 0) {
        lines.push(EXPERIENCE_HEADER_SUMMARY_GAP_MARKER);
        lines.push(`${EXPERIENCE_SUMMARY_PREFIX}${summary}`);
      }

      company.experience
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .forEach((entry) => lines.push(`${EXPERIENCE_BULLET_PREFIX}${entry}`));

      if (companyIndex < request.companyEntries.length - 1) {
        lines.push(EXPERIENCE_ENTRY_GAP_MARKER);
      }

      lines.push("");
    });
  }

  if (request.education.length > 0) {
    lines.push("EDUCATION");
    const dedupedEducation = new Map<
      string,
      {
        name: string;
        details: Array<{
          title: string;
          from: number;
          to: number;
        }>;
      }
    >();

    request.education.forEach((education, educationIndex) => {
      const rawName = education.name.trim();
      const key = rawName.length > 0 ? rawName.toLowerCase() : `__education_blank_${educationIndex}`;
      const title = education.title.trim();
      const from = Number.isFinite(education.from) ? education.from : 0;
      const to = Number.isFinite(education.to) ? education.to : 0;

      const existing = dedupedEducation.get(key);
      if (!existing) {
        dedupedEducation.set(key, {
          name: rawName,
          details: [],
        });
      }

      const group = dedupedEducation.get(key);
      if (!group) {
        return;
      }

      if (title.length > 0 || from > 0 || to > 0) {
        const alreadyExists = group.details.some(
          (detail) => detail.title === title && detail.from === from && detail.to === to,
        );
        if (!alreadyExists) {
          group.details.push({
            title,
            from,
            to,
          });
        }
      }
    });

    Array.from(dedupedEducation.values()).forEach((education) => {
      const educationName = education.name.trim();
      if (educationName.length > 0) {
        lines.push(`${EDUCATION_NAME_PREFIX}${educationName}`);
      }

      education.details.forEach((detail) => {
        const educationTitle = detail.title.trim();
        const from = detail.from;
        const to = detail.to;

        let rangeText = "";
        if (from > 0 && to > 0) {
          rangeText = `${from} - ${to}`;
        } else if (from > 0) {
          rangeText = `${from}`;
        } else if (to > 0) {
          rangeText = `${to}`;
        }

        if (educationTitle.length > 0 || rangeText.length > 0) {
          lines.push(`${EDUCATION_DETAIL_PREFIX}${educationTitle}${EDUCATION_DETAIL_SPLIT}${rangeText}`);
        }
      });

      lines.push("");
    });
  }

  return compactLines(lines);
}

export async function exportResumeToPdfBytes(request: ExportRequest): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;
  const maxWidth = PAGE_WIDTH - MARGIN_X * 2;
  const experienceIndent = bodyFont.widthOfTextAtSize("    ", BODY_SIZE);

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY < MARGIN_BOTTOM + requiredHeight) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const drawSectionHeading = (text: string) => {
    const heading = text.trim().toUpperCase();
    if (!heading) {
      return;
    }

    ensureSpace(SECTION_TOP_MARGIN + LINE_HEIGHT + 16);
    cursorY -= SECTION_TOP_MARGIN;

    page.drawText(heading, {
      x: MARGIN_X,
      y: cursorY,
      size: SECTION_HEADING_SIZE,
      font: boldFont,
      color: rgb(0.08, 0.08, 0.08),
    });

    const ruleY = cursorY - 5;
    page.drawLine({
      start: { x: MARGIN_X, y: ruleY },
      end: { x: PAGE_WIDTH - MARGIN_X, y: ruleY },
      thickness: 1,
      color: rgb(0.08, 0.08, 0.08),
    });

    cursorY = ruleY - SECTION_SEPARATOR_MARGIN;
  };

  const drawWrappedLine = (text: string, fontKind: "header" | "body") => {
    const font = fontKind === "body" ? bodyFont : boldFont;
    const size = fontKind === "header" ? HEADER_SIZE : BODY_SIZE;
    const wrapped = wrapText(text, maxWidth, size, (value, fontSize) => font.widthOfTextAtSize(value, fontSize));

    wrapped.forEach((line) => {
      ensureSpace(LINE_HEIGHT);

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

  const drawWrappedStyledLine = (text: string, options: { font: typeof bodyFont; x: number; maxLineWidth: number }) => {
    const wrapped = wrapText(text, options.maxLineWidth, BODY_SIZE, (value, fontSize) =>
      options.font.widthOfTextAtSize(value, fontSize),
    );

    wrapped.forEach((line) => {
      ensureSpace(LINE_HEIGHT);

      page.drawText(line, {
        x: options.x,
        y: cursorY,
        size: BODY_SIZE,
        font: options.font,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorY -= LINE_HEIGHT;
    });
  };

  const drawExperienceBulletLine = (text: string) => {
    const bulletX = MARGIN_X + experienceIndent;
    const marker = `${EXPERIENCE_BULLET_MARKER} `;
    const markerWidth = bodyFont.widthOfTextAtSize(marker, BODY_SIZE);
    const textX = bulletX + markerWidth;
    const availableTextWidth = PAGE_WIDTH - MARGIN_X - textX;
    const wrapped = wrapText(text, availableTextWidth, BODY_SIZE, (value, fontSize) =>
      bodyFont.widthOfTextAtSize(value, fontSize),
    );

    wrapped.forEach((line, index) => {
      ensureSpace(LINE_HEIGHT);

      if (index === 0) {
        page.drawText(marker, {
          x: bulletX,
          y: cursorY,
          size: BODY_SIZE,
          font: bodyFont,
          color: rgb(0.08, 0.08, 0.08),
        });
      }

      page.drawText(line, {
        x: textX,
        y: cursorY,
        size: BODY_SIZE,
        font: bodyFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorY -= LINE_HEIGHT;
    });
  };

  const drawExperienceHeader = (line: string) => {
    const payload = line.slice(EXPERIENCE_HEADER_PREFIX.length);
    const [companyWithDateRaw, positionRaw] = payload.split(EXPERIENCE_HEADER_SPLIT);
    const companyWithDate = (companyWithDateRaw ?? "").trim();
    const position = (positionRaw ?? "").trim();

    if (!companyWithDate && !position) {
      return;
    }

    ensureSpace(LINE_HEIGHT);

    let cursorX = MARGIN_X;
    if (companyWithDate.length > 0) {
      page.drawText(companyWithDate, {
        x: cursorX,
        y: cursorY,
        size: BODY_SIZE,
        font: boldFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorX += boldFont.widthOfTextAtSize(companyWithDate, BODY_SIZE);
    }

    if (position.length > 0) {
      const separator = companyWithDate.length > 0 ? " - " : "";
      if (separator.length > 0) {
        page.drawText(separator, {
          x: cursorX,
          y: cursorY,
          size: BODY_SIZE,
          font: bodyFont,
          color: rgb(0.08, 0.08, 0.08),
        });
        cursorX += bodyFont.widthOfTextAtSize(separator, BODY_SIZE);
      }

      page.drawText(position, {
        x: cursorX,
        y: cursorY,
        size: BODY_SIZE,
        font: italicFont,
        color: rgb(0.08, 0.08, 0.08),
      });
    }

    cursorY -= LINE_HEIGHT;
  };

  const drawEducationDetail = (line: string) => {
    const payload = line.slice(EDUCATION_DETAIL_PREFIX.length);
    const [titleRaw, rangeRaw] = payload.split(EDUCATION_DETAIL_SPLIT);
    const title = (titleRaw ?? "").trim();
    const range = (rangeRaw ?? "").trim();

    if (!title && !range) {
      return;
    }

    ensureSpace(LINE_HEIGHT);

    const bulletX = MARGIN_X + experienceIndent;
    const marker = `${EXPERIENCE_BULLET_MARKER} `;
    page.drawText(marker, {
      x: bulletX,
      y: cursorY,
      size: BODY_SIZE,
      font: bodyFont,
      color: rgb(0.08, 0.08, 0.08),
    });

    let cursorX = bulletX + bodyFont.widthOfTextAtSize(marker, BODY_SIZE);
    if (title.length > 0) {
      page.drawText(title, {
        x: cursorX,
        y: cursorY,
        size: BODY_SIZE,
        font: bodyFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorX += bodyFont.widthOfTextAtSize(title, BODY_SIZE);
    }

    if (range.length > 0) {
      const separator = title.length > 0 ? " (" : "(";
      page.drawText(separator, {
        x: cursorX,
        y: cursorY,
        size: BODY_SIZE,
        font: bodyFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorX += bodyFont.widthOfTextAtSize(separator, BODY_SIZE);

      page.drawText(range, {
        x: cursorX,
        y: cursorY,
        size: BODY_SIZE,
        font: italicFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorX += italicFont.widthOfTextAtSize(range, BODY_SIZE);

      page.drawText(")", {
        x: cursorX,
        y: cursorY,
        size: BODY_SIZE,
        font: bodyFont,
        color: rgb(0.08, 0.08, 0.08),
      });
    }

    cursorY -= LINE_HEIGHT;
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
    if (isSectionHeading) {
      drawSectionHeading(line);
      return;
    }

    if (line.startsWith(EXPERIENCE_HEADER_PREFIX)) {
      drawExperienceHeader(line);
      return;
    }

    if (line.startsWith(EXPERIENCE_SUMMARY_PREFIX)) {
      drawWrappedStyledLine(line.slice(EXPERIENCE_SUMMARY_PREFIX.length), {
        font: italicFont,
        x: MARGIN_X,
        maxLineWidth: maxWidth,
      });
      return;
    }

    if (line === EXPERIENCE_HEADER_SUMMARY_GAP_MARKER) {
      cursorY -= EXPERIENCE_HEADER_SUMMARY_GAP;
      return;
    }

    if (line.startsWith(EXPERIENCE_BULLET_PREFIX)) {
      drawExperienceBulletLine(line.slice(EXPERIENCE_BULLET_PREFIX.length));
      return;
    }

    if (line.startsWith(EDUCATION_NAME_PREFIX)) {
      drawWrappedStyledLine(line.slice(EDUCATION_NAME_PREFIX.length), {
        font: boldFont,
        x: MARGIN_X,
        maxLineWidth: maxWidth,
      });
      return;
    }

    if (line.startsWith(EDUCATION_DETAIL_PREFIX)) {
      drawEducationDetail(line);
      return;
    }

    if (line === EXPERIENCE_ENTRY_GAP_MARKER) {
      cursorY -= EXPERIENCE_ENTRY_GAP;
      return;
    }

    drawWrappedLine(line, "body");
  });

  return pdf.save();
}
