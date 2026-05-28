"use client";

import { useState } from "react";
import CompanyEntries from "./company_entries";
import EducationEntries from "./education_entries";
import PositionContext from "./position_context";
import Profile from "./profile";
import Skills from "./skills";
import Summary from "./summary";

type ViewKey = "profile" | "resume" | "work" | "education" | "application";

type ViewButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
};

function ViewButton({ active, label, onClick, icon }: ViewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? "border-zinc-400 bg-zinc-200 text-zinc-900"
          : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ViewSidebarLayout() {
  const [activeView, setActiveView] = useState<ViewKey>("profile");

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row md:items-start">
      <aside className="w-full rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:sticky md:top-4 md:w-56">
        <nav className="flex flex-row gap-2 md:flex-col" aria-label="View navigation">
          <ViewButton
            active={activeView === "profile"}
            onClick={() => setActiveView("profile")}
            label="Profile"
            icon={
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
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
              </svg>
            }
          />

          <ViewButton
            active={activeView === "resume"}
            onClick={() => setActiveView("resume")}
            label="Resume"
            icon={
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
                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                <path d="M14 2v5h5" />
                <path d="m10 15 5-5 2 2-5 5-3 1z" />
              </svg>
            }
          />

          <ViewButton
            active={activeView === "work"}
            onClick={() => setActiveView("work")}
            label="Work"
            icon={
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
                <rect x="2" y="7" width="20" height="13" rx="2" />
                <path d="M16 20V5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v15" />
                <path d="M2 13h20" />
              </svg>
            }
          />

          <ViewButton
            active={activeView === "education"}
            onClick={() => setActiveView("education")}
            label="Education"
            icon={
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
                <path d="m22 10-10-5L2 10l10 5z" />
                <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
              </svg>
            }
          />

          <ViewButton
            active={activeView === "application"}
            onClick={() => setActiveView("application")}
            label="Application"
            icon={
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
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            }
          />
        </nav>
      </aside>

      <div className="min-w-0 flex-1 w-full">
        <div className="flex w-full flex-col gap-6" hidden={activeView !== "profile"}>
          <Profile />
        </div>

        <div className="flex w-full flex-col gap-6" hidden={activeView !== "resume"}>
          <Summary />
          <Skills />
        </div>

        <div className="flex w-full flex-col gap-6" hidden={activeView !== "work"}>
          <CompanyEntries />
        </div>

        <div className="flex w-full flex-col gap-6" hidden={activeView !== "education"}>
          <EducationEntries />
        </div>

        <div className="flex w-full flex-col gap-6" hidden={activeView !== "application"}>
          <PositionContext />
        </div>
      </div>
    </div>
  );
}
