
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
  targetCompany: string;
  targetCompanyPositionTitle: string;
  targetCompanyPositionResponsibilities: string;
  previousCompany: string;
  previousCompanyPositionTitle: string;
  previousCompanyExperiencesContext: string[];
};

export type ChangeRequest = CheckRequest & {
  originalRating: number;
  oldRewrite: string;
  oldRewriteRating: number;
};

export type ExportProfile = {
  name: string;
  email: string;
  linkedin: string;
  phone: string;
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
  from: number;
  to: number;
};

export type ExportRequest = {
  profile: ExportProfile;
  summary: string[];
  companyEntries: ExportCompanyEntry[];
  education: ExportEducationEntry[];
};

export type ExportPdfResult = {
  bytes: ArrayBuffer;
  fileName: string;
  contentType: string;
};
