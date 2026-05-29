"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CompanyEntryState,
  EducationEntryState,
  ExperienceEntryState,
  AppState,
  ProfileState,
  SerializedAppState,
  TextEntryState,
} from "../state/app_state";
import {
  deserializeAppState,
  isSerializedAppState,
  serializeAppState,
  setAppState,
} from "../state/app_state";

type ResumeGlobalStateValue = {
  company: string;
  setCompany: (value: string) => void;
  positionTitle: string;
  setPositionTitle: (value: string) => void;
  positionResponsibilities: string;
  setPositionResponsibilities: (value: string) => void;
  summaryEntries: TextEntryState[];
  registerSummaryEntry: (entryId: number) => void;
  updateSummaryEntry: (
    entryId: number,
    patch: Partial<Omit<TextEntryState, "entryId">>,
  ) => void;
  setSummaryEntryHidden: (entryId: number, hidden: boolean) => void;
  skillsEntries: TextEntryState[];
  registerSkillEntry: (entryId: number) => void;
  updateSkillEntry: (
    entryId: number,
    patch: Partial<Omit<TextEntryState, "entryId">>,
  ) => void;
  setSkillEntryHidden: (entryId: number, hidden: boolean) => void;
  profile: ProfileState;
  setProfile: (value: ProfileState) => void;
  isDirty: boolean;
  markSavedClean: () => void;
  isProfileVisible: boolean;
  toggleProfileVisible: () => void;
  appState: AppState;
  loadStateRevision: number;
  loadedSerializedAppState: SerializedAppState | null;
  loadSerializedAppState: (data: unknown) => data is SerializedAppState;
  registerEducationEntry: (educationId: number) => void;
  updateEducationEntry: (
    educationId: number,
    patch: Partial<Omit<EducationEntryState, "educationId">>,
  ) => void;
  registerCompanyEntry: (companyId: number) => void;
  updateCompanyEntry: (
    companyId: number,
    patch: Partial<Omit<CompanyEntryState, "companyId" | "experiences">>,
  ) => void;
  registerExperienceEntry: (companyId: number, entryId: number) => void;
  updateExperienceEntry: (
    companyId: number,
    entryId: number,
    patch: Partial<Omit<ExperienceEntryState, "entryId">>,
  ) => void;
  setExperienceHidden: (
    companyId: number,
    entryId: number,
    hidden: boolean,
  ) => void;
};

const ResumeGlobalStateContext = createContext<ResumeGlobalStateValue | null>(
  null,
);

const createDefaultExperienceEntry = (entryId: number): ExperienceEntryState => ({
  entryId,
  text: "",
  rating: null,
  recommendation: "",
  error: "",
  isChecking: false,
  isUpdating: false,
  hidden: false,
});

const createDefaultCompanyEntry = (companyId: number): CompanyEntryState => ({
  companyId,
  companyName: "",
  positionTitle: "",
  positionSummary: "",
  fromDate: "",
  toDate: "",
  isCollapsed: false,
  hidden: false,
  experiences: [],
});

const createDefaultEducationEntry = (educationId: number): EducationEntryState => ({
  educationId,
  name: "",
  title: "",
  fromDate: "",
  toDate: "",
  isCollapsed: false,
  hidden: false,
});

const createDefaultTextEntry = (entryId: number): TextEntryState => ({
  entryId,
  text: "",
  hidden: false,
});

function hasPatchChanges<T extends object>(
  current: T,
  patch: Partial<T>,
): boolean {
  return Object.entries(patch).some(([key, value]) => {
    const currentValue = current[key as keyof T];
    return currentValue !== value;
  });
}

function profilesEqual(left: ProfileState, right: ProfileState): boolean {
  return (
    left.name === right.name &&
    left.email === right.email &&
    left.linkedIn === right.linkedIn &&
    left.phone === right.phone &&
    left.targetRole === right.targetRole &&
    left.targetLevel === right.targetLevel
  );
}

export function ResumeGlobalStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [company, setCompany] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [positionResponsibilities, setPositionResponsibilities] = useState("");
  const [summaryEntries, setSummaryEntries] = useState<TextEntryState[]>([]);
  const [skillsEntries, setSkillsEntries] = useState<TextEntryState[]>([]);
  const [educationEntries, setEducationEntries] = useState<EducationEntryState[]>([]);
  const [companyEntries, setCompanyEntries] = useState<CompanyEntryState[]>([]);
  const [profile, setProfileState] = useState<ProfileState>({
    name: "",
    email: "",
    linkedIn: "",
    phone: "",
    targetRole: "",
    targetLevel: "",
  });
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const didInitializeDirtyTracking = useRef(false);
  const suppressDirtyTracking = useRef(false);
  const suppressDirtyTrackingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadStateRevision, setLoadStateRevision] = useState(0);
  const [loadedSerializedAppState, setLoadedSerializedAppState] =
    useState<SerializedAppState | null>(null);

  const loadSerializedAppState = useCallback(
    (data: unknown): data is SerializedAppState => {
      if (!isSerializedAppState(data)) {
        return false;
      }

      const nextState = deserializeAppState(data);
      suppressDirtyTracking.current = true;
      if (suppressDirtyTrackingTimer.current !== null) {
        clearTimeout(suppressDirtyTrackingTimer.current);
      }
      suppressDirtyTrackingTimer.current = setTimeout(() => {
        suppressDirtyTracking.current = false;
        suppressDirtyTrackingTimer.current = null;
      }, 400);
      setLoadedSerializedAppState(serializeAppState(nextState));
      setCompany(nextState.company);
      setPositionTitle(nextState.positionTitle);
      setPositionResponsibilities(nextState.positionResponsibilities);
      setSummaryEntries(nextState.summaryEntries);
      setSkillsEntries(nextState.skillsEntries);
      setEducationEntries(nextState.educationEntries);
      setCompanyEntries(nextState.companyEntries);
      setProfileState(nextState.profile);
      setIsDirty(false);
      setAppState(nextState);
      setLoadStateRevision((prev) => prev + 1);
      return true;
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (suppressDirtyTrackingTimer.current !== null) {
        clearTimeout(suppressDirtyTrackingTimer.current);
      }
    };
  }, []);

  const registerEducationEntry = useCallback((educationId: number) => {
    setEducationEntries((prev) => {
      if (prev.some((entry) => entry.educationId === educationId)) {
        return prev;
      }

      return [...prev, createDefaultEducationEntry(educationId)];
    });
  }, []);

  const updateEducationEntry = useCallback((
    educationId: number,
    patch: Partial<Omit<EducationEntryState, "educationId">>,
  ) => {
    setEducationEntries((prev) => {
      const existing = prev.find((entry) => entry.educationId === educationId);

      if (!existing) {
        return [
          ...prev,
          {
            ...createDefaultEducationEntry(educationId),
            ...patch,
          },
        ];
      }

      if (!hasPatchChanges(existing, patch)) {
        return prev;
      }

      return prev.map((entry) =>
        entry.educationId === educationId
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      );
    });
  }, []);

  const registerCompanyEntry = useCallback((companyId: number) => {
    setCompanyEntries((prev) => {
      if (prev.some((entry) => entry.companyId === companyId)) {
        return prev;
      }

      return [...prev, createDefaultCompanyEntry(companyId)];
    });
  }, []);

  const updateCompanyEntry = useCallback((
    companyId: number,
    patch: Partial<Omit<CompanyEntryState, "companyId" | "experiences">>,
  ) => {
    setCompanyEntries((prev) => {
      const existing = prev.find((entry) => entry.companyId === companyId);

      if (!existing) {
        return [
          ...prev,
          {
            ...createDefaultCompanyEntry(companyId),
            ...patch,
          },
        ];
      }

      if (!hasPatchChanges(existing, patch)) {
        return prev;
      }

      return prev.map((entry) =>
        entry.companyId === companyId
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      );
    });
  }, []);

  const registerExperienceEntry = useCallback((companyId: number, entryId: number) => {
    setCompanyEntries((prev) => {
      const companyIndex = prev.findIndex((entry) => entry.companyId === companyId);
      const companyEntry =
        companyIndex >= 0 ? prev[companyIndex] : createDefaultCompanyEntry(companyId);

      if (companyEntry.experiences.some((entry) => entry.entryId === entryId)) {
        return prev;
      }

      const updatedCompany: CompanyEntryState = {
        ...companyEntry,
        experiences: [...companyEntry.experiences, createDefaultExperienceEntry(entryId)],
      };

      if (companyIndex >= 0) {
        return prev.map((entry, index) => (index === companyIndex ? updatedCompany : entry));
      }

      return [...prev, updatedCompany];
    });
  }, []);

  const updateExperienceEntry = useCallback((
    companyId: number,
    entryId: number,
    patch: Partial<Omit<ExperienceEntryState, "entryId">>,
  ) => {
    setCompanyEntries((prev) => {
      const companyIndex = prev.findIndex((entry) => entry.companyId === companyId);
      const companyEntry =
        companyIndex >= 0 ? prev[companyIndex] : createDefaultCompanyEntry(companyId);

      const experienceIndex = companyEntry.experiences.findIndex(
        (entry) => entry.entryId === entryId,
      );

      const updatedExperiences =
        experienceIndex >= 0
          ? companyEntry.experiences.map((entry, index) => {
              if (index !== experienceIndex) {
                return entry;
              }

              if (!hasPatchChanges(entry, patch)) {
                return entry;
              }

              return {
                ...entry,
                ...patch,
              };
            })
          : [
              ...companyEntry.experiences,
              {
                ...createDefaultExperienceEntry(entryId),
                ...patch,
              },
            ];

      if (
        experienceIndex >= 0 &&
        updatedExperiences[experienceIndex] === companyEntry.experiences[experienceIndex]
      ) {
        return prev;
      }

      const updatedCompany: CompanyEntryState = {
        ...companyEntry,
        experiences: updatedExperiences,
      };

      if (companyIndex >= 0) {
        return prev.map((entry, index) => (index === companyIndex ? updatedCompany : entry));
      }

      return [...prev, updatedCompany];
    });
  }, []);

  const setExperienceHidden = useCallback((
    companyId: number,
    entryId: number,
    hidden: boolean,
  ) => {
    updateExperienceEntry(companyId, entryId, { hidden });
  }, [updateExperienceEntry]);

  const registerSummaryEntry = useCallback((entryId: number) => {
    setSummaryEntries((prev) => {
      if (prev.some((entry) => entry.entryId === entryId)) {
        return prev;
      }

      return [...prev, createDefaultTextEntry(entryId)];
    });
  }, []);

  const updateSummaryEntry = useCallback((
    entryId: number,
    patch: Partial<Omit<TextEntryState, "entryId">>,
  ) => {
    setSummaryEntries((prev) => {
      const existing = prev.find((entry) => entry.entryId === entryId);

      if (!existing) {
        return [
          ...prev,
          {
            ...createDefaultTextEntry(entryId),
            ...patch,
          },
        ];
      }

      if (!hasPatchChanges(existing, patch)) {
        return prev;
      }

      return prev.map((entry) =>
        entry.entryId === entryId
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      );
    });
  }, []);

  const setSummaryEntryHidden = useCallback((entryId: number, hidden: boolean) => {
    updateSummaryEntry(entryId, { hidden });
  }, [updateSummaryEntry]);

  const registerSkillEntry = useCallback((entryId: number) => {
    setSkillsEntries((prev) => {
      if (prev.some((entry) => entry.entryId === entryId)) {
        return prev;
      }

      return [...prev, createDefaultTextEntry(entryId)];
    });
  }, []);

  const updateSkillEntry = useCallback((
    entryId: number,
    patch: Partial<Omit<TextEntryState, "entryId">>,
  ) => {
    setSkillsEntries((prev) => {
      const existing = prev.find((entry) => entry.entryId === entryId);

      if (!existing) {
        return [
          ...prev,
          {
            ...createDefaultTextEntry(entryId),
            ...patch,
          },
        ];
      }

      if (!hasPatchChanges(existing, patch)) {
        return prev;
      }

      return prev.map((entry) =>
        entry.entryId === entryId
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      );
    });
  }, []);

  const setSkillEntryHidden = useCallback((entryId: number, hidden: boolean) => {
    updateSkillEntry(entryId, { hidden });
  }, [updateSkillEntry]);

  const toggleProfileVisible = useCallback(() => {
    setIsProfileVisible((prev) => !prev);
  }, []);

  const markSavedClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const setProfile = useCallback((value: ProfileState) => {
    setProfileState((prev) => (profilesEqual(prev, value) ? prev : value));
  }, []);

  const appState: AppState = useMemo(
    () => ({
      company,
      positionTitle,
      positionResponsibilities,
      summaryEntries,
      skillsEntries,
      educationEntries,
      companyEntries,
      profile,
    }),
    [company, positionTitle, positionResponsibilities, summaryEntries, skillsEntries, educationEntries, companyEntries, profile],
  );

  useEffect(() => {
    setAppState({
      company,
      positionTitle,
      positionResponsibilities,
      summaryEntries,
      skillsEntries,
      educationEntries,
      companyEntries,
      profile,
    });
  }, [company, positionTitle, positionResponsibilities, summaryEntries, skillsEntries, educationEntries, companyEntries, profile]);

  useEffect(() => {
    if (!didInitializeDirtyTracking.current) {
      didInitializeDirtyTracking.current = true;
      return;
    }

    if (suppressDirtyTracking.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsDirty(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [company, positionTitle, positionResponsibilities, summaryEntries, skillsEntries, educationEntries, companyEntries, profile]);

  const value: ResumeGlobalStateValue = useMemo(
    () => ({
      company,
      setCompany,
      positionTitle,
      setPositionTitle,
      positionResponsibilities,
      setPositionResponsibilities,
      summaryEntries,
      registerSummaryEntry,
      updateSummaryEntry,
      setSummaryEntryHidden,
      skillsEntries,
      registerSkillEntry,
      updateSkillEntry,
      setSkillEntryHidden,
      profile,
      setProfile,
      isDirty,
      markSavedClean,
      isProfileVisible,
      toggleProfileVisible,
      appState,
      loadStateRevision,
      loadedSerializedAppState,
      loadSerializedAppState,
      registerEducationEntry,
      updateEducationEntry,
      registerCompanyEntry,
      updateCompanyEntry,
      registerExperienceEntry,
      updateExperienceEntry,
      setExperienceHidden,
    }),
    [
      company,
      positionTitle,
      positionResponsibilities,
      summaryEntries,
      skillsEntries,
      profile,
      isDirty,
      isProfileVisible,
      loadStateRevision,
      loadedSerializedAppState,
      loadSerializedAppState,
      registerEducationEntry,
      updateEducationEntry,
      registerCompanyEntry,
      updateCompanyEntry,
      registerExperienceEntry,
      updateExperienceEntry,
      setExperienceHidden,
      registerSummaryEntry,
      updateSummaryEntry,
      setSummaryEntryHidden,
      registerSkillEntry,
      updateSkillEntry,
      setSkillEntryHidden,
      markSavedClean,
      toggleProfileVisible,
      appState,
    ],
  );

  return (
    <ResumeGlobalStateContext.Provider value={value}>
      {children}
    </ResumeGlobalStateContext.Provider>
  );
}

export function useResumeGlobalState() {
  const context = useContext(ResumeGlobalStateContext);

  if (!context) {
    throw new Error(
      "useResumeGlobalState must be used within ResumeGlobalStateProvider.",
    );
  }

  return context;
}
