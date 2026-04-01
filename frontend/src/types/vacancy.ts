export type VacancyStatus = "draft" | "published" | "archived";
export type EmploymentType = "full" | "part" | "project" | "internship";
export type WorkFormat = "office" | "remote" | "hybrid";
export type SortBy = "created_at" | "salary" | "title" | "company";
export type SortOrder = "asc" | "desc";

export interface Vacancy {
  id: number;
  title: string;
  company: string;
  salary: number;
  description?: string | null;
  status: VacancyStatus;
  employment_type?: EmploymentType | null;
  work_format?: WorkFormat | null;
  owner_id: number;
  created_at: string;
  updated_at?: string | null;
}

export interface VacancyFile {
  id: number;
  vacancy_id: number;
  owner_id: number;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface PaginatedVacancyResponse {
  items: Vacancy[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}