
export type CheckResult = {
  rawValue?: string;
  rating: number;
  reasoning: string;
  recommendation: string;
  recommendationRating: number;
};

export type ChangeResult = {
  rawValue?: string;
  recommendation: string;
  reasoning: string;
  recommendationRating: number;
};

export type CheckRequest = {
  text: string;
  targetRole: string;
  targetLevel: string;
  previousCompany: string;
  previousCompanyPositionTitle: string;
  previousCompanyExperiencesContext: string[];
};

export type ChangeRequest = CheckRequest & {
  originalRating: number;
  oldRewrite: string;
  oldRewriteRating: number;
};

export type ConciseCompanyEntry = {
  companyName: string;
  experience: string[];
}

export type SkillsRequest = {
  targetRole: string;
  targetLevel: string;
  listedSkills: string[];
  previousExperience: ConciseCompanyEntry[];
};

export type BuildRequest = {
  targetCompany: string;
  targetRole: string;
  targetJobRequirements: string;
  summary: string[];
  listedSkills: string[];
  previousExperience: ConciseCompanyEntry[];
};

export type BuildSummarySuggestion = {
  original: string;
  suggestion: string;
};

export type BuildSkillsSuggestion = {
  originalSkills: string[];
  suggestedSkills: string[];
};

export type BuildExperienceSuggestion = {
  companyName: string;
  originalEntries: string[];
  suggestedEntries: string[];
};

export type BuildFeedback = {
  matchRating: number;
  feedbackPoints: string[];
};

export type ApplicationContext = {
  company: string;
  title: string;
  description: string;
};

export type BuildResult = {
  summarySuggestions: BuildSummarySuggestion[];
  skillsSuggestions: BuildSkillsSuggestion;
  experienceSuggestions: BuildExperienceSuggestion[];
  feedback: BuildFeedback;
};

export type SkillsResult = {
  rating: number;
  suggestedSkills: string[];
  irrelevantSkills: string[];
  reasoning: string;
};

export type ExportProfile = {
  name: string;
  email: string;
  linkedin: string;
  phone: string;
  targetRole: string;
  targetLevel: string;
};

export type ExportCompanyEntry = {
  name: string;
  position: string;
  summary: string;
  from: string;
  to: string | null;
  experience: string[];
};

export type ExportEducationEntry = {
  name: string;
  title: string;
  from?: number;
  to?: number;
};

export type ExportOptions = {
  omitAllCapsSectionTitles?: boolean;
};

export type ExportRequest = {
  profile: ExportProfile;
  summary: string[];
  skills: string[];
  companyEntries: ExportCompanyEntry[];
  education: ExportEducationEntry[];
  options?: ExportOptions;
};

export type ExportPdfResult = {
  bytes: ArrayBuffer;
  fileName: string;
  contentType: string;
};
