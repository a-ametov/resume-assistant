export type ProfileState = {
  name: string;
  email: string;
  linkedIn: string;
  phone: string;
};

export type PositionState = {
  company: string;
  positionTitle: string;
  positionResponsibilities: string;
  summaryEntries: TextEntryState[];
  skillsEntries: TextEntryState[];
  companyEntries: CompanyEntryState[];
  educationEntries: EducationEntryState[];
  profile: ProfileState;
};

export type TextEntryState = {
  entryId: number;
  text: string;
  hidden: boolean;
};

export type ExperienceEntryState = {
  entryId: number;
  text: string;
  rating: number | null;
  recommendation: string;
  error: string;
  isChecking: boolean;
  isUpdating: boolean;
  hidden: boolean;
};

export type CompanyEntryState = {
  companyId: number;
  companyName: string;
  positionTitle: string;
  positionSummary: string;
  fromDate: string;
  toDate: string;
  isCollapsed: boolean;
  hidden: boolean;
  experiences: ExperienceEntryState[];
};

export type EducationEntryState = {
  educationId: number;
  name: string;
  title: string;
  fromDate: string;
  toDate: string;
  isCollapsed: boolean;
  hidden: boolean;
};

let currentPositionState: PositionState = {
  company: "",
  positionTitle: "",
  positionResponsibilities: "",
  summaryEntries: [],
  skillsEntries: [],
  companyEntries: [],
  educationEntries: [],
  profile: {
    name: "",
    email: "",
    linkedIn: "",
    phone: "",
  },
};

export function setPositionState(next: PositionState) {
  currentPositionState = next;
}

export function getPositionState(): PositionState {
  return currentPositionState;
}

export type SerializedCompanyEntryState = {
  companyName?: string;
  positionTitle?: string;
  positionSummary?: string;
  fromDate?: string;
  toDate?: string;
  experiences?: Array<string | { text?: string }>;
};

export type SerializedEducationEntryState = {
  name?: string;
  title?: string;
  fromDate?: string;
  toDate?: string;
};

export type SerializedProfileState = {
  name?: string;
  email?: string;
  linkedIn?: string;
  phone?: string;
};

export type SerializedPositionState = {
  company?: string;
  positionTitle?: string;
  positionResponsibilities?: string;
  summary?: string[];
  skills?: string[];
  companyEntries?: SerializedCompanyEntryState[];
  educationEntries?: SerializedEducationEntryState[];
  profile?: SerializedProfileState;
  // Legacy fields kept for backward compatibility with existing files.
  profileName?: string;
  profileEmail?: string;
  profileLinkedIn?: string;
  profilePhone?: string;
};

export function serializePositionState(state: PositionState): SerializedPositionState {
  return {
    company: state.company,
    positionTitle: state.positionTitle,
    positionResponsibilities: state.positionResponsibilities,
    summary: state.summaryEntries
      .filter((entry) => !entry.hidden)
      .map((entry) => entry.text),
    skills: state.skillsEntries
      .filter((entry) => !entry.hidden)
      .map((entry) => entry.text),
    profile: {
      name: state.profile.name,
      email: state.profile.email,
      linkedIn: state.profile.linkedIn,
      phone: state.profile.phone,
    },
    educationEntries: state.educationEntries
      .filter((education) => !education.hidden)
      .map((education) => ({
        name: education.name,
        title: education.title,
        fromDate: education.fromDate,
        toDate: education.toDate,
      })),
    companyEntries: state.companyEntries
      .filter((company) => !company.hidden)
      .map((company) => ({
      companyName: company.companyName,
      positionTitle: company.positionTitle,
      positionSummary: company.positionSummary,
      fromDate: company.fromDate,
      toDate: company.toDate,
      experiences: company.experiences.map((exp): string => exp.text),
      })),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSerializedPositionState(value: unknown): value is SerializedPositionState {
  if (!isObject(value)) {
    return false;
  }

  const profile = value.profile;

  if (
    typeof profile !== "undefined" &&
    (!isObject(profile) ||
      (typeof profile.name !== "undefined" && typeof profile.name !== "string") ||
      (typeof profile.email !== "undefined" && typeof profile.email !== "string") ||
      (typeof profile.linkedIn !== "undefined" && typeof profile.linkedIn !== "string") ||
      (typeof profile.phone !== "undefined" && typeof profile.phone !== "string"))
  ) {
    return false;
  }

  if (
    (typeof value.company !== "undefined" && typeof value.company !== "string") ||
    (typeof value.positionTitle !== "undefined" &&
      typeof value.positionTitle !== "string") ||
    (typeof value.positionResponsibilities !== "undefined" &&
      typeof value.positionResponsibilities !== "string") ||
    (typeof value.skills !== "undefined" && !Array.isArray(value.skills)) ||
    (typeof value.profileName !== "undefined" && typeof value.profileName !== "string") ||
    (typeof value.profileEmail !== "undefined" && typeof value.profileEmail !== "string") ||
    (typeof value.profileLinkedIn !== "undefined" && typeof value.profileLinkedIn !== "string") ||
    (typeof value.profilePhone !== "undefined" && typeof value.profilePhone !== "string") ||
    (typeof value.educationEntries !== "undefined" && !Array.isArray(value.educationEntries)) ||
    (typeof value.companyEntries !== "undefined" &&
      !Array.isArray(value.companyEntries))
  ) {
    return false;
  }

  if (
    typeof value.summary !== "undefined" &&
    (!Array.isArray(value.summary) || !value.summary.every((s) => typeof s === "string"))
  ) {
    return false;
  }

  if (
    typeof value.skills !== "undefined" &&
    (!Array.isArray(value.skills) || !value.skills.every((s) => typeof s === "string"))
  ) {
    return false;
  }

  const companyEntries = value.companyEntries ?? [];
  const educationEntries = value.educationEntries ?? [];

  const hasValidEducationEntries = educationEntries.every((education) => {
    if (!isObject(education)) {
      return false;
    }

    return (
      (typeof education.name === "undefined" || typeof education.name === "string") &&
      (typeof education.title === "undefined" || typeof education.title === "string") &&
      (typeof education.fromDate === "undefined" || typeof education.fromDate === "string") &&
      (typeof education.toDate === "undefined" || typeof education.toDate === "string")
    );
  });

  if (!hasValidEducationEntries) {
    return false;
  }

  return companyEntries.every((company) => {
    if (!isObject(company)) {
      return false;
    }

    if (
      (typeof company.companyName !== "undefined" &&
        typeof company.companyName !== "string") ||
      (typeof company.positionTitle !== "undefined" &&
        typeof company.positionTitle !== "string") ||
      (typeof company.positionSummary !== "undefined" &&
        typeof company.positionSummary !== "string") ||
      (typeof company.fromDate !== "undefined" &&
        typeof company.fromDate !== "string") ||
      (typeof company.toDate !== "undefined" && typeof company.toDate !== "string") ||
      (typeof company.experiences !== "undefined" &&
        !Array.isArray(company.experiences))
    ) {
      return false;
    }

    const experiences = company.experiences ?? [];
    return experiences.every((experience) => {
      if (typeof experience === "string") {
        return true;
      }

      return isObject(experience) &&
        (typeof experience.text === "undefined" ||
          typeof experience.text === "string");
    });
  });
}

export function deserializePositionState(serialized: SerializedPositionState): PositionState {
  const summary = (serialized.summary ?? []).filter(
    (item): item is string => typeof item === "string",
  );
  const skills = (serialized.skills ?? []).filter(
    (item): item is string => typeof item === "string",
  );
  const educationEntries = (serialized.educationEntries ?? []).map((education, index) => ({
    educationId: index + 1,
    name: education.name ?? "",
    title: education.title ?? "",
    fromDate: education.fromDate ?? "",
    toDate: education.toDate ?? "",
    isCollapsed: false,
    hidden: false,
  }));
  const companyEntries = (serialized.companyEntries ?? []).map((company, companyIndex) => {
    const experiences = (company.experiences ?? [])
      .map((experience): string => {
        if (typeof experience === "string") {
          return experience;
        }

        if (isObject(experience) && typeof experience.text === "string") {
          return experience.text;
        }

        return "";
      })
      .filter((text) => text.trim().length > 0);

    return {
      companyId: companyIndex + 1,
      companyName: company.companyName ?? "",
      positionTitle: company.positionTitle ?? "",
      positionSummary: company.positionSummary ?? "",
      fromDate: company.fromDate ?? "",
      toDate: company.toDate ?? "",
      isCollapsed: false,
      hidden: false,
      experiences: experiences.map((text, entryIndex) => ({
        entryId: entryIndex + 1,
        text,
        rating: null,
        recommendation: "",
        error: "",
        isChecking: false,
        isUpdating: false,
        hidden: false,
      })),
    };
  });

  return {
    company: serialized.company ?? "",
    positionTitle: serialized.positionTitle ?? "",
    positionResponsibilities: serialized.positionResponsibilities ?? "",
    summaryEntries: summary.map((text, index) => ({
      entryId: index + 1,
      text,
      hidden: false,
    })),
    skillsEntries: skills.map((text, index) => ({
      entryId: index + 1,
      text,
      hidden: false,
    })),
    companyEntries,
    educationEntries,
    profile: {
      name: serialized.profile?.name ?? serialized.profileName ?? "",
      email: serialized.profile?.email ?? serialized.profileEmail ?? "",
      linkedIn: serialized.profile?.linkedIn ?? serialized.profileLinkedIn ?? "",
      phone: serialized.profile?.phone ?? serialized.profilePhone ?? "",
    },
  };
}
