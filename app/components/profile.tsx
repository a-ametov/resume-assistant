"use client";

import { useEffect, useState } from "react";
import { useResumeGlobalState } from "./resume_global_state";

export default function Profile() {
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };
  const {
    profile,
    setProfile,
    loadedSerializedAppState,
  } = useResumeGlobalState();

  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [linkedIn, setLinkedIn] = useState(profile.linkedIn ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [targetRole, setTargetRole] = useState(profile.targetRole ?? "");
  const [targetLevel, setTargetLevel] = useState(profile.targetLevel ?? "");

  useEffect(() => {
    if (loadedSerializedAppState) {
      setName(loadedSerializedAppState.profile?.name ?? "");
      setEmail(loadedSerializedAppState.profile?.email ?? "");
      setLinkedIn(loadedSerializedAppState.profile?.linkedIn ?? "");
      setPhone(formatPhone(loadedSerializedAppState.profile?.phone ?? ""));
      setTargetRole(loadedSerializedAppState.profile?.targetRole ?? "");
      setTargetLevel(loadedSerializedAppState.profile?.targetLevel ?? "");
    }
  }, [loadedSerializedAppState]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setProfile({
        name,
        email,
        linkedIn,
        phone,
        targetRole,
        targetLevel,
      });
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [name, email, linkedIn, phone, targetRole, targetLevel, setProfile]);

  return (
    <section className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="profile-linkedin">
            LinkedIn URL
          </label>
          <input
            id="profile-linkedin"
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={linkedIn}
            onChange={(e) => setLinkedIn(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="profile-phone">
            Phone Number
          </label>
          <input
            id="profile-phone"
            type="tel"
            placeholder="(000) 123-4567"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="mt-2 border-t border-zinc-200 pt-3">
          <p className="text-sm font-medium text-zinc-800">Targeting</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="profile-target-role">
            Role
          </label>
          <input
            id="profile-target-role"
            type="text"
            placeholder="e.g. Software Engineer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="profile-target-level">
            Level
          </label>
          <input
            id="profile-target-level"
            type="text"
            placeholder="e.g. Senior"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      </div>
    </section>
  );
}
