"use client";

import { useResumeGlobalState } from "./resume_global_state";

export default function ApplicationContext() {
  const {
    company,
    setCompany,
    positionTitle,
    setPositionTitle,
    positionResponsibilities,
    setPositionResponsibilities,
  } = useResumeGlobalState();

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="company">
            Applying to
          </label>
          <input
            id="company"
            type="text"
            placeholder="Company Name"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="position-title">
            Position Title
          </label>
          <input
            id="position-title"
            type="text"
            placeholder="Position Title"
            value={positionTitle}
            onChange={(event) => setPositionTitle(event.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-sm font-medium text-zinc-800"
            htmlFor="position-responsibilities"
          >
            Position Responsibilities
          </label>
          <textarea
            id="position-responsibilities"
            placeholder="Describe core responsibilities for this role..."
            value={positionResponsibilities}
            onChange={(event) => setPositionResponsibilities(event.target.value)}
            className="min-h-28 resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      </div>
    </section>
  );
}
