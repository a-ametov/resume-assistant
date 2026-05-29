"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useResumeGlobalState } from "./resume_global_state";

export default function AuthStateLoader() {
  const { status, data: session } = useSession();
  const { loadSerializedAppState } = useResumeGlobalState();
  const loadedSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const sessionKey = session?.user?.email ?? session?.user?.name ?? null;
    if (!sessionKey || loadedSessionKeyRef.current === sessionKey) {
      return;
    }

    loadedSessionKeyRef.current = sessionKey;

    const loadState = async () => {
      try {
        const response = await fetch("/api/storage/load", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return;
        }

        const appState = (await response.json()) as unknown;
        if (appState !== null) {
          loadSerializedAppState(appState);
        }
      } catch {
        // Ignore storage hydration failures; the app can still be used locally.
      }
    };

    void loadState();
  }, [loadSerializedAppState, session?.user?.email, session?.user?.name, status]);

  return null;
}